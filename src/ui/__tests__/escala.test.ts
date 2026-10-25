import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALTURA_REF_REM, BASE_MAX_PX, BASE_MIN_PX, baseRaiz, fatorEscala, LARGURA_REF_REM, viewportEmRem } from '../escala'

describe('escala fluida (baseRaiz)', () => {
  it('a referência 1440x900 vale 16px (fator 1)', () => {
    expect(baseRaiz(1440, 900)).toBe(16)
    expect(fatorEscala(1440, 900)).toBe(1)
  })
  it('é limitada pela MENOR das dimensões relativas (largura x altura)', () => {
    expect(baseRaiz(1920, 1080)).toBeCloseTo(19.2) // altura limita (1080/56,25)
    expect(baseRaiz(2000, 800)).toBeCloseTo(14.2222) // altura limita
    expect(baseRaiz(1500, 2000)).toBeCloseTo(16.6667) // largura limita (1500/90)
  })
  it('tem piso de 14px e teto de 26px (4K não fica gigante)', () => {
    expect(baseRaiz(1280, 600)).toBe(BASE_MIN_PX)
    expect(baseRaiz(1024, 768)).toBe(BASE_MIN_PX)
    expect(baseRaiz(3840, 2160)).toBe(BASE_MAX_PX)
    expect(baseRaiz(3840, 2030)).toBe(BASE_MAX_PX)
    expect(fatorEscala(3840, 2160)).toBeCloseTo(1.625)
  })
  it('celular usa base fixa de 16px (15px abaixo de 360px)', () => {
    expect(baseRaiz(390, 844)).toBe(16)
    expect(baseRaiz(430, 932)).toBe(16)
    expect(baseRaiz(320, 568)).toBe(15)
  })
  it('altura em rem nunca cai abaixo da referência quando a escala não está no piso', () => {
    for (const [w, h] of [[1920, 1080], [2560, 1440], [1600, 900], [1536, 864]] as const) {
      expect(viewportEmRem(w, h).altura).toBeGreaterThanOrEqual(ALTURA_REF_REM - 0.001)
      expect(viewportEmRem(w, h).largura).toBeGreaterThanOrEqual(LARGURA_REF_REM - 0.001)
    }
  })
  it('a fórmula do CSS (responsivo.css) usa as mesmas constantes', () => {
    const css = readFileSync(resolve(__dirname, '../../styles/responsivo.css'), 'utf8')
    expect(css).toContain(`clamp(${BASE_MIN_PX}px, min(100dvw / ${LARGURA_REF_REM}, 100dvh / ${ALTURA_REF_REM}), ${BASE_MAX_PX}px)`)
  })
})
