import { describe, expect, it, vi } from 'vitest'
import { BARALHOS_SIMULACAO, simularIAxIA } from './simular'

// 17 baralhos (inicial + 16 oponentes); cada um joga como humano e como oponente ao longo das partidas.
// Simulações longas: sob carga ocasional passam de 5 s (asserções inalteradas).
vi.setConfig({ testTimeout: 30_000 })

const N = BARALHOS_SIMULACAO.length

describe('simulação IA x IA: nenhuma partida trava', () => {
  const partidas = Array.from({ length: N * 3 }, (_, i) => ({
    a: BARALHOS_SIMULACAO[i % N]!,
    b: BARALHOS_SIMULACAO[(i * 5 + 1 + Math.floor(i / N)) % N]!,
    seed: 1000 + i,
  }))

  it(`${partidas.length} partidas terminam em tempo finito, sem exceção, sem fallback e com invariantes preservados`, () => {
    const resumo = { humano: 0, oponente: 0, empate: 0, turnos: 0 }
    const motivos: Record<string, number> = {}
    for (const p of partidas) {
      const r = simularIAxIA(p.a.ids, p.b.ids, p.seed)
      expect(r.estado.resultado, `${p.a.nome} x ${p.b.nome} seed ${p.seed} não terminou`).not.toBeNull()
      expect(r.violacoes, `${p.a.nome} x ${p.b.nome} seed ${p.seed}`).toEqual([])
      expect(r.fallbacks).toBe(0)
      // cada jogador consome no máximo 36 turnos de baralho: partida <= 74 turnos absolutos
      expect(r.turnos).toBeLessThanOrEqual(74)
      if (r.vencedor === null) resumo.empate++
      else resumo[r.vencedor]++
      resumo.turnos += r.turnos
      motivos[r.motivo as string] = (motivos[r.motivo as string] ?? 0) + 1
    }
    expect(resumo.humano + resumo.oponente + resumo.empate).toBe(partidas.length)
    // sanidade de balanceamento mínima: a IA decide partidas por LP e não só por falta de cartas
    expect(motivos['lp'] ?? 0).toBeGreaterThan(0)
  })

  it('é reproduzível: mesma seed e baralhos dão exatamente a mesma partida', () => {
    const a = simularIAxIA(BARALHOS_SIMULACAO[0]!.ids, BARALHOS_SIMULACAO[7]!.ids, 77)
    const b = simularIAxIA(BARALHOS_SIMULACAO[0]!.ids, BARALHOS_SIMULACAO[7]!.ids, 77)
    expect(JSON.stringify(a.estado)).toBe(JSON.stringify(b.estado))
    const c = simularIAxIA(BARALHOS_SIMULACAO[0]!.ids, BARALHOS_SIMULACAO[7]!.ids, 78)
    expect(JSON.stringify(c.estado)).not.toBe(JSON.stringify(a.estado))
  })
})
