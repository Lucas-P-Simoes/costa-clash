import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL, colecaoInicial } from '../baralhoInicial'
import { BARALHOS_OPONENTES, baralhoDoOponente } from '../baralhosOponentes'
import { CATALOGO } from '../catalogo'
import { OPONENTES } from '../oponentes'
import { validarBaralhoDuelo } from '../../game/baralho'
import * as inicialDoWorker from '../../../worker/src/inicial'

const porId = new Map(CATALOGO.map((c) => [c.id, c]))

describe('baralhos dos oponentes (provisórios)', () => {
  it('há um baralho para cada um dos 16 oponentes e nenhum extra', () => {
    expect(OPONENTES).toHaveLength(16)
    expect(Object.keys(BARALHOS_OPONENTES).sort()).toEqual(OPONENTES.map((o) => o.id).sort())
  })

  it.each(OPONENTES.map((o) => [o.id] as const))('%s: baralho válido (40 cartas, <=3 por ID, IDs existentes)', (id) => {
    const b = baralhoDoOponente(id)
    expect(b).toBeDefined()
    expect(validarBaralhoDuelo(b as string[])).toEqual({ ok: true })
  })

  it.each(OPONENTES.map((o) => [o.id] as const))('%s: tem ações e armadilhas jogáveis e unidades do próprio grupo', (id) => {
    const o = OPONENTES.find((x) => x.id === id)!
    const cartas = (baralhoDoOponente(id) as string[]).map((c) => porId.get(c)!)
    expect(cartas.filter((c) => c.tipo === 'acao').length).toBeGreaterThanOrEqual(6)
    expect(cartas.filter((c) => c.tipo === 'armadilha').length).toBeGreaterThanOrEqual(3)
    const unidades = cartas.filter((c) => c.tipo === 'unidade')
    const doGrupo = unidades.filter((c) => c.grupo === o.grupo).length
    // unidades temáticas dominam o baralho (>= 50% das unidades)
    expect(doGrupo / unidades.length).toBeGreaterThanOrEqual(0.5)
  })

  it('dificuldade só pela composição: mais cartas de apoio e unidades mais fortes nos níveis altos', () => {
    const media = (nivel: number, f: (ids: readonly string[]) => number) => {
      const ops = OPONENTES.filter((o) => o.dificuldade === nivel)
      return ops.reduce((s, o) => s + f(baralhoDoOponente(o.id) as string[]), 0) / ops.length
    }
    const apoio = (ids: readonly string[]) => ids.filter((i) => porId.get(i)!.tipo !== 'unidade').length
    const forca = (ids: readonly string[]) => {
      const u = ids.map((i) => porId.get(i)!).filter((c) => c.tipo === 'unidade')
      return u.reduce((s, c) => s + (c.atk ?? 0) + (c.defesa ?? 0), 0) / u.length
    }
    expect(media(1, apoio)).toBeLessThan(media(2, apoio))
    expect(media(2, apoio)).toBeLessThan(media(3, apoio))
    expect(media(3, forca)).toBeGreaterThan(media(1, forca))
  })
})

describe('baralho inicial compartilhado', () => {
  it('o worker reexporta o mesmo baralho inicial do front (saída idêntica)', () => {
    expect(inicialDoWorker.BARALHO_INICIAL).toBe(BARALHO_INICIAL)
    expect(inicialDoWorker.colecaoInicial()).toEqual(colecaoInicial())
    expect(validarBaralhoDuelo(BARALHO_INICIAL).ok).toBe(true)
  })
})
