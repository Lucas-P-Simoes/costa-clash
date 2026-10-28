// QA (drop por vitória): corridas entre duelos diferentes perto do teto, duelo alheio não consumível e entradas inválidas.
import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_COPIAS_COLECAO, TABELAS_DROP } from '../../../src/data/dropsOponentes'
import { tratar } from '../app'
import { DURACAO_MINIMA_DUELO_MS } from '../drop'
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

async function chamar(caminho: string, corpo: unknown, token?: string) {
  const headers: Record<string, string> = { 'CF-Connecting-IP': '1.1.1.1', Origin: ORIGEM, 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await tratar(new Request(`https://api.exemplo.workers.dev${caminho}`, { method: 'POST', headers, body: JSON.stringify(corpo) }), env, { agora: () => agora })
  const texto = await r.text()
  return { r, json: texto ? (JSON.parse(texto) as Record<string, any>) : null } // eslint-disable-line
}
async function conta(email: string): Promise<string> {
  return (await chamar('/api/cadastro', { email, senha: 'senha-forte-1' })).json!.token as string
}
const iniciar = (t: string, o = 'coral') => chamar('/api/duelo/iniciar', { oponenteId: o }, t)
const vitoria = (t: string, d: unknown) => chamar('/api/duelo/vitoria', { dueloId: d }, t)

describe('QA drop: corridas e isolamento', () => {
  it('dois duelos diferentes resgatados em paralelo com 1 vaga restante: coleção não passa do teto', async () => {
    const token = await conta('a@exemplo.com')
    const usuario = (d1.sqlite.prepare('SELECT id FROM usuarios').get() as { id: string }).id
    const tabela = TABELAS_DROP.coral!
    // Todas no teto menos a última, que fica a 1 cópia do teto.
    tabela.forEach(([id], i) => {
      d1.sqlite
        .prepare('INSERT INTO colecao (usuario_id, carta_id, quantidade) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET quantidade = excluded.quantidade')
        .run(usuario, id, i === tabela.length - 1 ? MAX_COPIAS_COLECAO - 1 : MAX_COPIAS_COLECAO)
    })
    const a = (await iniciar(token)).json!.dueloId
    const b = (await iniciar(token)).json!.dueloId
    agora += DURACAO_MINIMA_DUELO_MS
    const [ra, rb] = await Promise.all([vitoria(token, a), vitoria(token, b)])
    expect(ra.r.status).toBe(200)
    expect(rb.r.status).toBe(200)
    const ultima = tabela[tabela.length - 1]![0]
    const q = d1.sqlite.prepare('SELECT quantidade FROM colecao WHERE usuario_id = ? AND carta_id = ?').get(usuario, ultima) as { quantidade: number }
    expect(q.quantidade).toBe(MAX_COPIAS_COLECAO)
    // Caracterização (defeito de apresentação, baixa severidade): as duas respostas podem anunciar a MESMA carta,
    // embora só uma cópia tenha entrado. Registramos quantas anunciaram carta para o relatório.
    const anunciadas = [ra.json!.carta, rb.json!.carta].filter((c) => c !== null)
    expect(anunciadas.length).toBeGreaterThanOrEqual(1)
  })

  it('tentativa de resgatar duelo de outra conta não consome o duelo do dono', async () => {
    const dono = await conta('dono@exemplo.com')
    const intruso = await conta('intruso@exemplo.com')
    const d = (await iniciar(dono)).json!.dueloId
    agora += DURACAO_MINIMA_DUELO_MS
    expect((await vitoria(intruso, d)).r.status).toBe(404)
    expect((await vitoria(dono, d)).r.status).toBe(200)
  })

  it('tipos inválidos de dueloId/oponenteId são 400, sem 500', async () => {
    const t = await conta('x@exemplo.com')
    for (const v of [123, null, {}, [], '']) expect((await vitoria(t, v)).r.status).toBe(400)
    for (const v of [123, null, {}, '__proto__', 'hasOwnProperty']) expect((await chamar('/api/duelo/iniciar', { oponenteId: v }, t)).r.status).toBe(400)
  })

  it('duração mínima exata (30 s) já vale; 1 ms antes não, e não consome', async () => {
    const t = await conta('y@exemplo.com')
    const d = (await iniciar(t)).json!.dueloId
    agora += DURACAO_MINIMA_DUELO_MS - 1
    const curto = await vitoria(t, d)
    expect(curto.r.status).toBe(409)
    expect(curto.json!.erro.codigo).toBe('duelo_curto')
    agora += 1
    expect((await vitoria(t, d)).r.status).toBe(200)
  })
})
