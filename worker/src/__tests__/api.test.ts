import { beforeEach, describe, expect, it } from 'vitest'
import { tratar } from '../app'
import { BARALHO_INICIAL } from '../inicial'
import { DURACAO_SESSAO_MS } from '../dados'
import { LOGIN_IP_MAX_TENTATIVAS, LOGIN_MAX_TENTATIVAS as LOGIN_MAX_FALHAS } from '../limite'
import { MSG_LOGIN_INVALIDO } from '../rotas'
import type { Env } from '../tipos'
import { criarD1 } from './d1Falso'

const ORIGEM = 'https://lucas-p-simoes.github.io'
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
  bruto?: string
  token?: string
  origem?: string | null
  ip?: string
  tipo?: string | null
}

async function chamar(caminho: string, o: Opc = {}) {
  const headers: Record<string, string> = { 'CF-Connecting-IP': o.ip ?? '1.1.1.1' }
  if (o.tipo !== null && (o.corpo !== undefined || o.bruto !== undefined)) headers['Content-Type'] = o.tipo ?? 'application/json'
  if (o.token) headers.Authorization = `Bearer ${o.token}`
  if (o.origem !== null) headers.Origin = o.origem ?? ORIGEM
  const init: RequestInit = { method: o.metodo ?? (o.corpo !== undefined || o.bruto !== undefined ? 'POST' : 'GET'), headers }
  if (o.bruto !== undefined) init.body = o.bruto
  else if (o.corpo !== undefined) init.body = JSON.stringify(o.corpo)
  const r = await tratar(new Request(`https://api.exemplo.workers.dev${caminho}`, init), env, { agora: () => agora })
  const texto = await r.text()
  return { r, texto, json: texto ? (JSON.parse(texto) as any) : null } // eslint-disable-line
}

const cadastrar = (email = 'Jogador@Exemplo.com', senha = 'senha-forte-1', ip?: string) => chamar('/api/cadastro', { corpo: { email, senha }, ip })

describe('cadastro', () => {
  it('cria conta, normaliza o e-mail, entrega coleção e baralho iniciais e uma sessão', async () => {
    const { r, json } = await cadastrar('  Jogador@Exemplo.COM ')
    expect(r.status).toBe(201)
    expect(json.usuario.email).toBe('jogador@exemplo.com')
    expect(json.usuario.baralho).toEqual([...BARALHO_INICIAL])
    expect(json.usuario.colecao.reduce((s: number, i: { quantidade: number }) => s + i.quantidade, 0)).toBe(40)
    expect(json.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const me = await chamar('/api/me', { token: json.token })
    expect(me.r.status).toBe(200)
    expect(me.json.usuario.id).toBe(json.usuario.id)
  })

  it('e-mail repetido (qualquer caixa) dá 409 sem vazar mais nada', async () => {
    await cadastrar('a@b.com')
    const { r, json } = await cadastrar('A@B.com')
    expect(r.status).toBe(409)
    expect(json.erro.codigo).toBe('email_em_uso')
    expect(Object.keys(json.erro).sort()).toEqual(['codigo', 'mensagem'])
  })

  it.each([
    [{ email: 'invalido', senha: 'senha-forte-1' }, 'email'],
    [{ email: 'a@b.com', senha: 'curta' }, 'senha'],
    [{ email: 'a@b.com', senha: 'x'.repeat(129) }, 'senha'],
    [{ email: 'a@b.com', senha: '         ' }, 'senha'],
    [{ email: `${'a'.repeat(250)}@b.com`, senha: 'senha-forte-1' }, 'email'],
  ])('rejeita dados inválidos %#', async (corpo, campo) => {
    const { r, json } = await chamar('/api/cadastro', { corpo })
    expect(r.status).toBe(400)
    expect(json.erro.campos[campo]).toBeTruthy()
  })

  it('rejeita corpo não objeto, JSON quebrado, content-type errado e corpo grande', async () => {
    expect((await chamar('/api/cadastro', { corpo: ['a'] })).r.status).toBe(400)
    expect((await chamar('/api/cadastro', { bruto: '{nao json' })).r.status).toBe(400)
    expect((await chamar('/api/cadastro', { corpo: { email: 'a@b.com', senha: 'senha-forte-1' }, tipo: 'text/plain' })).r.status).toBe(415)
    const grande = await chamar('/api/cadastro', { bruto: JSON.stringify({ email: 'a@b.com', senha: 'x'.repeat(20_000) }) })
    expect(grande.r.status).toBe(413)
  })

  it('limita criações de conta por IP', async () => {
    for (let i = 0; i < 10; i++) expect((await cadastrar(`u${i}@b.com`, 'senha-forte-1', '9.9.9.9')).r.status).toBe(201)
    expect((await cadastrar('u11@b.com', 'senha-forte-1', '9.9.9.9')).r.status).toBe(429)
    expect((await cadastrar('u11@b.com', 'senha-forte-1', '8.8.8.8')).r.status).toBe(201)
  })
})

describe('login', () => {
  beforeEach(async () => {
    await cadastrar('jogador@exemplo.com', 'senha-forte-1')
  })

  it('entra com e-mail em qualquer caixa e devolve novo token + perfil', async () => {
    const { r, json } = await chamar('/api/login', { corpo: { email: ' JOGADOR@exemplo.com ', senha: 'senha-forte-1' } })
    expect(r.status).toBe(200)
    expect(json.usuario.email).toBe('jogador@exemplo.com')
    expect(json.usuario.baralho).toHaveLength(40)
    expect((await chamar('/api/me', { token: json.token })).r.status).toBe(200)
  })

  it('e-mail inexistente e senha errada dão exatamente a mesma resposta', async () => {
    const a = await chamar('/api/login', { corpo: { email: 'nao@existe.com', senha: 'senha-forte-1' } })
    const b = await chamar('/api/login', { corpo: { email: 'jogador@exemplo.com', senha: 'senha-errada-1' } })
    expect(a.r.status).toBe(401)
    expect(b.r.status).toBe(401)
    expect(a.texto).toBe(b.texto)
    expect(a.json.erro.mensagem).toBe(MSG_LOGIN_INVALIDO)
  })

  it('entradas absurdas também recebem a mesma resposta genérica', async () => {
    const a = await chamar('/api/login', { corpo: { email: 'x'.repeat(300), senha: 'y'.repeat(500) } })
    expect(a.r.status).toBe(401)
    expect(a.json.erro.mensagem).toBe(MSG_LOGIN_INVALIDO)
  })

  it('bloqueia após o limite de falhas (por e-mail+IP) com 429, mesmo com a senha certa', async () => {
    for (let i = 0; i < LOGIN_MAX_FALHAS; i++) {
      expect((await chamar('/api/login', { corpo: { email: 'jogador@exemplo.com', senha: 'errada-errada' } })).r.status).toBe(401)
    }
    const certa = { corpo: { email: 'jogador@exemplo.com', senha: 'senha-forte-1' } }
    expect((await chamar('/api/login', certa)).r.status).toBe(429)
    // outro IP não é afetado; janela seguinte libera
    expect((await chamar('/api/login', { ...certa, ip: '2.2.2.2' })).r.status).toBe(200)
    agora += 16 * 60 * 1000
    expect((await chamar('/api/login', certa)).r.status).toBe(200)
  })

  it('login com sucesso zera o contador de falhas', async () => {
    const errada = { corpo: { email: 'jogador@exemplo.com', senha: 'errada-errada' } }
    for (let i = 0; i < LOGIN_MAX_FALHAS - 1; i++) await chamar('/api/login', errada)
    expect((await chamar('/api/login', { corpo: { email: 'jogador@exemplo.com', senha: 'senha-forte-1' } })).r.status).toBe(200)
    for (let i = 0; i < LOGIN_MAX_FALHAS - 1; i++) expect((await chamar('/api/login', errada)).r.status).toBe(401)
  })
})

describe('limites sob concorrência e por IP', () => {
  it('30 logins paralelos errados: só 5 passam pelo hash (401) e os 25 demais levam 429', async () => {
    await cadastrar('jogador@exemplo.com', 'senha-forte-1')
    const rs = await Promise.all(Array.from({ length: 30 }, () => chamar('/api/login', { corpo: { email: 'jogador@exemplo.com', senha: 'errada-errada' } })))
    const cont = (s: number) => rs.filter((x) => x.r.status === s).length
    expect(cont(401)).toBe(LOGIN_MAX_FALHAS)
    expect(cont(429)).toBe(30 - LOGIN_MAX_FALHAS)
  }, 30_000)

  it('25 cadastros paralelos do mesmo IP: no máximo 10 criam conta', async () => {
    const rs = await Promise.all(Array.from({ length: 25 }, (_, i) => cadastrar('u' + i + '@b.com', 'senha-forte-1', '7.7.7.7')))
    expect(rs.filter((x) => x.r.status === 201)).toHaveLength(10)
    expect(rs.filter((x) => x.r.status === 429)).toHaveLength(15)
    expect(d1.sqlite.prepare('SELECT COUNT(*) AS n FROM usuarios').get()).toMatchObject({ n: 10 })
  }, 30_000)

  it('password spraying: limite por IP vale mesmo trocando de e-mail a cada tentativa', async () => {
    const rs = await Promise.all(Array.from({ length: LOGIN_IP_MAX_TENTATIVAS + 5 }, (_, i) => chamar('/api/login', { corpo: { email: 'v' + i + '@b.com', senha: 'errada-errada' }, ip: '6.6.6.6' })))
    expect(rs.filter((x) => x.r.status === 401)).toHaveLength(LOGIN_IP_MAX_TENTATIVAS)
    expect(rs.filter((x) => x.r.status === 429)).toHaveLength(5)
    expect((await chamar('/api/login', { corpo: { email: 'novo@b.com', senha: 'errada-errada' }, ip: '5.5.5.5' })).r.status).toBe(401)
  }, 60_000)

  it('login bem-sucedido devolve a tentativa do IP e zera a do e-mail', async () => {
    await cadastrar('jogador@exemplo.com', 'senha-forte-1')
    for (let i = 0; i < 3; i++) await chamar('/api/login', { corpo: { email: 'jogador@exemplo.com', senha: 'senha-forte-1' } })
    const linhas = d1.sqlite.prepare('SELECT contagem FROM tentativas_login').all() as Array<{ contagem: number }>
    expect(linhas.every((l) => l.contagem === 0 || l.contagem === 1)).toBe(true)
    expect(linhas.reduce((s, l) => s + l.contagem, 0)).toBeLessThanOrEqual(1) // só o cadastro
  })
})

describe('detalhes de protocolo e normalização', () => {
  it('Bearer sem diferenciar maiúsculas e barra final em /api/me/', async () => {
    const { json } = await cadastrar()
    for (const esquema of ['Bearer', 'bearer', 'BEARER']) {
      const r = await tratar(new Request('https://x.dev/api/me/', { headers: { Authorization: esquema + ' ' + json.token } }), env)
      expect(r.status).toBe(200)
    }
  })

  it('e-mail com compatibilidade Unicode (NFKC) cai na mesma conta; domínio não ASCII é recusado', async () => {
    await cadastrar('ana@exemplo.com')
    const igual = await cadastrar('ana@exemplo.com'.replace('a', 'ａ'))
    expect(igual.r.status).toBe(409)
    const idn = await chamar('/api/cadastro', { corpo: { email: 'ana@exemplo.com'.replace('exemplo', 'exêmplo'), senha: 'senha-forte-1' } })
    expect(idn.r.status).toBe(400)
  })
})

describe('sessão', () => {
  it('exige token válido; rejeita ausente, malformado, desconhecido', async () => {
    expect((await chamar('/api/me')).r.status).toBe(401)
    expect((await chamar('/api/me', { token: 'curto' })).r.status).toBe(401)
    expect((await chamar('/api/me', { token: 'a'.repeat(43) })).r.status).toBe(401)
  })

  it('o banco guarda só o hash SHA-256 do token, nunca o token nem a senha', async () => {
    const { json } = await cadastrar('a@b.com', 'senha-forte-1')
    const linhas = JSON.stringify(d1.sqlite.prepare('SELECT * FROM sessoes').all())
    expect(linhas).not.toContain(json.token)
    expect(d1.sqlite.prepare('SELECT token_hash FROM sessoes').get()).toMatchObject({ token_hash: expect.stringMatching(/^[0-9a-f]{64}$/) })
    expect(JSON.stringify(d1.sqlite.prepare('SELECT * FROM usuarios').all())).not.toContain('senha-forte-1')
  })

  it('expira após 30 dias', async () => {
    const { json } = await cadastrar()
    agora += DURACAO_SESSAO_MS - 1000
    expect((await chamar('/api/me', { token: json.token })).r.status).toBe(200)
    agora += 2000
    expect((await chamar('/api/me', { token: json.token })).r.status).toBe(401)
  })

  it('logout invalida o token e é idempotente', async () => {
    const { json } = await cadastrar()
    const a = await chamar('/api/logout', { metodo: 'POST', token: json.token })
    expect(a.r.status).toBe(204)
    expect((await chamar('/api/me', { token: json.token })).r.status).toBe(401)
    expect((await chamar('/api/logout', { metodo: 'POST', token: json.token })).r.status).toBe(204)
  })
})

describe('PUT /baralho', () => {
  let token: string
  beforeEach(async () => {
    token = (await cadastrar()).json.token
  })
  const put = (cartas: unknown, t?: string) => chamar('/api/baralho', { metodo: 'PUT', corpo: { cartas }, token: t ?? token })

  it('exige autenticação', async () => {
    expect((await put([...BARALHO_INICIAL], 'a'.repeat(43))).r.status).toBe(401)
  })

  it('salva um baralho válido (reordenado) e /me o devolve', async () => {
    const novo = [...BARALHO_INICIAL].reverse()
    const { r, json } = await put(novo)
    expect(r.status).toBe(200)
    expect(json.baralho).toEqual(novo)
    expect((await chamar('/api/me', { token })).json.usuario.baralho).toEqual(novo)
  })

  it('rejeita 39 cartas, ID desconhecido, 4 cópias e além da coleção, sem alterar o baralho salvo', async () => {
    const base = [...BARALHO_INICIAL]
    expect((await put(base.slice(1))).r.status).toBe(400)
    expect((await put([...base.slice(1), 'CC-999'])).json.erro.codigo).toBe('baralho_invalido')
    expect((await put([...base.slice(0, 36), 'CC-001', 'CC-001', 'CC-001', 'CC-001'])).r.status).toBe(400)
    expect((await put([...base.filter((i) => i !== 'CC-002'), 'CC-100'])).json.erro.mensagem).toMatch(/coleção/)
    expect((await put('texto')).r.status).toBe(400)
    expect((await chamar('/api/me', { token })).json.usuario.baralho).toEqual(base)
  })

  it('não existe endpoint para aumentar a coleção', async () => {
    for (const rota of ['/api/colecao', '/api/carta', '/api/recompensa']) {
      expect((await chamar(rota, { metodo: 'POST', corpo: { cartaId: 'CC-100' }, token })).r.status).toBe(404)
    }
    expect((await chamar('/api/me', { token })).json.usuario.colecao.find((i: { cartaId: string }) => i.cartaId === 'CC-100')).toBeUndefined()
  })
})

describe('CORS, cabeçalhos e vazamentos', () => {
  it('OPTIONS de origem permitida: 204 com cabeçalhos CORS', async () => {
    const { r } = await chamar('/api/login', { metodo: 'OPTIONS' })
    expect(r.status).toBe(204)
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(ORIGEM)
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    expect(r.headers.get('Vary')).toBe('Origin')
  })

  it('aceita localhost de desenvolvimento e recusa outras origens (inclusive OPTIONS)', async () => {
    expect((await chamar('/api/saude', { origem: 'http://localhost:5173' })).r.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    const ruim = await chamar('/api/saude', { origem: 'https://malicioso.example' })
    expect(ruim.r.status).toBe(403)
    expect(ruim.r.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect((await chamar('/api/login', { metodo: 'OPTIONS', origem: 'https://malicioso.example' })).r.status).toBe(403)
  })

  it('sem Origin (curl/servidor) funciona sem cabeçalhos CORS', async () => {
    const { r } = await chamar('/api/saude', { origem: null })
    expect(r.status).toBe(200)
    expect(r.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('respostas têm cabeçalhos seguros e no-store, inclusive nos erros', async () => {
    for (const { r } of [await chamar('/api/saude'), await chamar('/api/me'), await chamar('/api/nada')]) {
      expect(r.headers.get('Cache-Control')).toBe('no-store')
      expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(r.headers.get('Content-Security-Policy')).toContain("default-src 'none'")
    }
  })

  it('404 e 405 (com Allow)', async () => {
    expect((await chamar('/api/nada')).r.status).toBe(404)
    expect((await chamar('/api/constructor')).r.status).toBe(404)
    const m = await chamar('/api/login', { metodo: 'GET' })
    expect(m.r.status).toBe(405)
    expect(m.r.headers.get('Allow')).toBe('POST')
  })

  it('nenhuma resposta contém hash, salt ou senha', async () => {
    const respostas = [
      await cadastrar('a@b.com', 'senha-forte-1'),
      await chamar('/api/login', { corpo: { email: 'a@b.com', senha: 'senha-forte-1' } }),
      await chamar('/api/login', { corpo: { email: 'a@b.com', senha: 'errada-errada' } }),
    ]
    const usuario = d1.sqlite.prepare('SELECT senha_hash, senha_salt FROM usuarios').get() as { senha_hash: string; senha_salt: string }
    for (const { texto } of respostas) {
      expect(texto).not.toContain(usuario.senha_hash)
      expect(texto).not.toContain(usuario.senha_salt)
      expect(texto).not.toContain('senha-forte-1')
      expect(texto).not.toMatch(/senha_hash|iteracoes/)
    }
  })

  it('erro interno devolve mensagem genérica (sem detalhes)', async () => {
    env = { ...env, DB: { prepare: () => { throw new Error('segredo interno') } } as unknown as D1Database }
    const { r, texto } = await chamar('/api/me', { token: 'a'.repeat(43) })
    expect(r.status).toBe(500)
    expect(texto).not.toContain('segredo interno')
  })

  it('consulta com texto malicioso não quebra nem injeta SQL', async () => {
    await cadastrar('a@b.com', 'senha-forte-1')
    const r = await chamar('/api/login', { corpo: { email: "a@b.com' OR '1'='1", senha: 'x' } })
    expect(r.r.status).toBe(401)
    expect(d1.sqlite.prepare('SELECT COUNT(*) AS n FROM usuarios').get()).toMatchObject({ n: 1 })
  })
})
