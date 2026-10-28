import { describe, expect, it } from 'vitest'
import { BARALHOS_OPONENTES } from '../baralhosOponentes'
import { CATALOGO } from '../catalogo'
import { chancesDrop, MAX_COPIAS_COLECAO, sortearDrop, TABELAS_DROP } from '../dropsOponentes'
import { OPONENTES } from '../oponentes'

describe('tabelas de drop', () => {
  it('existe uma tabela por adversário, e só para adversários existentes', () => {
    expect(Object.keys(TABELAS_DROP).sort()).toEqual(OPONENTES.map((o) => o.id).sort())
  })

  it('cada tabela soma 100% com inteiros positivos, sem IDs repetidos, e só com cartas do baralho do adversário', () => {
    const ids = new Set(CATALOGO.map((c) => c.id))
    for (const [op, tabela] of Object.entries(TABELAS_DROP)) {
      expect(tabela.reduce((s, [, p]) => s + p, 0), op).toBe(100)
      expect(new Set(tabela.map(([id]) => id)).size, op).toBe(tabela.length)
      for (const [id, p] of tabela) {
        expect(ids.has(id), `${op} ${id}`).toBe(true)
        expect(Number.isInteger(p) && p > 0, `${op} ${id}`).toBe(true)
        expect(BARALHOS_OPONENTES[op], op).toContain(id)
      }
    }
  })

  it('juntas, as tabelas cobrem as 100 cartas do catálogo (coleção completável)', () => {
    const cobertas = new Set(Object.values(TABELAS_DROP).flatMap((t) => t.map(([id]) => id)))
    expect(CATALOGO).toHaveLength(100)
    for (const c of CATALOGO) expect(cobertas.has(c.id), c.id).toBe(true)
  })
})

describe('sortearDrop', () => {
  const tabela = TABELAS_DROP.ressaca!

  it('mapeia [0, 1) para as faixas acumuladas da tabela', () => {
    const p0 = tabela[0]![1]
    expect(sortearDrop('ressaca', new Map(), () => 0)).toBe(tabela[0]![0])
    expect(sortearDrop('ressaca', new Map(), () => (p0 - 0.01) / 100)).toBe(tabela[0]![0])
    expect(sortearDrop('ressaca', new Map(), () => p0 / 100)).toBe(tabela[1]![0])
    expect(sortearDrop('ressaca', new Map(), () => 0.999999)).toBe(tabela[tabela.length - 1]![0])
  })

  it('valores fora de [0, 1) não quebram o sorteio', () => {
    expect(sortearDrop('ressaca', new Map(), () => 1)).toBe(tabela[tabela.length - 1]![0])
    expect(sortearDrop('ressaca', new Map(), () => -5)).toBe(tabela[0]![0])
  })

  it('ignora cartas no teto e devolve null com tudo no teto ou adversário inexistente', () => {
    const cheia = new Map(tabela.map(([id]) => [id, MAX_COPIAS_COLECAO]))
    expect(sortearDrop('ressaca', cheia, () => 0.5)).toBeNull()
    expect(sortearDrop('nao-existe', new Map(), () => 0.5)).toBeNull()
    expect(sortearDrop('toString', new Map(), () => 0.5)).toBeNull()
    const quaseCheia = new Map(cheia)
    quaseCheia.set(tabela[3]![0], MAX_COPIAS_COLECAO - 1)
    for (const r of [0, 0.3, 0.99]) expect(sortearDrop('ressaca', quaseCheia, () => r)).toBe(tabela[3]![0])
  })

  it('frequência acompanha os percentuais (amostragem uniforme de [0, 1))', () => {
    const n = 20_000
    const cont = new Map<string, number>()
    for (let i = 0; i < n; i++) {
      const id = sortearDrop('ressaca', new Map(), () => (i + 0.5) / n)!
      cont.set(id, (cont.get(id) ?? 0) + 1)
    }
    for (const [id, p] of tabela) expect(Math.abs(((cont.get(id) ?? 0) * 100) / n - p)).toBeLessThan(0.1)
  })
})

describe('chancesDrop', () => {
  it('renormaliza as chances sem as cartas no teto', () => {
    const tabela = TABELAS_DROP.porto!
    expect(chancesDrop('porto', new Map()).map((c) => c.chance)).toEqual(tabela.map(([, p]) => p))
    const [primeira] = tabela[0]!
    const chances = chancesDrop('porto', new Map([[primeira, MAX_COPIAS_COLECAO]]))
    expect(chances.some((c) => c.cartaId === primeira)).toBe(false)
    expect(chances.reduce((s, c) => s + c.chance, 0)).toBeCloseTo(100)
  })
})
