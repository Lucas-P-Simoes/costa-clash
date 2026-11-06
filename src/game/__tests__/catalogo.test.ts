import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'

describe('catálogo de cartas', () => {
  it('tem 87 IDs e nomes únicos', () => {
    expect(CATALOGO).toHaveLength(87)
    expect(new Set(CATALOGO.map((c) => c.id)).size).toBe(87)
    expect(new Set(CATALOGO.map((c) => c.nome)).size).toBe(87)
  })

  it('tem 72 unidades e 15 ações (11 instantâneas e 4 terrenos); sem armadilhas nem equipamentos', () => {
    const conta = (t: string) => CATALOGO.filter((c) => c.tipo === t).length
    expect(conta('unidade')).toBe(72)
    expect(conta('acao')).toBe(15)
    expect(CATALOGO.filter((c) => c.subtipo === 'instantanea')).toHaveLength(11)
    expect(CATALOGO.filter((c) => c.subtipo === 'terreno')).toHaveLength(4)
    expect(CATALOGO.map((c) => c.tipo as string)).not.toContain('armadilha')
    expect(CATALOGO.map((c) => c.subtipo as string | undefined)).not.toContain('equipamento')
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

  it('preserva os IDs originais: unidades 001-072 e ações 073-092, sem as cartas de suporte removidas (082, 085-088, 093-100)', () => {
    const removidas = new Set(['CC-082', 'CC-085', 'CC-086', 'CC-087', 'CC-088', ...Array.from({ length: 8 }, (_, i) => `CC-${93 + i < 100 ? '0' : ''}${93 + i}`)])
    const esperados = Array.from({ length: 92 }, (_, i) => `CC-${String(i + 1).padStart(3, '0')}`).filter((id) => !removidas.has(id))
    expect(CATALOGO.map((c) => c.id)).toEqual(esperados)
    for (const c of CATALOGO) expect(c.tipo).toBe(Number(c.id.slice(3)) <= 72 ? 'unidade' : 'acao')
  })
})
