import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../catalogo'
import { HISTORIAS_CARTAS } from '../historiasCartas'

describe('histórias das cartas', () => {
  it('toda carta tem história editorial ou informação educacional de fallback, sem histórias órfãs', () => {
    for (const c of CATALOGO) expect(HISTORIAS_CARTAS[c.id] ?? c.educacao, c.id).toBeTruthy()
    const ids = new Set(CATALOGO.map((c) => c.id))
    for (const id of Object.keys(HISTORIAS_CARTAS)) expect(ids.has(id), id).toBe(true)
  })

  it('textos têm tamanho razoável e não afirmam eliminação total de riscos', () => {
    for (const [id, t] of Object.entries(HISTORIAS_CARTAS)) {
      expect(t.length, id).toBeGreaterThan(60)
      expect(t.length, id).toBeLessThan(400)
      expect(t, id).not.toMatch(/elimina (totalmente|por completo)|acaba com todos/i)
    }
  })
})
