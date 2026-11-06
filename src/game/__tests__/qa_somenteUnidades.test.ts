// QA: catálogo só com unidades. Descarte forçado com mão de unidades e campo cheio (IDs VÁLIDOS), e IA x IA com todos os
// baralhos (conservação de 30 cartas, sem fallback, sem violação, sem carta fora do catálogo).
import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { jogadasLegais } from '../acoes'
import { CARTAS_NO_DUELO } from '../tipos'
import { totalCartas } from '../estado'
import { BARALHOS_SIMULACAO, simularIAxIA } from './simular'
import { cenario } from './util'

describe('QA somente unidades', () => {
  it('catálogo: 72 unidades', () => {
    expect(CATALOGO).toHaveLength(72)
    expect(CATALOGO.every((c) => c.tipo === 'unidade')).toBe(true)
  })

  it('campo cheio + mão só de unidades válidas: as únicas jogadas são descartes', () => {
    const e = cenario({ turno: 3, humano: { mao: ['CC-001', 'CC-003', 'CC-005'], campo: ['CC-002', 'CC-004', 'CC-006', 'CC-009', 'CC-010'] } })
    const j = jogadasLegais(e)
    expect(j).toHaveLength(3)
    expect(j.every((c) => c.tipo === 'descartar')).toBe(true)
  })

  it('campo com zona livre: a unidade é jogável (sem oferecer descarte forçado)', () => {
    const e = cenario({ turno: 3, humano: { mao: ['CC-001'], campo: ['CC-002'] } })
    const j = jogadasLegais(e)
    expect(j.length).toBeGreaterThan(0)
    expect(j.every((c) => c.tipo === 'jogarCarta')).toBe(true)
  })

  it('IA x IA com os 18 baralhos: 30 cartas por jogador, sem fallback nem violação', () => {
    const ids = new Set(CATALOGO.map((c) => c.id))
    BARALHOS_SIMULACAO.forEach((a, i) => {
      const b = BARALHOS_SIMULACAO[(i + 5) % BARALHOS_SIMULACAO.length]!
      const p = simularIAxIA(a.ids, b.ids, 1000 + i)
      expect(p.violacoes, `${a.nome} x ${b.nome}`).toEqual([])
      expect(p.fallbacks).toBe(0)
      expect(p.estado.resultado).not.toBeNull()
      for (const q of ['humano', 'oponente'] as const) {
        expect(totalCartas(p.estado, q)).toBe(CARTAS_NO_DUELO)
        const j = p.estado.jogadores[q]
        for (const c of [...j.baralho, ...j.mao, ...j.descarte, ...j.campo.filter((u) => !!u)]) if (c && c.cartaId !== '?') expect(ids.has(c.cartaId)).toBe(true)
      }
    })
  })
})
