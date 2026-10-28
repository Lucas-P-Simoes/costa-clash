import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_COPIAS_COLECAO, TABELAS_DROP } from '../../../src/data/dropsOponentes'
import { tratar } from '../app'
import { VALIDADE_DUELO_MS } from '../dados'
import { DURACAO_MINIMA_DUELO_MS } from '../drop'
import { DUELO_INICIO_MAX } from '../limite'
import type { Env } from '../tipos'
import { criarD1 } from './d1Falso'

const ORIGEM = 'https://lucas-p-simoes.github.io'
let agora = 1_800_000_000_000
let d1: ReturnType<typeof criarD1>
let env: Env

beforeEach(() => {
  agora = 1_800_000_000_000
  d1 = criarD1()
  env = { DB: d1.db, ORIGENS_PERMITIDAS: ORIGEM }
})

async function chamar(caminho: string, corpo?: unknown, token?: string) {
  const headers: Record<string, string> = { 'CF-Connecting-IP': '1.1.1.1', Origin: ORIGEM }
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const init: RequestInit = { method: corpo !== undefined ? 'POST' : 'GET', headers }
  if (corpo !== undefined) init.body = JSON.stringify(corpo)
  const r = await tratar(new Request(`https://api.exemplo.workers.dev${caminho}`, init), env, { agora: () => agora })
  const texto = await r.text()
  return { r, json: texto ? (JSON.parse(texto) as any) : null } // eslint-disable-line
}

async function conta(email = 'jogador@exemplo.com'): Promise<string> {
  const { json } = await chamar('/api/cadastro', { email, senha: 'senha-forte-1' })
  return json.token as string
}
const iniciar = (token: string, oponenteId = 'ressaca') => chamar('/api/duelo/iniciar', { oponenteId }, token)
const vitoria = (token: string, dueloId: unknown) => chamar('/api/duelo/vitoria', { dueloId }, token)
const totalColecao = () => (d1.sqlite.prepare('SELECT SUM(quantidade) AS s FROM colecao').get() as { s: number }).s

describe('POST /api/duelo/iniciar', () => {
  it('exige sessão e adversário existente', async () => {
    expect((await chamar('/api/duelo/iniciar', { oponenteId: 'ressaca' })).r.status).toBe(401)
    const token = await conta()
    expect((await iniciar(token, 'nao-existe')).r.status).toBe(400)
    expect((await iniciar(token, 'constructor')).r.status).toBe(400)
    const { r, json } = await iniciar(token)
    expect(r.status).toBe(201)
    expect(json.dueloId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('limita inícios por usuário na janela', async () => {
    const token = await conta()
    for (let i = 0; i < DUELO_INICIO_MAX; i++) expect((await iniciar(token)).r.status).toBe(201)
    expect((await iniciar(token)).r.status).toBe(429)
  })
})

describe('POST /api/duelo/vitoria', () => {
  it('sorteia uma carta da tabela do adversário, soma à coleção e devolve a coleção nova', async () => {
    const token = await conta()
    const { json: ini } = await iniciar(token, 'porto')
    agora += DURACAO_MINIMA_DUELO_MS
    const antes = totalColecao()
    const { r, json } = await vitoria(token, ini.dueloId)
    expect(r.status).toBe(200)
    expect(TABELAS_DROP.porto!.map(([id]) => id)).toContain(json.carta)
    expect(json.quantidade).toBeGreaterThanOrEqual(1)
    expect(json.colecao.find((i: { cartaId: string }) => i.cartaId === json.carta).quantidade).toBe(json.quantidade)
    const linha = d1.sqlite.prepare('SELECT quantidade FROM colecao WHERE carta_id = ?').get(json.carta) as { quantidade: number }
    expect(linha.quantidade).toBe(json.quantidade)
    expect(totalColecao()).toBe(antes + 1)
  })

  it('resgate é único por duelo (também em paralelo)', async () => {
    const token = await conta()
    const { json: ini } = await iniciar(token)
    agora += DURACAO_MINIMA_DUELO_MS
    const antes = totalColecao()
    const [a, b] = await Promise.all([vitoria(token, ini.dueloId), vitoria(token, ini.dueloId)])
    expect([a.r.status, b.r.status].sort()).toEqual([200, 409])
    expect(totalColecao()).toBe(antes + 1)
    expect((await vitoria(token, ini.dueloId)).json.erro.codigo).toBe('duelo_resgatado')
  })

  it('recusa duelo curto demais sem consumi-lo', async () => {
    const token = await conta()
    const { json: ini } = await iniciar(token)
    agora += DURACAO_MINIMA_DUELO_MS - 1
    const curto = await vitoria(token, ini.dueloId)
    expect(curto.r.status).toBe(409)
    expect(curto.json.erro.codigo).toBe('duelo_curto')
    agora += 1
    expect((await vitoria(token, ini.dueloId)).r.status).toBe(200)
  })

  it('não aceita duelo de outra conta, inexistente, malformado ou expirado', async () => {
    const dono = await conta('dono@exemplo.com')
    const outro = await conta('outro@exemplo.com')
    const { json: ini } = await iniciar(dono)
    agora += DURACAO_MINIMA_DUELO_MS
    expect((await vitoria(outro, ini.dueloId)).r.status).toBe(404)
    expect((await vitoria(dono, 'nao-existe')).r.status).toBe(404)
    expect((await chamar('/api/duelo/vitoria', { dueloId: ini.dueloId })).r.status).toBe(401)
    expect((await vitoria(dono, 5)).r.status).toBe(400)
    expect((await vitoria(dono, 'x'.repeat(65))).r.status).toBe(400)
    agora += VALIDADE_DUELO_MS
    expect((await vitoria(dono, ini.dueloId)).r.status).toBe(404)
  })

  it('com todas as cartas do adversário no teto não há drop, e o duelo é consumido', async () => {
    const token = await conta()
    const usuario = (d1.sqlite.prepare('SELECT id FROM usuarios').get() as { id: string }).id
    for (const [id] of TABELAS_DROP.coral!) {
      d1.sqlite
        .prepare('INSERT INTO colecao (usuario_id, carta_id, quantidade) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET quantidade = excluded.quantidade')
        .run(usuario, id, MAX_COPIAS_COLECAO)
    }
    const { json: ini } = await iniciar(token, 'coral')
    agora += DURACAO_MINIMA_DUELO_MS
    const antes = totalColecao()
    const { r, json } = await vitoria(token, ini.dueloId)
    expect(r.status).toBe(200)
    expect(json.carta).toBeNull()
    expect(totalColecao()).toBe(antes)
    expect((await vitoria(token, ini.dueloId)).r.status).toBe(409)
  })

  it('muitas vitórias acumulam na coleção sem passar do teto de cópias', async () => {
    const token = await conta()
    for (let i = 0; i < 50; i++) {
      const { json: ini } = await iniciar(token, 'restinga')
      agora += DURACAO_MINIMA_DUELO_MS
      expect((await vitoria(token, ini.dueloId)).r.status).toBe(200)
    }
    const linhas = d1.sqlite.prepare('SELECT quantidade FROM colecao').all() as Array<{ quantidade: number }>
    for (const l of linhas) expect(l.quantidade).toBeLessThanOrEqual(MAX_COPIAS_COLECAO)
  })

  it('perfil (/api/me) reflete a carta ganha', async () => {
    const token = await conta()
    const { json: ini } = await iniciar(token, 'urbanizacao')
    agora += DURACAO_MINIMA_DUELO_MS
    const { json } = await vitoria(token, ini.dueloId)
    const me = await chamar('/api/me', undefined, token)
    expect(me.json.usuario.colecao).toEqual(json.colecao)
  })
})
