import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'

describe('catálogo de cartas', () => {
  it('tem 100 IDs e nomes únicos', () => {
    expect(CATALOGO).toHaveLength(100)
    expect(new Set(CATALOGO.map((c) => c.id)).size).toBe(100)
    expect(new Set(CATALOGO.map((c) => c.nome)).size).toBe(100)
  })

  it('tem 72 unidades, 20 ações e 8 armadilhas', () => {
    const conta = (t: string) => CATALOGO.filter((c) => c.tipo === t).length
    expect(conta('unidade')).toBe(72)
    expect(conta('acao')).toBe(20)
    expect(conta('armadilha')).toBe(8)
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

  it('segue as faixas de ID: unidades 001-072, ações 073-092, armadilhas 093-100', () => {
    CATALOGO.forEach((c, i) => {
      expect(c.id).toBe(`CC-${String(i + 1).padStart(3, '0')}`)
      const esperado = i < 72 ? 'unidade' : i < 92 ? 'acao' : 'armadilha'
      expect(c.tipo).toBe(esperado)
    })
  })
})
