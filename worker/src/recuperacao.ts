// Recuperação de senha por código (sem e-mail). Fase futura: recuperação por link de e-mail = nova rota que emite
// um token de uso único e reaproveita `trocarSenhaConsumindoCodigo` (a troca/invalidação de sessões é a mesma).
import { codigoComFormatoValido } from '../../src/auth/codigoRecuperacao'
import { normalizarEmail, TAMANHO_MAXIMO_EMAIL, TAMANHO_MAXIMO_SENHA, validarSenhaNova } from '../../src/auth/validacao'
import { gerarCodigoRecuperacao, guardadoFicticio, hashCodigo, hashesIguais, protegerCodigo } from './codigo'
import { hashSenha, verificarSenha } from './cripto'
import { buscarCodigoPorEmail, buscarDadosSenha, definirCodigoRecuperacao, trocarSenhaConsumindoCodigo } from './dados'
import { erro, lerJson, resposta } from './http'
import {
  consumir,
  criarLimite,
  devolver,
  limpar,
  NOVO_CODIGO_JANELA_MS,
  NOVO_CODIGO_MAX_TENTATIVAS,
  RECUPERAR_IP_MAX_TENTATIVAS,
  RECUPERAR_JANELA_MS,
  RECUPERAR_MAX_TENTATIVAS,
} from './limite'
import { autenticar, MSG_MUITAS, MSG_NAO_AUTENTICADO, objeto } from './rotas'
import type { Contexto } from './rotas'

export const MSG_RECUPERACAO_INVALIDA = 'E-mail ou código de recuperação inválidos.'
export const MSG_SENHA_ATUAL_INCORRETA = 'Senha atual incorreta.'

/**
 * POST /api/senha/recuperar {email, codigo, novaSenha}
 * Ordem: formato do corpo e regras da senha nova (400, NÃO consomem tentativa nem tocam no código) -> limite
 * (incrementado ANTES de verificar) -> verificação do código com trabalho igual exista a conta ou não -> troca atômica.
 */
export async function recuperarSenha(c: Contexto): Promise<Response> {
  const corpo = await lerJson(c.request, c.extra)
  if (!corpo.ok) return corpo.resposta
  const o = objeto(corpo.json)
  if (!o || typeof o.email !== 'string' || typeof o.codigo !== 'string' || typeof o.novaSenha !== 'string') {
    return erro(400, 'dados_invalidos', 'Informe e-mail, código de recuperação e nova senha.', c.extra)
  }
  const vs = validarSenhaNova(o.novaSenha)
  if (!vs.valido) return erro(400, 'dados_invalidos', vs.mensagem, c.extra, { senha: vs.mensagem })

  const db = c.env.DB
  const email = normalizarEmail(o.email)
  const dentroDosLimites = email.length <= TAMANHO_MAXIMO_EMAIL && o.codigo.length <= 64
  const limite = await criarLimite('recuperar', `${email.slice(0, TAMANHO_MAXIMO_EMAIL)}|${c.ip}`, RECUPERAR_MAX_TENTATIVAS, RECUPERAR_JANELA_MS, c.agora)
  const limiteIp = await criarLimite('recuperar-ip', c.ip, RECUPERAR_IP_MAX_TENTATIVAS, RECUPERAR_JANELA_MS, c.agora)
  // Consome as duas tentativas ANTES de verificar o código (atômico sob concorrência).
  const okEmail = await consumir(db, limite, c.agora)
  const okIp = await consumir(db, limiteIp, c.agora)
  if (!okEmail || !okIp) return erro(429, 'muitas_tentativas', MSG_MUITAS, c.extra)

  const conta = dentroDosLimites ? await buscarCodigoPorEmail(db, email) : null
  const guardado = conta?.codigo_recuperacao_hash && conta.codigo_recuperacao_salt ? { hash: conta.codigo_recuperacao_hash, salt: conta.codigo_recuperacao_salt } : null
  // Mesmo trabalho em todos os casos: hash do que foi informado e comparação em tempo constante com o guardado ou o fictício.
  const alvo = guardado ?? (await guardadoFicticio())
  const informado = await hashCodigo(dentroDosLimites ? o.codigo : '', alvo.salt)
  const confere = hashesIguais(informado, alvo.hash)
  if (!conta || !guardado || !confere || !codigoComFormatoValido(o.codigo)) {
    return erro(401, 'recuperacao_invalida', MSG_RECUPERACAO_INVALIDA, c.extra)
  }

  const senha = await hashSenha(o.novaSenha)
  const novoCodigo = gerarCodigoRecuperacao()
  const trocou = await trocarSenhaConsumindoCodigo(db, conta.id, guardado.hash, senha, await protegerCodigo(novoCodigo), c.agora)
  // Perdeu a corrida contra outra recuperação com o mesmo código: o código já foi consumido.
  if (!trocou) return erro(401, 'recuperacao_invalida', MSG_RECUPERACAO_INVALIDA, c.extra)
  await limpar(db, limite)
  await devolver(db, limiteIp)
  return resposta(200, { ok: true, codigoRecuperacao: novoCodigo }, c.extra)
}

/** POST /api/conta/codigo-recuperacao {senhaAtual} (Bearer): gera outro código (o anterior deixa de valer). */
export async function novoCodigoRecuperacao(c: Contexto): Promise<Response> {
  const u = await autenticar(c)
  if (!u) return erro(401, 'nao_autenticado', MSG_NAO_AUTENTICADO, c.extra)
  const corpo = await lerJson(c.request, c.extra)
  if (!corpo.ok) return corpo.resposta
  const o = objeto(corpo.json)
  if (!o || typeof o.senhaAtual !== 'string' || o.senhaAtual === '') return erro(400, 'dados_invalidos', 'Informe sua senha atual.', c.extra)
  const db = c.env.DB
  const limite = await criarLimite('codigo-novo', u.id, NOVO_CODIGO_MAX_TENTATIVAS, NOVO_CODIGO_JANELA_MS, c.agora)
  if (!(await consumir(db, limite, c.agora))) return erro(429, 'muitas_tentativas', MSG_MUITAS, c.extra)
  const dados = await buscarDadosSenha(db, u.id)
  const confere =
    !!dados && o.senhaAtual.length <= TAMANHO_MAXIMO_SENHA && (await verificarSenha(o.senhaAtual, { hash: dados.senha_hash, salt: dados.senha_salt, iteracoes: dados.iteracoes }))
  // 403 (e não 401): o front trata 401 como sessão expirada e apagaria o token.
  if (!confere) return erro(403, 'senha_incorreta', MSG_SENHA_ATUAL_INCORRETA, c.extra)
  await limpar(db, limite)
  const codigo = gerarCodigoRecuperacao()
  await definirCodigoRecuperacao(db, u.id, await protegerCodigo(codigo), c.agora)
  return resposta(200, { codigoRecuperacao: codigo }, c.extra)
}
