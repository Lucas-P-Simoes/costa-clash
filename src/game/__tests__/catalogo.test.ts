import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'

describe('catálogo de cartas', () => {
  it('tem 72 IDs e nomes únicos', () => {
    expect(CATALOGO).toHaveLength(72)
    expect(new Set(CATALOGO.map((c) => c.id)).size).toBe(72)
    expect(new Set(CATALOGO.map((c) => c.nome)).size).toBe(72)
  })

  it('tem 72 unidades e nenhuma carta de ação, armadilha ou equipamento', () => {
    expect(CATALOGO).toHaveLength(72)
    expect(CATALOGO.every((c) => c.tipo === 'unidade')).toBe(true)
  })

  it('unidades têm ATK/DEF inteiros não negativos; demais não têm atributos', () => {
    for (const c of CATALOGO) {
      if (c.tipo === 'unidade') {
        expect(Number.isInteger(c.atk) && (c.atk as number) >= 0).toBe(true)
        expect(Number.isInteger(c.defesa) && (c.defesa as number) >= 0).toBe(true)
        expect(c.efeito).toBeNull()
      } else {
        expect(c.atk).toBeNull()
        expect(c.defesa).toBeNull()
        expect(c.efeito).not.toBeNull()
      }
    }
  })

  it('preserva os IDs originais das unidades (001-072), sem lacunas', () => {
    expect(CATALOGO.map((c) => c.id)).toEqual(Array.from({ length: 72 }, (_, i) => `CC-${String(i + 1).padStart(3, '0')}`))
  })
})
