import { describe, expect, it } from 'vitest'
import { OPONENTES } from '../oponentes'
import { idsBloqueados, lerDerrotados, lerLiberados, proximoAdversarioId, registrarVitoria, salvarLiberados } from '../progressoOponentes'

function memoria() {
  const d = new Map<string, string>()
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) }
}

describe('progressão de adversários', () => {
  it('sem vitórias só o primeiro está liberado', () => {
    const b = idsBloqueados([])
    expect(b.has(OPONENTES[0].id)).toBe(false)
    expect(b.size).toBe(OPONENTES.length - 1)
    expect(proximoAdversarioId([])).toBe(OPONENTES[0].id)
  })

  it('cada vitória libera o próximo', () => {
    const b = idsBloqueados([OPONENTES[0].id])
    expect(b.has(OPONENTES[1].id)).toBe(false)
    expect(b.has(OPONENTES[2].id)).toBe(true)
    expect(proximoAdversarioId([OPONENTES[0].id])).toBe(OPONENTES[1].id)
  })

  it('vencer todos libera todos', () => {
    const todos = OPONENTES.map((o) => o.id)
    expect(idsBloqueados(todos).size).toBe(0)
    expect(proximoAdversarioId(todos)).toBe(OPONENTES[OPONENTES.length - 1].id)
  })

  it('persiste por conta, é idempotente e ignora ids inválidos', () => {
    const m = memoria()
    const a = registrarVitoria('u1', OPONENTES[0].id, [], m)
    expect(registrarVitoria('u1', OPONENTES[0].id, a, m)).toEqual(a)
    expect(registrarVitoria('u1', 'inexistente', a, m)).toEqual(a)
    expect(lerDerrotados('u1', m)).toEqual([OPONENTES[0].id])
    expect(lerDerrotados('u2', m)).toEqual([])
  })

  it('armazenamento corrompido ou indisponível vira lista vazia', () => {
    const m = memoria()
    m.setItem('costa-clash:derrotados:u1', '{lixo')
    expect(lerDerrotados('u1', m)).toEqual([])
    expect(lerDerrotados('u1', null)).toEqual([])
  })

  it('liberados manuais desbloqueiam sem vitórias e persistem por conta', () => {
    const m = memoria()
    expect(idsBloqueados([], [OPONENTES[4].id]).has(OPONENTES[4].id)).toBe(false)
    expect(salvarLiberados('u1', [OPONENTES[4].id, OPONENTES[4].id, 'inexistente'], m)).toEqual([OPONENTES[4].id])
    expect(lerLiberados('u1', m)).toEqual([OPONENTES[4].id])
    expect(lerLiberados('u2', m)).toEqual([])
  })
})
