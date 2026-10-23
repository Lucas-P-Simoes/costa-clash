import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { validarBaralhoDuelo } from '../baralho'
import { criarRng, embaralhar } from '../rng'

describe('RNG com seed', () => {
  it('é determinístico: mesma seed, mesma sequência', () => {
    const a = criarRng(42)
    const b = criarRng(42)
    expect(Array.from({ length: 20 }, () => a())).toEqual(Array.from({ length: 20 }, () => b()))
  })

  it('seeds diferentes dão sequências diferentes e valores em [0, 1)', () => {
    const a = criarRng(1)
    const b = criarRng(2)
    const sa = Array.from({ length: 50 }, () => a())
    const sb = Array.from({ length: 50 }, () => b())
    expect(sa).not.toEqual(sb)
    for (const v of [...sa, ...sb]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('embaralhar devolve permutação, não altera a entrada e é determinístico por seed', () => {
    const entrada = Array.from({ length: 40 }, (_, i) => i)
    const copia = [...entrada]
    const r1 = embaralhar(entrada, criarRng(7))
    const r2 = embaralhar(entrada, criarRng(7))
    const r3 = embaralhar(entrada, criarRng(8))
    expect(entrada).toEqual(copia)
    expect(r1).toEqual(r2)
    expect(r1).not.toEqual(r3)
    expect([...r1].sort((a, b) => a - b)).toEqual(copia)
    expect(r1).not.toEqual(copia)
  })

  it('embaralhar lida com listas vazias e de um elemento', () => {
    expect(embaralhar([], criarRng(1))).toEqual([])
    expect(embaralhar(['x'], criarRng(1))).toEqual(['x'])
  })

  it('embaralhar é razoavelmente uniforme na primeira posição', () => {
    const rng = criarRng(123)
    const contagem = [0, 0, 0, 0]
    for (let i = 0; i < 4000; i++) contagem[(embaralhar([0, 1, 2, 3], rng)[0] as number)]!++
    for (const n of contagem) expect(n).toBeGreaterThan(800)
  })
})

describe('validação de baralho de duelo', () => {
  it('aceita o baralho inicial', () => {
    expect(validarBaralhoDuelo(BARALHO_INICIAL)).toEqual({ ok: true })
  })

  it('rejeita menos e mais de 40 cartas com mensagem clara', () => {
    const r39 = validarBaralhoDuelo(BARALHO_INICIAL.slice(0, 39))
    expect(r39.ok).toBe(false)
    if (!r39.ok) expect(r39.erros.join(' ')).toContain('exatamente 40 cartas (tem 39)')
    const r41 = validarBaralhoDuelo([...BARALHO_INICIAL, 'CC-100'])
    expect(r41.ok).toBe(false)
    if (!r41.ok) expect(r41.erros.join(' ')).toContain('tem 41')
    expect(validarBaralhoDuelo([]).ok).toBe(false)
  })

  it('rejeita mais de 3 cópias do mesmo ID', () => {
    const b = [...BARALHO_INICIAL.slice(0, 36), 'CC-001', 'CC-001', 'CC-001', 'CC-001']
    // CC-001 já aparece 2x entre os 36 primeiros; garante > 3
    const r = validarBaralhoDuelo(b)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erros.some((m) => m.includes('CC-001') && m.includes('máximo 3'))).toBe(true)
  })

  it('aceita exatamente 3 cópias', () => {
    const b = ['CC-001', 'CC-001', 'CC-001', ...Array.from({ length: 37 }, (_, i) => `CC-${String(2 + Math.floor(i / 3)).padStart(3, '0')}`)]
    expect(validarBaralhoDuelo(b)).toEqual({ ok: true })
  })

  it('rejeita IDs desconhecidos e acumula erros', () => {
    const b = [...BARALHO_INICIAL.slice(0, 38), 'CC-999', 'XYZ']
    const r = validarBaralhoDuelo(b)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erros.some((m) => m.includes('CC-999'))).toBe(true)
      expect(r.erros.some((m) => m.includes('XYZ'))).toBe(true)
    }
    const r2 = validarBaralhoDuelo([...BARALHO_INICIAL.slice(0, 39), 'CC-999'])
    expect(r2.ok).toBe(false)
  })

  it('rejeita entrada que não é lista', () => {
    // @ts-expect-error teste de robustez
    expect(validarBaralhoDuelo(null).ok).toBe(false)
  })
})
