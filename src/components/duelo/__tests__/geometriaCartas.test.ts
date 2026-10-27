import { describe, expect, it } from 'vitest'
import { calcularDimensoesInspecao, calcularEstiloLeque, calcularPosicaoInspecao } from '../geometriaCartas'

describe('geometria da mão em leque', () => {
  it('é simétrica, mantém o centro reto e suporta de 1 a 5 cartas', () => {
    expect(calcularEstiloLeque(0, 1)).toMatchObject({ angulo: 0, deslocamentoY: 0, sobreposicao: 0 })
    for (const total of [2, 3, 4, 5]) {
      const estilos = Array.from({ length: total }, (_, i) => calcularEstiloLeque(i, total))
      expect(estilos[0]!.angulo).toBeCloseTo(-estilos[total - 1]!.angulo)
      expect(estilos[0]!.deslocamentoY).toBeCloseTo(estilos[total - 1]!.deslocamentoY)
      expect(Math.max(...estilos.map((e) => Math.abs(e.angulo)))).toBeLessThanOrEqual(6)
      expect(estilos.every((e) => e.sobreposicao >= 0)).toBe(true)
    }
  })

  it('normaliza índices e totais inválidos sem produzir NaN', () => {
    for (const e of [calcularEstiloLeque(-8, 0), calcularEstiloLeque(99, 5)]) {
      expect(Number.isFinite(e.angulo)).toBe(true)
      expect(Number.isFinite(e.deslocamentoY)).toBe(true)
    }
  })
})

describe('posicionamento inteligente da inspeção', () => {
  const limites = { left: 0, top: 0, right: 1000, bottom: 700 }
  it('prefere acima e limita a primeira/última carta horizontalmente', () => {
    expect(calcularPosicaoInspecao({ left: 5, right: 105, top: 500, bottom: 630, width: 100, height: 130 }, 220, 300, limites)).toEqual({ left: 12, top: 190, lado: 'acima' })
    const direita = calcularPosicaoInspecao({ left: 910, right: 990, top: 500, bottom: 630, width: 80, height: 130 }, 220, 300, limites)
    expect(direita.left).toBe(768)
    expect(direita.lado).toBe('acima')
  })

  it('usa abaixo quando não cabe acima e limita quando nenhum lado cabe', () => {
    expect(calcularPosicaoInspecao({ left: 400, right: 500, top: 40, bottom: 170, width: 100, height: 130 }, 220, 300, limites).lado).toBe('abaixo')
    const limitado = calcularPosicaoInspecao({ left: 400, right: 500, top: 250, bottom: 380, width: 100, height: 130 }, 220, 600, limites)
    expect(limitado.lado).toBe('limitado')
    expect(limitado.top).toBeGreaterThanOrEqual(12)
    expect(limitado.top + 600).toBeLessThanOrEqual(688)
  })
})

describe('dimensões da inspeção', () => {
  it('amplia pela largura real da origem sem mínimos fixos em notebook ou 4K', () => {
    const notebook = calcularDimensoesInspecao({
      larguraOrigem: 68,
      larguraDisponivel: 900,
      alturaDisponivel: 550,
      alturaViewport: 600,
      toque: false,
      comDetalhes: true,
      rem: 14,
    })
    const quatroK = calcularDimensoesInspecao({
      larguraOrigem: 330,
      larguraDisponivel: 2600,
      alturaDisponivel: 1900,
      alturaViewport: 2030,
      toque: false,
      comDetalhes: true,
      rem: 26,
    })

    expect(notebook.escala).toBeCloseTo(1.8)
    expect(quatroK.escala).toBeCloseTo(1.8)
    expect(notebook.larguraCarta).toBeCloseTo(122.4)
    expect(quatroK.larguraCarta).toBeCloseTo(594)
  })

  it('usa detalhes ao lado em paisagem baixa e conserva ampliação quando há espaço', () => {
    const dimensoes = calcularDimensoesInspecao({
      larguraOrigem: 118,
      larguraDisponivel: 760,
      alturaDisponivel: 285,
      alturaViewport: 375,
      toque: true,
      comDetalhes: true,
      rem: 16,
    })

    expect(dimensoes.layout).toBe('linha')
    expect(dimensoes.escala).toBeCloseTo(1.7)
    expect(dimensoes.larguraPainel).toBeLessThanOrEqual(760)
  })

  it('mantém pelo menos 1,55x com a carta real de ~149px antes da barra fixa', () => {
    const opcoes = {
      larguraOrigem: 149,
      larguraDisponivel: 810,
      // Barra em y=319, com margem externa de 1px em cada extremidade.
      alturaDisponivel: 317,
      alturaViewport: 375,
      toque: true,
      rem: 16,
    }
    const frente = calcularDimensoesInspecao({ ...opcoes, comDetalhes: true })
    const verso = calcularDimensoesInspecao({ ...opcoes, comDetalhes: false })

    expect(frente.layout).toBe('linha')
    expect(frente.escala).toBeGreaterThanOrEqual(1.55)
    expect(verso.escala).toBeGreaterThanOrEqual(1.55)
    expect((frente.larguraCarta * 4) / 3 + 4).toBeLessThanOrEqual(317)
    expect((verso.larguraCarta * 4) / 3 + 4).toBeLessThanOrEqual(317)
  })

  it('respeita os limites físicos antes de criar overflow', () => {
    const dimensoes = calcularDimensoesInspecao({
      larguraOrigem: 160,
      larguraDisponivel: 360,
      alturaDisponivel: 240,
      alturaViewport: 375,
      toque: true,
      comDetalhes: true,
      rem: 16,
    })

    expect(dimensoes.larguraPainel).toBeLessThanOrEqual(360)
    expect((dimensoes.larguraCarta * 4) / 3 + 4).toBeLessThanOrEqual(240)
  })
})
