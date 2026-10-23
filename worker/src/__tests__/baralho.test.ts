import { describe, expect, it } from 'vitest'
import { contar, validarBaralho } from '../baralho'
import { IDS_CATALOGO } from '../catalogo'
import { BARALHO_INICIAL, colecaoInicial } from '../inicial'

const colecao = new Map(colecaoInicial().map((i) => [i.cartaId, i.quantidade]))
const TODAS = new Map([...IDS_CATALOGO].map((id) => [id, 3]))

describe('baralho inicial', () => {
  it('tem 40 cartas, no máximo 3 por ID e só IDs do catálogo', () => {
    expect(BARALHO_INICIAL).toHaveLength(40)
    for (const [id, n] of contar(BARALHO_INICIAL)) {
      expect(IDS_CATALOGO.has(id)).toBe(true)
      expect(n).toBeLessThanOrEqual(3)
    }
  })

  it('coleção inicial é exatamente o baralho inicial e o baralho é válido contra ela', () => {
    const doBaralho = contar(BARALHO_INICIAL)
    expect(new Map(colecao)).toEqual(doBaralho)
    expect(validarBaralho([...BARALHO_INICIAL], colecao).ok).toBe(true)
  })

  it('mistura os 4 grupos de unidades, ações e armadilhas', () => {
    const n = (de: number, ate: number) => BARALHO_INICIAL.filter((id) => Number(id.slice(3)) >= de && Number(id.slice(3)) <= ate).length
    expect(n(1, 16)).toBeGreaterThan(0)
    expect(n(17, 30)).toBeGreaterThan(0)
    expect(n(31, 46)).toBeGreaterThan(0)
    expect(n(47, 72)).toBeGreaterThan(0)
    expect(n(73, 92)).toBeGreaterThan(0)
    expect(n(93, 100)).toBeGreaterThan(0)
  })
})

describe('validarBaralho', () => {
  const base = [...BARALHO_INICIAL]

  it('rejeita tamanho diferente de 40', () => {
    expect(validarBaralho(base.slice(1), colecao).ok).toBe(false)
    expect(validarBaralho([...base, base[0]], colecao).ok).toBe(false)
    expect(validarBaralho([], colecao).ok).toBe(false)
  })

  it('rejeita tipos inválidos', () => {
    expect(validarBaralho('x', colecao).ok).toBe(false)
    expect(validarBaralho(undefined, colecao).ok).toBe(false)
    expect(validarBaralho([...base.slice(1), 5], colecao).ok).toBe(false)
  })

  it('rejeita ID desconhecido', () => {
    const r = validarBaralho([...base.slice(1), 'CC-999'], colecao)
    expect(r).toMatchObject({ ok: false })
  })

  it('rejeita mais de 3 cópias mesmo que a coleção permitisse', () => {
    const r = validarBaralho([...Array(4).fill('CC-001'), ...base.filter((i) => i !== 'CC-001').slice(0, 36)], TODAS)
    expect(r).toMatchObject({ ok: false, mensagem: expect.stringContaining('no máximo 3') })
  })

  it('rejeita quantidade acima da coleção', () => {
    const sobra = base.filter((i) => i !== 'CC-002').concat('CC-100')
    expect(validarBaralho(sobra, colecao)).toMatchObject({ ok: false, mensagem: expect.stringContaining('coleção') })
  })

  it('aceita outra combinação válida dentro da coleção', () => {
    expect(validarBaralho([...base].reverse(), colecao).ok).toBe(true)
  })
})
