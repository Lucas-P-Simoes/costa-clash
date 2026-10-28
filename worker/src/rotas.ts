import { IDS_CATALOGO } from './catalogo'
import { validarBaralho } from './baralho'
import { hashSenha, ITERACOES_PBKDF2, novoToken, sha256Hex, verificarSenha } from './cripto'
import type { SenhaHash } from './cripto'
import {
  buscarUsuarioPorEmail,
  buscarUsuarioPorSessao,
  carregarColecao,
  carregarPerfil,
  criarSessao,
  criarUsuarioCompleto,
  removerSessao,
  salvarBaralho,
} from './dados'
import { gerarCodigoRecuperacao, protegerCodigo } from './codigo'
import { erro, lerJson, resposta } from './http'
import { CADASTRO_JANELA_MS, CADASTRO_MAX, consumir, criarLimite, devolver, limpar, LOGIN_IP_MAX_TENTATIVAS, LOGIN_JANELA_MS, LOGIN_MAX_TENTATIVAS } from './limite'
import type { Env } from './tipos'
import { normalizarEmail, TAMANHO_MAXIMO_EMAIL, TAMANHO_MAXIMO_SENHA, validarEmail, validarSenhaNova } from '../../src/auth/validacao'

export interface Contexto {
  env: Env
  request: Request
  extra: Record<string, string>
  agora: number
  ip: string
}

export const MSG_LOGIN_INVALIDO = 'E-mail ou senha incorretos.'
export const MSG_MUITAS = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
export const MSG_NAO_AUTENTICADO = 'Sessão inválida ou expirada. Entre novamente.'
const MSG_EMAIL_EM_USO = 'Este e-mail já está cadastrado.'

export function objeto(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

// Hash fictício para igualar o tempo de resposta quando o e-mail não existe.
let falso: Promise<SenhaHash> | undefined
const hashFalso = () => (falso ??= hashSenha('senha-ficticia-para-igualar-tempo'))

function tokenDoHeader(request: Request): string | null {
  const m = /^Bearer ([A-Za-z0-9_-]{20,128})$/i.exec(request.headers.get('Authorization') ?? '')
  return m ? m[1]! : null
}

export async function autenticar(c: Contexto): Promise<{ id: string; email: string; tokenHash: string } | null> {
  const token = tokenDoHeader(c.request)
  if (!token) return null
  const tokenHash = await sha256Hex(token)
  const u = await buscarUsuarioPorSessao(c.env.DB, tokenHash, c.agora)
  return u ? { ...u, tokenHash } : null
}

export function saude(c: Contexto): Response {
  return resposta(200, { ok: true }, c.extra)
}

export async function cadastro(c: Contexto): Promise<Response> {
  const db = c.env.DB
  const limite = await criarLimite('cadastro', c.ip, CADASTRO_MAX, CADASTRO_JANELA_MS, c.agora)
  if (!(await consumir(db, limite, c.agora))) return erro(429, 'muitas_tentativas', MSG_MUITAS, c.extra)

  const corpo = await lerJson(c.request, c.extra)
  if (!corpo.ok) return corpo.resposta
  const o = objeto(corpo.json)
  if (!o || typeof o.email !== 'string' || typeof o.senha !== 'string') {
    return erro(400, 'dados_invalidos', 'Informe e-mail e senha.', c.extra)
  }
  const campos: Record<string, string> = {}
  const ve = validarEmail(o.email)
  const vs = validarSenhaNova(o.senha)
  if (!ve.valido) campos.email = ve.mensagem
  if (!vs.valido) campos.senha = vs.mensagem
  if (!ve.valido || !vs.valido) {
    return erro(400, 'dados_invalidos', campos.email ?? campos.senha ?? 'Dados inválidos.', c.extra, campos)
  }

  const email = normalizarEmail(o.email)
  // O hash é calculado antes de checar o e-mail: reduz a diferença de tempo entre e-mail novo e já usado.
  const { hash, salt, iteracoes } = await hashSenha(o.senha)
  if (await buscarUsuarioPorEmail(db, email)) return erro(409, 'email_em_uso', MSG_EMAIL_EM_USO, c.extra)
  const id = crypto.randomUUID()
  const token = novoToken()
  // Código de recuperação: gerado aqui, devolvido SÓ nesta resposta; no banco fica apenas o hash.
  const codigoRecuperacao = gerarCodigoRecuperacao()
  try {
    await criarUsuarioCompleto(db, { id, email, hash, salt, iteracoes }, await protegerCodigo(codigoRecuperacao), await sha256Hex(token), c.agora)
  } catch {
    // Corrida na restrição UNIQUE do e-mail.
    if (await buscarUsuarioPorEmail(db, email)) return erro(409, 'email_em_uso', MSG_EMAIL_EM_USO, c.extra)
    throw new Error('falha ao criar usuário')
  }
  return resposta(201, { token, usuario: await carregarPerfil(db, { id, email }), codigoRecuperacao }, c.extra)
}

export async function login(c: Contexto): Promise<Response> {
  const corpo = await lerJson(c.request, c.extra)
  if (!corpo.ok) return corpo.resposta
  const o = objeto(corpo.json)
  if (!o || typeof o.email !== 'string' || typeof o.senha !== 'string') {
    return erro(400, 'dados_invalidos', 'Informe e-mail e senha.', c.extra)
  }
  const db = c.env.DB
  const email = normalizarEmail(o.email)
  // Entradas fora dos limites nunca correspondem a uma conta; mesma resposta genérica.
  const dentroDosLimites = email.length <= TAMANHO_MAXIMO_EMAIL && o.senha.length <= TAMANHO_MAXIMO_SENHA
  const limite = await criarLimite('login', `${email.slice(0, TAMANHO_MAXIMO_EMAIL)}|${c.ip}`, LOGIN_MAX_TENTATIVAS, LOGIN_JANELA_MS, c.agora)
  const limiteIp = await criarLimite('login-ip', c.ip, LOGIN_IP_MAX_TENTATIVAS, LOGIN_JANELA_MS, c.agora)
  // Consome as duas tentativas ANTES de verificar a senha (atômico sob concorrência).
  const okEmail = await consumir(db, limite, c.agora)
  const okIp = await consumir(db, limiteIp, c.agora)
  if (!okEmail || !okIp) return erro(429, 'muitas_tentativas', MSG_MUITAS, c.extra)

  const usuario = dentroDosLimites ? await buscarUsuarioPorEmail(db, email) : null
  const guardado: SenhaHash = usuario
    ? { hash: usuario.senha_hash, salt: usuario.senha_salt, iteracoes: usuario.iteracoes }
    : { ...(await hashFalso()), iteracoes: ITERACOES_PBKDF2 }
  const confere = await verificarSenha(dentroDosLimites ? o.senha : '', guardado)
  if (!usuario || !confere) {
    return erro(401, 'credenciais_invalidas', MSG_LOGIN_INVALIDO, c.extra)
  }
  // Sucesso: zera o contador do e-mail e devolve a tentativa ao contador do IP.
  await limpar(db, limite)
  await devolver(db, limiteIp)
  const token = novoToken()
  await criarSessao(db, await sha256Hex(token), usuario.id, c.agora)
  return resposta(200, { token, usuario: await carregarPerfil(db, usuario) }, c.extra)
}

export async function logout(c: Contexto): Promise<Response> {
  const u = await autenticar(c)
  if (u) await removerSessao(c.env.DB, u.tokenHash)
  return resposta(204, null, c.extra)
}

export async function me(c: Contexto): Promise<Response> {
  const u = await autenticar(c)
  if (!u) return erro(401, 'nao_autenticado', MSG_NAO_AUTENTICADO, c.extra)
  return resposta(200, { usuario: await carregarPerfil(c.env.DB, u) }, c.extra)
}

export async function putBaralho(c: Contexto): Promise<Response> {
  const u = await autenticar(c)
  if (!u) return erro(401, 'nao_autenticado', MSG_NAO_AUTENTICADO, c.extra)
  const corpo = await lerJson(c.request, c.extra)
  if (!corpo.ok) return corpo.resposta
  const o = objeto(corpo.json)
  if (!o) return erro(400, 'dados_invalidos', 'Corpo inválido.', c.extra)
  const colecao = new Map((await carregarColecao(c.env.DB, u.id)).map((i) => [i.cartaId, i.quantidade]))
  const r = validarBaralho(o.cartas, colecao, IDS_CATALOGO)
  if (!r.ok) return erro(400, 'baralho_invalido', r.mensagem, c.extra)
  await salvarBaralho(c.env.DB, u.id, r.cartas, c.agora)
  return resposta(200, { baralho: r.cartas }, c.extra)
}
