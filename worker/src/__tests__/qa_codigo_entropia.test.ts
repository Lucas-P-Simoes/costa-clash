// QA: estatística do gerador de código (10 mil amostras). Determinístico no resultado (limites folgados: chi2 p~1e-6).
import { describe, expect, it } from 'vitest'
import { ALFABETO_CODIGO } from '../../../src/auth/codigoRecuperacao'
import { gerarCodigoRecuperacao } from '../codigo'

describe('QA código de recuperação: 10 mil amostras', () => {
  it('uniforme por posição (chi-quadrado), sem proibidos, sem repetição, sem sequências anormais', () => {
    const N = 10_000
    const porPos: number[][] = Array.from({ length: 20 }, () => new Array(31).fill(0))
    const vistos = new Set<string>()
    let iguaisAdjacentes = 0
    let totalAdj = 0
    for (let i = 0; i < N; i++) {
      const c = gerarCodigoRecuperacao()
      expect(c).toMatch(/^[A-HJ-KM-NP-Z2-9]{5}(-[A-HJ-KM-NP-Z2-9]{5}){3}$/)
      expect(c).not.toMatch(/[01OIL]/)
      vistos.add(c)
      const s = c.replaceAll('-', '')
      for (let p = 0; p < 20; p++) {
        porPos[p]![ALFABETO_CODIGO.indexOf(s[p]!)]!++
        if (p > 0) {
          totalAdj++
          if (s[p] === s[p - 1]) iguaisAdjacentes++
        }
      }
    }
    expect(vistos.size).toBe(N)
    const esperado = N / 31
    for (const cont of porPos) {
      const chi2 = cont.reduce((a, o) => a + (o - esperado) ** 2 / esperado, 0)
      expect(chi2).toBeLessThan(70) // gl=30; p(chi2>70) ~ 5e-5
    }
    // P(dois adjacentes iguais) = 1/31 ~ 3.2%
    const taxa = iguaisAdjacentes / totalAdj
    expect(taxa).toBeGreaterThan(0.028)
    expect(taxa).toBeLessThan(0.037)
  })
})
