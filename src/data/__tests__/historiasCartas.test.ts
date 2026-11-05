import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../catalogo'
import { HISTORIAS_CARTAS } from '../historiasCartas'

describe('histórias das cartas', () => {
  it('toda carta do catálogo tem uma história, e não há histórias órfãs', () => {
    for (const c of CATALOGO) expect(HISTORIAS_CARTAS[c.id], c.id).toBeTruthy()
    expect(Object.keys(HISTORIAS_CARTAS).sort()).toEqual(CATALOGO.map((c) => c.id).sort())
  })

  it('textos têm tamanho razoável e não afirmam eliminação total de riscos', () => {
    for (const [id, t] of Object.entries(HISTORIAS_CARTAS)) {
      expect(t.length, id).toBeGreaterThan(60)
      expect(t.length, id).toBeLessThan(400)
      expect(t, id).not.toMatch(/elimina (totalmente|por completo)|acaba com todos/i)
    }
  })
})
