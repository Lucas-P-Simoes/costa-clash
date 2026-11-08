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

  it('usa somente o catálogo atual e ao menos 14 modelos distintos', () => {
    expect(new Set(BARALHO_INICIAL).size).toBeGreaterThanOrEqual(14)
    expect(BARALHO_INICIAL.every((id) => Number(id.slice(3)) >= 101 && Number(id.slice(3)) <= 170)).toBe(true)
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
    const r = validarBaralho([...Array(4).fill('CC-101'), ...base.filter((i) => i !== 'CC-101').slice(0, 36)], TODAS)
    expect(r).toMatchObject({ ok: false, mensagem: expect.stringContaining('no máximo 3') })
  })

  it('rejeita quantidade acima da coleção', () => {
    const sobra = base.slice(1).concat('CC-170')
    expect(validarBaralho(sobra, colecao)).toMatchObject({ ok: false, mensagem: expect.stringContaining('coleção') })
  })

  it('aceita outra combinação válida dentro da coleção', () => {
    expect(validarBaralho([...base].reverse(), colecao).ok).toBe(true)
  })
})
