// @vitest-environment jsdom
// Efeitos visuais temporários do duelo: derivação pura a partir de eventos públicos e hook com timers (sem alterar o jogo).
import { act, cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CATALOGO } from '../../../data/catalogo'
import type { Evento } from '../../../game'
import { ConfrontoAtaque } from '../ConfrontoAtaque'
import { chaveZona, derivarConfronto, derivarEfeitos, DURACAO_CONFRONTO_MS, DURACAO_EFEITO_MS, movimentoReduzido, SEM_EFEITOS, semEfeitos, useConfronto, useEfeitosVisuais } from '../efeitosVisuais'

const ev = (e: object): Evento => ({ turno: 2, texto: 't', ...e }) as Evento

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  // @ts-expect-error remove o stub de matchMedia de um teste
  delete window.matchMedia
})

describe('derivarEfeitos (função pura)', () => {
  it('sem eventos relevantes não há efeitos', () => {
    expect(semEfeitos(SEM_EFEITOS)).toBe(true)
    expect(semEfeitos(derivarEfeitos([ev({ tipo: 'fase_alterada', jogador: 'humano', fase: 'COMBATE' }), ev({ tipo: 'compra', jogador: 'humano', cartas: [] })]))).toBe(true)
  })

  it('carta jogada no campo vira entrada na zona certa; em descarte/terreno, não', () => {
    const r = derivarEfeitos([
      ev({ tipo: 'carta_jogada', jogador: 'humano', carta: { uid: 'a', cartaId: 'CC-001' }, destino: 'campo', zona: 2 }),
      ev({ tipo: 'carta_jogada', jogador: 'oponente', carta: { uid: 'b', cartaId: 'CC-001' }, destino: 'campo', zona: 0 }),
      ev({ tipo: 'carta_jogada', jogador: 'humano', carta: { uid: 'c', cartaId: 'CC-070' }, destino: 'descarte' }),
      ev({ tipo: 'carta_jogada', jogador: 'humano', carta: { uid: 'd', cartaId: 'CC-012' }, destino: 'descarte' }),
    ])
    expect(r.entrando).toEqual([chaveZona('humano', 2), chaveZona('oponente', 0)])
  })

  it('ataque: atacante e alvo (zona do outro lado); ataque direto não marca impacto em zona', () => {
    const r = derivarEfeitos([
      ev({ tipo: 'ataque_declarado', jogador: 'humano', atacante: 1, alvo: 3 }),
      ev({ tipo: 'ataque_declarado', jogador: 'oponente', atacante: 0, alvo: 'direto' }),
    ])
    expect(r.atacando).toEqual(['humano:1', 'oponente:0'])
    expect(r.impacto).toEqual(['oponente:3'])
  })

  it('dano soma por lado; destruição guarda lado, zona e carta; turno iniciado marca a troca', () => {
    const r = derivarEfeitos([
      ev({ tipo: 'dano', jogador: 'oponente', valor: 300, lp: 4700 }),
      ev({ tipo: 'dano', jogador: 'oponente', valor: 200, lp: 4500 }),
      ev({ tipo: 'unidade_destruida', jogador: 'oponente', zona: 4, carta: { uid: 'u', cartaId: 'CC-003' } }),
      ev({ tipo: 'turno_iniciado', jogador: 'humano' }),
    ])
    expect(r.dano).toEqual({ oponente: 500 })
    expect(r.destruidas).toEqual([{ lado: 'oponente', zona: 4, cartaId: 'CC-003', posicao: 'ATAQUE' }])
    expect(r.turnoMudou).toBe(true)
    expect(semEfeitos(r)).toBe(false)
  })
})

describe('fantasma herda a posição', () => {
  const destruida = ev({ tipo: 'unidade_destruida', jogador: 'humano', zona: 1, carta: { uid: 'u', cartaId: 'CC-003' } })
  it('usa a posição conhecida da zona (defesa = deitada); sem informação, ataque', () => {
    expect(derivarEfeitos([destruida], { 'humano:1': 'DEFESA' }).destruidas[0].posicao).toBe('DEFESA')
    expect(derivarEfeitos([destruida], { 'oponente:1': 'DEFESA' }).destruidas[0].posicao).toBe('ATAQUE')
  })

  it('o hook usa as posições da renderização anterior (a unidade já saiu da visão atual)', () => {
    const { result, rerender } = renderHook(({ log, pos }) => useEfeitosVisuais(log, pos), { initialProps: { log: [] as Evento[], pos: { 'humano:1': 'DEFESA' } as Record<string, 'ATAQUE' | 'DEFESA'> } })
    rerender({ log: [destruida], pos: {} })
    expect(result.current.destruidas[0].posicao).toBe('DEFESA')
  })
})

describe('useEfeitosVisuais', () => {
  const novoLog = (n: number): Evento[] => Array.from({ length: n }, () => ev({ tipo: 'fase_alterada', jogador: 'humano', fase: 'PRINCIPAL' }))
  const dano = ev({ tipo: 'dano', jogador: 'humano', valor: 100, lp: 4900 })

  it('eventos já existentes na montagem não geram efeito; novos geram e expiram sozinhos por timer', () => {
    const { result, rerender } = renderHook(({ log }) => useEfeitosVisuais(log), { initialProps: { log: [dano] as Evento[] } })
    expect(semEfeitos(result.current)).toBe(true)
    rerender({ log: [dano, dano] })
    expect(result.current.dano).toEqual({ humano: 100 })
    act(() => {
      vi.advanceTimersByTime(DURACAO_EFEITO_MS - 1)
    })
    expect(semEfeitos(result.current)).toBe(false)
    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(semEfeitos(result.current)).toBe(true)
  })

  it('lotes seguidos dentro da janela se somam; só log sem eventos visuais não cria timer', () => {
    const { result, rerender } = renderHook(({ log }) => useEfeitosVisuais(log), { initialProps: { log: [] as Evento[] } })
    rerender({ log: novoLog(2) })
    expect(vi.getTimerCount()).toBe(0)
    rerender({ log: [...novoLog(2), dano] })
    rerender({ log: [...novoLog(2), dano, dano] })
    expect(result.current.dano).toEqual({ humano: 200 })
  })

  it('desmontar limpa o timer', () => {
    const { rerender, unmount } = renderHook(({ log }) => useEfeitosVisuais(log), { initialProps: { log: [] as Evento[] } })
    rerender({ log: [dano] })
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('prefers-reduced-motion: nenhum efeito e nenhum timer', () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    expect(movimentoReduzido()).toBe(true)
    const { result, rerender } = renderHook(({ log }) => useEfeitosVisuais(log), { initialProps: { log: [] as Evento[] } })
    rerender({ log: [dano] })
    expect(semEfeitos(result.current)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('derivarConfronto (cena de ataque entre unidades)', () => {
  const declarado = (jogador: string, atacante: number, alvo: number | 'direto') => ev({ tipo: 'ataque_declarado', jogador, atacante, alvo })
  const cartas = { [chaveZona('humano', 0)]: 'CC-003', [chaveZona('oponente', 1)]: 'CC-001' }

  it('ataque direto ou sem ataque: sem cena', () => {
    expect(derivarConfronto([declarado('humano', 0, 'direto')], cartas)).toBeNull()
    expect(derivarConfronto([ev({ tipo: 'dano', jogador: 'oponente', valor: 100, lp: 1 })], cartas)).toBeNull()
  })

  it('identifica as cartas e marca para queimar só a unidade destruída', () => {
    const r = derivarConfronto(
      [
        declarado('humano', 0, 1),
        ev({ tipo: 'dano', jogador: 'oponente', valor: 400, lp: 4600 }),
        ev({ tipo: 'unidade_destruida', jogador: 'oponente', zona: 1, carta: { uid: 'x', cartaId: 'CC-001' } }),
      ],
      cartas,
    )
    expect(r).toEqual({
      atacante: { lado: 'humano', zona: 0, cartaId: 'CC-003', destruida: false },
      alvo: { lado: 'oponente', zona: 1, cartaId: 'CC-001', destruida: true },
      veredito: null,
    })
  })

  it.each([
    ['atacante_vence', 'atacante'],
    ['defesa_destruida', 'atacante'],
    ['alvo_vence', 'alvo'],
    ['ataque_repelido', 'alvo'],
    ['empate', 'empate'],
    ['defesa_empate', 'empate'],
  ] as const)('veredito: combate %s => %s', (resultado, esperado) => {
    const r = derivarConfronto([declarado('humano', 0, 1), ev({ tipo: 'combate_resolvido', jogador: 'humano', atacante: 0, alvo: 1, resultado })], cartas)
    expect(r?.veredito).toBe(esperado)
  })

  it('atacante derrotado queima; carta virada para baixo usa a revelação do combate', () => {
    const r = derivarConfronto([
      declarado('oponente', 2, 0),
      ev({ tipo: 'unidade_revelada', jogador: 'humano', zona: 0, carta: { uid: 'r', cartaId: 'CC-071' } }),
      ev({ tipo: 'unidade_destruida', jogador: 'oponente', zona: 2, carta: { uid: 'o', cartaId: 'CC-002' } }),
    ])
    expect(r?.atacante).toEqual({ lado: 'oponente', zona: 2, cartaId: 'CC-002', destruida: true })
    expect(r?.alvo).toEqual({ lado: 'humano', zona: 0, cartaId: 'CC-071', destruida: false })
  })

  it('hook: cena aparece com o ataque e expira sozinha; nada com movimento reduzido', () => {
    const { result, rerender } = renderHook(({ log }) => useConfronto(log, cartas), { initialProps: { log: [] as Evento[] } })
    rerender({ log: [declarado('humano', 0, 1)] })
    expect(result.current?.alvo.cartaId).toBe('CC-001')
    act(() => {
      vi.advanceTimersByTime(DURACAO_CONFRONTO_MS)
    })
    expect(result.current).toBeNull()
    expect(vi.getTimerCount()).toBe(0)

    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce') })) as unknown as typeof window.matchMedia
    rerender({ log: [declarado('humano', 0, 1), declarado('humano', 0, 1)] })
    expect(result.current).toBeNull()
  })
})

describe('ConfrontoAtaque: veredito escrito grande', () => {
  const lado = (l: 'humano' | 'oponente', cartaId: string, destruida = false) => ({ lado: l, zona: 0, cartaId, destruida })
  const carta = (id: string) => CATALOGO.find((c) => c.id === id)
  const montar = (veredito: 'atacante' | 'alvo' | 'empate' | null) =>
    render(<ConfrontoAtaque confronto={{ id: 1, atacante: lado('humano', 'CC-043'), alvo: lado('oponente', 'CC-001', true), veredito }} carta={carta} />)

  it('VITÓRIA aparece só sobre a carta vencedora', () => {
    const { container } = montar('atacante')
    const v = container.querySelectorAll('.confronto__veredito--vitoria')
    expect(v).toHaveLength(1)
    expect(v[0]!.textContent).toBe('VITÓRIA')
    expect(v[0]!.closest('[data-confronto]')?.getAttribute('data-confronto')).toBe('atacante')
    expect(container.querySelector('.confronto__veredito--empate')).toBeNull()
  })

  it('a vitória do alvo marca a carta atacada', () => {
    const { container } = montar('alvo')
    expect(container.querySelector('.confronto__veredito--vitoria')?.closest('[data-confronto]')?.getAttribute('data-confronto')).toBe('alvo')
  })

  it('EMPATE aparece no centro, sem VITÓRIA; sem veredito nada é escrito', () => {
    const { container, unmount } = montar('empate')
    expect(container.querySelector('.confronto__veredito--empate')?.textContent).toBe('EMPATE')
    expect(container.querySelector('.confronto__veredito--vitoria')).toBeNull()
    unmount()
    expect(montar(null).container.querySelector('.confronto__veredito')).toBeNull()
  })
})
