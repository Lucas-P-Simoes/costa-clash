// QA: falha no meio da troca atômica não deixa estado parcial; falha de concorrência entre regenerar e recuperar.
import { describe, expect, it } from 'vitest'
import { tratar } from '../app'
import type { Env } from '../tipos'
import { criarD1 } from './d1Falso'

const ORIGEM = 'https://lucas-p-simoes.github.io'
async function chamar(env: Env, caminho: string, corpo: unknown, token?: string, metodo = 'POST') {
  const headers: Record<string, string> = { 'CF-Connecting-IP': '5.5.5.5', Origin: ORIGEM, 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await tratar(new Request(`https://x.workers.dev${caminho}`, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) }), env, { agora: () => 1_800_000_000_000 })
  const t = await r.text()
  return { s: r.status, t, json: t ? JSON.parse(t) : null }
}

describe('QA recuperação: falha no meio da transação', () => {
  it('batch que falha no 2o comando faz ROLLBACK: senha, código e sessões intactos; resposta 500 sem detalhes', async () => {
    const d1 = criarD1()
    const ok: Env = { DB: d1.db, ORIGENS_PERMITIDAS: ORIGEM }
    const cad = await chamar(ok, '/api/cadastro', { email: 'a@teste.com', senha: 'senha-forte-1' })
    const falho: Env = {
      ...ok,
      DB: new Proxy(d1.db, {
        get(alvo, prop) {
          if (prop === 'batch') return (cmds: unknown[]) => (alvo.batch as (c: unknown[]) => Promise<unknown>)([cmds[0], { run: () => { throw new Error('SEGREDO-INTERNO') } }])
          return Reflect.get(alvo, prop) as unknown
        },
      }),
    }
    const r = await chamar(falho, '/api/senha/recuperar', { email: 'a@teste.com', codigo: cad.json.codigoRecuperacao, novaSenha: 'nova-senha-2' })
    expect(r.s).toBe(500)
    expect(r.t).not.toContain('SEGREDO-INTERNO')
    expect((await chamar(ok, '/api/login', { email: 'a@teste.com', senha: 'senha-forte-1' })).s).toBe(200)
    expect((await chamar(ok, '/api/login', { email: 'a@teste.com', senha: 'nova-senha-2' })).s).toBe(401)
    expect((await chamar(ok, '/api/me', undefined, cad.json.token, 'GET')).s).toBe(200)
    const r2 = await chamar(ok, '/api/senha/recuperar', { email: 'a@teste.com', codigo: cad.json.codigoRecuperacao, novaSenha: 'nova-senha-2' })
    expect(r2.s).toBe(200) // o código NÃO foi consumido pela tentativa falha
  })
})
