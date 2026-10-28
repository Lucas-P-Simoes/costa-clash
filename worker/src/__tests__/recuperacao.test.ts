import { beforeEach, describe, expect, it } from 'vitest'
import { ALFABETO_CODIGO, codigoComFormatoValido, formatarCodigo, normalizarCodigo } from '../../../src/auth/codigoRecuperacao'
import { tratar } from '../app'
import { gerarCodigoRecuperacao, hashCodigo } from '../codigo'
import { MSG_LOGIN_INVALIDO } from '../rotas'
import { MSG_RECUPERACAO_INVALIDA, MSG_SENHA_ATUAL_INCORRETA } from '../recuperacao'
import { RECUPERAR_IP_MAX_TENTATIVAS, RECUPERAR_MAX_TENTATIVAS } from '../limite'
import type { Env } from '../tipos'
import { criarD1 } from './d1Falso'

const ORIGEM = 'https://lucas-p-simoes.github.io'
const FORMATO = /^[A-HJ-KM-NP-Z2-9]{5}(-[A-HJ-KM-NP-Z2-9]{5}){3}$/
let agora = 1_800_000_000_000
let d1: ReturnType<typeof criarD1>
let env: Env

beforeEach(() => {
  agora = 1_800_000_000_000
  d1 = criarD1()
  env = { DB: d1.db, ORIGENS_PERMITIDAS: `${ORIGEM},http://localhost:5173` }
})

interface Opc {
  metodo?: string
  corpo?: unknown
  token?: string
  ip?: string
  origem?: string | null
}

async function chamar(caminho: string, o: Opc = {}) {
  const headers: Record<string, string> = { 'CF-Connecting-IP': o.ip ?? '1.1.1.1' }
  if (o.corpo !== undefined) headers['Content-Type'] = 'application/json'
  if (o.token) headers.Authorization = `Bearer ${o.token}`
  if (o.origem !== null) headers.Origin = o.origem ?? ORIGEM
  const init: RequestInit = { method: o.metodo ?? (o.corpo !== undefined ? 'POST' : 'GET'), headers }
  if (o.corpo !== undefined) init.body = JSON.stringify(o.corpo)
  const r = await tratar(new Request(`https://api.exemplo.workers.dev${caminho}`, init), env, { agora: () => agora })
  const texto = await r.text()
  return { r, texto, json: texto ? (JSON.parse(texto) as any) : null } // eslint-disable-line
}

const cadastrar = (email = 'jogador@exemplo.com', senha = 'senha-forte-1', ip?: string) => chamar('/api/cadastro', { corpo: { email, senha }, ip })
const login = (email: string, senha: string, ip?: string) => chamar('/api/login', { corpo: { email, senha }, ip })
const recuperar = (email: string, codigo: string, novaSenha = 'nova-senha-2', ip?: string) => chamar('/api/senha/recuperar', { corpo: { email, codigo, novaSenha }, ip })
const linhaUsuario = (email = 'jogador@exemplo.com') =>
  d1.sqlite.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) as { codigo_recuperacao_hash: string | null; codigo_recuperacao_salt: string | null; senha_hash: string; senha_salt: string } | undefined

describe('geração do código', () => {
  it('formato XXXXX-XXXXX-XXXXX-XXXXX com alfabeto sem 0/O/1/I/L', () => {
    for (let i = 0; i < 300; i++) {
      const c = gerarCodigoRecuperacao()
      expect(c).toMatch(FORMATO)
      expect(c).not.toMatch(/[01OIL]/)
      expect(codigoComFormatoValido(c)).toBe(true)
    }
    expect(ALFABETO_CODIGO).toHaveLength(31)
    expect(ALFABETO_CODIGO).not.toMatch(/[01OIL]/)
  })

  it('sem repetição em 2000 códigos e todos os símbolos do alfabeto aparecem (sem viés grosseiro)', () => {
    const vistos = new Set<string>()
    const freq = new Map<string, number>()
    for (let i = 0; i < 2000; i++) {
      const c = gerarCodigoRecuperacao()
      vistos.add(c)
      for (const ch of c.replaceAll('-', '')) freq.set(ch, (freq.get(ch) ?? 0) + 1)
    }
    expect(vistos.size).toBe(2000)
    expect(freq.size).toBe(31)
    // 40000 símbolos / 31 ~ 1290 por símbolo; tolerância larga (+-25%) só pega viés grosseiro.
    for (const n of freq.values()) expect(n).toBeGreaterThan(970)
    for (const n of freq.values()) expect(n).toBeLessThan(1610)
  })

  it('normalização: minúsculas, hífens, espaços e traços tipográficos', () => {
    const c = gerarCodigoRecuperacao()
    const bruto = c.toLowerCase()
    expect(normalizarCodigo(bruto)).toBe(c.replaceAll('-', ''))
    expect(normalizarCodigo(`  ${c.replaceAll('-', ' – ')}  `)).toBe(c.replaceAll('-', ''))
    expect(formatarCodigo(c.replaceAll('-', '').toLowerCase())).toBe(c)
    expect(codigoComFormatoValido('ABCDE-FGHJK-MNPQR-STUV')).toBe(false)
    expect(codigoComFormatoValido('ABCDE-FGHJK-MNPQR-STUV0')).toBe(false)
  })
})

describe('cadastro e /me', () => {
  it('cadastro devolve o código uma vez; /me e login informam só temCodigoRecuperacao', async () => {
    const { r, json } = await cadastrar()
    expect(r.status).toBe(201)
    expect(json.codigoRecuperacao).toMatch(FORMATO)
    expect(json.usuario.temCodigoRecuperacao).toBe(true)
    const me = await chamar('/api/me', { token: json.token })
    expect(me.json.usuario.temCodigoRecuperacao).toBe(true)
    expect(me.texto).not.toContain(json.codigoRecuperacao)
    expect(me.json.codigoRecuperacao).toBeUndefined()
    const lg = await login('jogador@exemplo.com', 'senha-forte-1')
    expect(lg.json.codigoRecuperacao).toBeUndefined()
    expect(lg.texto).not.toContain(json.codigoRecuperacao)
    expect(lg.json.usuario.temCodigoRecuperacao).toBe(true)
  })

  it('no banco só existe o hash SHA-256 (nunca o código em claro), com salt por conta', async () => {
    const { json } = await cadastrar()
    const l = linhaUsuario()!
    expect(l.codigo_recuperacao_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(l.codigo_recuperacao_hash).toBe(await hashCodigo(json.codigoRecuperacao, l.codigo_recuperacao_salt!))
    const tudo = JSON.stringify(d1.sqlite.prepare('SELECT * FROM usuarios').all())
    expect(tudo).not.toContain(json.codigoRecuperacao)
    expect(tudo).not.toContain(json.codigoRecuperacao.replaceAll('-', ''))
    const outro = await cadastrar('outro@exemplo.com')
    expect(outro.json.codigoRecuperacao).not.toBe(json.codigoRecuperacao)
    expect(linhaUsuario('outro@exemplo.com')!.codigo_recuperacao_salt).not.toBe(l.codigo_recuperacao_salt)
  })

  it('conta antiga (sem código) aparece como temCodigoRecuperacao=false', async () => {
    const { json } = await cadastrar()
    d1.sqlite.exec('UPDATE usuarios SET codigo_recuperacao_hash = NULL, codigo_recuperacao_salt = NULL, codigo_recuperacao_criado_em = NULL')
    expect((await chamar('/api/me', { token: json.token })).json.usuario.temCodigoRecuperacao).toBe(false)
  })
})

describe('POST /api/senha/recuperar', () => {
  let codigo: string
  let tokenAntigo: string
  beforeEach(async () => {
    const { json } = await cadastrar()
    codigo = json.codigoRecuperacao
    tokenAntigo = json.token
  })

  it('sucesso: senha nova funciona, a antiga não, sessões antigas morrem, código antigo é recusado e o novo funciona', async () => {
    const outraSessao = (await login('jogador@exemplo.com', 'senha-forte-1')).json.token
    const { r, json, texto } = await recuperar('Jogador@Exemplo.com', codigo)
    expect(r.status).toBe(200)
    expect(r.headers.get('Cache-Control')).toBe('no-store')
    expect(json.codigoRecuperacao).toMatch(FORMATO)
    expect(json.codigoRecuperacao).not.toBe(codigo)
    expect(texto).not.toMatch(/token|senha_hash|salt/)
    expect((await login('jogador@exemplo.com', 'nova-senha-2')).r.status).toBe(200)
    expect((await login('jogador@exemplo.com', 'senha-forte-1')).r.status).toBe(401)
    for (const t of [tokenAntigo, outraSessao]) expect((await chamar('/api/me', { token: t })).r.status).toBe(401)
    expect(d1.sqlite.prepare('SELECT COUNT(*) AS n FROM sessoes WHERE usuario_id = (SELECT id FROM usuarios)').get()).toMatchObject({ n: 1 }) // só o login acima
    // código antigo consumido
    const velho = await recuperar('jogador@exemplo.com', codigo, 'outra-senha-3')
    expect(velho.r.status).toBe(401)
    expect(velho.json.erro.mensagem).toBe(MSG_RECUPERACAO_INVALIDA)
    // código novo vale
    const novo = await recuperar('jogador@exemplo.com', json.codigoRecuperacao, 'outra-senha-3')
    expect(novo.r.status).toBe(200)
    expect((await login('jogador@exemplo.com', 'outra-senha-3')).r.status).toBe(200)
  })

  it('o hash no banco muda para o do novo código e nada fica em claro', async () => {
    const antes = linhaUsuario()!
    const { json } = await recuperar('jogador@exemplo.com', codigo)
    const depois = linhaUsuario()!
    expect(depois.codigo_recuperacao_hash).not.toBe(antes.codigo_recuperacao_hash)
    expect(depois.codigo_recuperacao_hash).toBe(await hashCodigo(json.codigoRecuperacao, depois.codigo_recuperacao_salt!))
    expect(depois.senha_hash).not.toBe(antes.senha_hash)
    expect(depois.senha_salt).not.toBe(antes.senha_salt)
    expect(JSON.stringify(d1.sqlite.prepare('SELECT * FROM usuarios').all())).not.toContain(json.codigoRecuperacao)
  })

  it('aceita o código em minúsculas, sem hífens, com espaços e com traços tipográficos', async () => {
    const variacoes = [
      (c: string) => c.toLowerCase(),
      (c: string) => c.replaceAll('-', ''),
      (c: string) => ` ${c.replaceAll('-', ' ')} `,
      (c: string) => c.replaceAll('-', '–'),
    ]
    let atual = codigo
    for (const [i, v] of variacoes.entries()) {
      const r = await recuperar('jogador@exemplo.com', v(atual), `senha-nova-${i}-x`)
      expect(r.r.status, `variação ${i}`).toBe(200)
      atual = r.json.codigoRecuperacao
    }
  })

  it('e-mail inexistente, código errado, conta sem código e entradas absurdas: respostas IDÊNTICAS (status e corpo)', async () => {
    await cadastrar('semcodigo@exemplo.com')
    d1.sqlite.exec("UPDATE usuarios SET codigo_recuperacao_hash = NULL, codigo_recuperacao_salt = NULL WHERE email = 'semcodigo@exemplo.com'")
    const errado = gerarCodigoRecuperacao()
    const casos = [
      await recuperar('naoexiste@exemplo.com', codigo),
      await recuperar('jogador@exemplo.com', errado),
      await recuperar('semcodigo@exemplo.com', codigo),
      await recuperar('jogador@exemplo.com', 'ABC'),
      await recuperar('x'.repeat(300) + '@b.com', codigo),
      await recuperar('jogador@exemplo.com', 'x'.repeat(200)),
      await recuperar('naoexiste@exemplo.com', 'AAAAAAAAAAAAAAAAAAAA'),
    ]
    for (const c of casos) expect(c.r.status).toBe(401)
    expect(new Set(casos.map((c) => c.texto)).size).toBe(1)
    expect(casos[0]!.json.erro.mensagem).toBe(MSG_RECUPERACAO_INVALIDA)
    // a senha da conta real não mudou
    expect((await login('jogador@exemplo.com', 'senha-forte-1')).r.status).toBe(200)
  })

  it('senha nova inválida: 400, NÃO consome o código nem a tentativa; o mesmo código ainda funciona depois', async () => {
    for (const novaSenha of ['curta', '        ', 'x'.repeat(129)]) {
      const r = await recuperar('jogador@exemplo.com', codigo, novaSenha)
      expect(r.r.status).toBe(400)
      expect(r.json.erro.campos.senha).toBeTruthy()
    }
    for (let i = 0; i < RECUPERAR_MAX_TENTATIVAS + 3; i++) expect((await recuperar('jogador@exemplo.com', codigo, 'curta')).r.status).toBe(400)
    expect(d1.sqlite.prepare("SELECT COUNT(*) AS n FROM tentativas_login").get()).toMatchObject({ n: 1 }) // só o contador do cadastro
    expect((await recuperar('jogador@exemplo.com', codigo)).r.status).toBe(200)
  })

  it('corpo inválido: 400/415 e nenhuma alteração', async () => {
    expect((await chamar('/api/senha/recuperar', { corpo: { email: 'a@b.com' } })).r.status).toBe(400)
    expect((await chamar('/api/senha/recuperar', { corpo: ['x'] })).r.status).toBe(400)
    expect((await chamar('/api/senha/recuperar', { corpo: { email: 1, codigo: 2, novaSenha: 3 } })).r.status).toBe(400)
  })

  it('limite por e-mail+IP: depois de 5 tentativas erradas, 429 mesmo com o código certo; outro IP e a janela seguinte liberam', async () => {
    const errado = gerarCodigoRecuperacao()
    for (let i = 0; i < RECUPERAR_MAX_TENTATIVAS; i++) expect((await recuperar('jogador@exemplo.com', errado)).r.status).toBe(401)
    expect((await recuperar('jogador@exemplo.com', codigo)).r.status).toBe(429)
    expect((await recuperar('jogador@exemplo.com', codigo, undefined, '2.2.2.2')).r.status).toBe(200)
    agora += 16 * 60 * 1000
    expect((await recuperar('jogador@exemplo.com', gerarCodigoRecuperacao(), undefined, '2.2.2.2')).r.status).toBe(401)
  })

  it('concorrência: 30 tentativas paralelas erradas -> só 5 verificadas (401) e 25 com 429', async () => {
    const rs = await Promise.all(Array.from({ length: 30 }, () => recuperar('jogador@exemplo.com', gerarCodigoRecuperacao())))
    expect(rs.filter((x) => x.r.status === 401)).toHaveLength(RECUPERAR_MAX_TENTATIVAS)
    expect(rs.filter((x) => x.r.status === 429)).toHaveLength(30 - RECUPERAR_MAX_TENTATIVAS)
  }, 30_000)

  it('concorrência: o mesmo código correto usado 4x em paralelo troca a senha UMA vez só', async () => {
    const rs = await Promise.all(Array.from({ length: 4 }, (_, i) => recuperar('jogador@exemplo.com', codigo, `senha-paralela-${i}`)))
    expect(rs.filter((x) => x.r.status === 200)).toHaveLength(1)
    expect(rs.filter((x) => x.r.status === 401)).toHaveLength(3)
    const vencedora = rs.findIndex((x) => x.r.status === 200)
    expect((await login('jogador@exemplo.com', `senha-paralela-${vencedora}`)).r.status).toBe(200)
  }, 30_000)

  it('limite por IP contra varredura de e-mails', async () => {
    const rs = await Promise.all(
      Array.from({ length: RECUPERAR_IP_MAX_TENTATIVAS + 5 }, (_, i) => recuperar(`v${i}@b.com`, gerarCodigoRecuperacao(), undefined, '6.6.6.6')),
    )
    expect(rs.filter((x) => x.r.status === 401)).toHaveLength(RECUPERAR_IP_MAX_TENTATIVAS)
    expect(rs.filter((x) => x.r.status === 429)).toHaveLength(5)
    expect((await recuperar('v1@b.com', gerarCodigoRecuperacao(), undefined, '5.5.5.5')).r.status).toBe(401)
  }, 60_000)

  it('sucesso zera o contador de tentativas do e-mail', async () => {
    const errado = gerarCodigoRecuperacao()
    for (let i = 0; i < RECUPERAR_MAX_TENTATIVAS - 1; i++) await recuperar('jogador@exemplo.com', errado)
    const ok = await recuperar('jogador@exemplo.com', codigo)
    expect(ok.r.status).toBe(200)
    for (let i = 0; i < RECUPERAR_MAX_TENTATIVAS; i++) expect((await recuperar('jogador@exemplo.com', errado)).r.status).toBe(401)
  })

  it('CORS: OPTIONS permitido, origem ruim 403, só POST', async () => {
    const op = await chamar('/api/senha/recuperar', { metodo: 'OPTIONS' })
    expect(op.r.status).toBe(204)
    expect(op.r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGEM)
    expect((await chamar('/api/senha/recuperar', { metodo: 'OPTIONS', origem: 'https://malicioso.example' })).r.status).toBe(403)
    const get = await chamar('/api/senha/recuperar', { metodo: 'GET' })
    expect(get.r.status).toBe(405)
    expect(get.r.headers.get('Allow')).toBe('POST')
  })

  it('o código nunca aparece em respostas de erro', async () => {
    const r = await recuperar('jogador@exemplo.com', codigo, 'curta')
    expect(r.texto).not.toContain(codigo)
    const r2 = await recuperar('naoexiste@x.com', codigo)
    expect(r2.texto).not.toContain(codigo)
    expect(r2.r.headers.get('Cache-Control')).toBe('no-store')
  })
})

describe('POST /api/conta/codigo-recuperacao', () => {
  let token: string
  let codigo: string
  beforeEach(async () => {
    const { json } = await cadastrar()
    token = json.token
    codigo = json.codigoRecuperacao
  })
  const gerar = (senhaAtual: unknown, t = token) => chamar('/api/conta/codigo-recuperacao', { corpo: { senhaAtual }, token: t })

  it('exige autenticação', async () => {
    expect((await chamar('/api/conta/codigo-recuperacao', { corpo: { senhaAtual: 'senha-forte-1' } })).r.status).toBe(401)
    expect((await gerar('senha-forte-1', 'a'.repeat(43))).r.status).toBe(401)
  })

  it('exige a senha atual: errada/ausente não gera nada e o código antigo continua valendo', async () => {
    const errada = await gerar('senha-errada-1')
    expect(errada.r.status).toBe(403)
    expect(errada.json.erro.mensagem).toBe(MSG_SENHA_ATUAL_INCORRETA)
    expect((await gerar('')).r.status).toBe(400)
    expect((await gerar(42)).r.status).toBe(400)
    expect((await chamar('/api/conta/codigo-recuperacao', { corpo: {}, token })).r.status).toBe(400)
    expect((await chamar('/api/me', { token })).r.status).toBe(200) // sessão intacta (403 não é 401)
    expect((await recuperar('jogador@exemplo.com', codigo)).r.status).toBe(200)
  })

  it('com a senha certa devolve um código novo (uma vez), invalida o anterior e mantém as sessões', async () => {
    const { r, json } = await gerar('senha-forte-1')
    expect(r.status).toBe(200)
    expect(json.codigoRecuperacao).toMatch(FORMATO)
    expect(json.codigoRecuperacao).not.toBe(codigo)
    expect((await chamar('/api/me', { token })).r.status).toBe(200)
    expect((await recuperar('jogador@exemplo.com', codigo)).r.status).toBe(401)
    expect((await recuperar('jogador@exemplo.com', json.codigoRecuperacao)).r.status).toBe(200)
  })

  it('conta antiga sem código ganha um', async () => {
    d1.sqlite.exec('UPDATE usuarios SET codigo_recuperacao_hash = NULL, codigo_recuperacao_salt = NULL, codigo_recuperacao_criado_em = NULL')
    expect((await chamar('/api/me', { token })).json.usuario.temCodigoRecuperacao).toBe(false)
    const { json } = await gerar('senha-forte-1')
    expect((await chamar('/api/me', { token })).json.usuario.temCodigoRecuperacao).toBe(true)
    expect((await recuperar('jogador@exemplo.com', json.codigoRecuperacao)).r.status).toBe(200)
  })

  it('limite por usuário: após 5 senhas erradas, 429 mesmo com a senha certa', async () => {
    for (let i = 0; i < 5; i++) expect((await gerar('errada-errada')).r.status).toBe(403)
    expect((await gerar('senha-forte-1')).r.status).toBe(429)
  })

  it('CORS e método', async () => {
    expect((await chamar('/api/conta/codigo-recuperacao', { metodo: 'OPTIONS' })).r.status).toBe(204)
    expect((await chamar('/api/conta/codigo-recuperacao', { metodo: 'GET', token })).r.status).toBe(405)
    expect((await chamar('/api/conta/codigo-recuperacao', { metodo: 'OPTIONS', origem: 'https://malicioso.example' })).r.status).toBe(403)
  })

  it('o login genérico continua com a mesma mensagem (regressão)', async () => {
    expect((await login('nao@existe.com', 'senha-forte-1')).json.erro.mensagem).toBe(MSG_LOGIN_INVALIDO)
  })
})
