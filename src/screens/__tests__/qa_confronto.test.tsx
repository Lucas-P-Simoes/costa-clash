// @vitest-environment jsdom
// QA: cena de confronto (ataque entre unidades) — casos extremos de derivação, fim de jogo, desistência, desmontagem e acessibilidade.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Evento } from '../../game'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { chaveZona, derivarConfronto } from '../../components/duelo/efeitosVisuais'
import { Partida } from '../duelo/Partida'
import { arrastarAtaque } from './ajudanteAtaque'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  // @ts-expect-error remove o stub de matchMedia
  delete window.matchMedia
})

const ev = (e: object): Evento => ({ turno: 2, texto: 't', ...e }) as Evento
const botao = (n: string | RegExp) => screen.getByRole('button', { name: n })

function montar(cfg: ConfigCenario, atrasoIA = 0) {
  const e = cenario({ humano: { baralho: 20 }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={atrasoIA} onVoltar={() => {}} onNovamente={() => {}} />)
}
const atacarZona1 = () =>
  arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ }), screen.getByRole('button', { name: /Zona 1 do oponente:/ }))

describe('QA derivarConfronto: casos extremos', () => {
  it('empate: as duas unidades destruídas queimam', () => {
    const r = derivarConfronto([
      ev({ tipo: 'ataque_declarado', jogador: 'humano', atacante: 0, alvo: 0 }),
      ev({ tipo: 'unidade_destruida', jogador: 'oponente', zona: 0, carta: { uid: 'a', cartaId: 'CC-003' } }),
      ev({ tipo: 'unidade_destruida', jogador: 'humano', zona: 0, carta: { uid: 'b', cartaId: 'CC-003' } }),
    ])
    expect(r?.atacante.destruida).toBe(true)
    expect(r?.alvo.destruida).toBe(true)
  })

  it('ataque anulado seguido de ataque válido: a cena é do válido; destruição de outra zona não marca', () => {
    const cartas = { [chaveZona('humano', 1)]: 'CC-003', [chaveZona('oponente', 2)]: 'CC-001' }
    const r = derivarConfronto(
      [
        ev({ tipo: 'ataque_declarado', jogador: 'humano', atacante: 0, alvo: 0 }),
        ev({ tipo: 'ataque_anulado', jogador: 'humano', atacante: 0 }),
        ev({ tipo: 'ataque_declarado', jogador: 'humano', atacante: 1, alvo: 2 }),
        ev({ tipo: 'unidade_destruida', jogador: 'oponente', zona: 3, carta: { uid: 'x', cartaId: 'CC-002' } }),
      ],
      cartas,
    )
    expect(r).toEqual({
      atacante: { lado: 'humano', zona: 1, cartaId: 'CC-003', destruida: false },
      alvo: { lado: 'oponente', zona: 2, cartaId: 'CC-001', destruida: false },
    })
  })

  it('unidade oculta sem revelação e destruição com cartaId "?" continua desconhecida (verso)', () => {
    const r = derivarConfronto([
      ev({ tipo: 'ataque_declarado', jogador: 'humano', atacante: 0, alvo: 1 }),
      ev({ tipo: 'unidade_destruida', jogador: 'oponente', zona: 1, carta: { uid: 'x', cartaId: '?' } }),
    ])
    expect(r?.alvo).toEqual({ lado: 'oponente', zona: 1, cartaId: null, destruida: true })
  })
})

describe('QA Partida: cena de confronto', () => {
  it('golpe final com ataque entre unidades: o resultado espera a cena (queima visível) e a cena não polui a árvore acessível', () => {
    vi.useFakeTimers()
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { lp: 300, campo: ['CC-001'], mao: ['CC-001'] } })
    atacarZona1()
    expect(screen.queryByRole('dialog')).toBeNull()
    const cena = document.querySelector('.confronto')!
    expect(cena).toBeTruthy()
    expect(cena.getAttribute('aria-hidden')).toBe('true')
    // nenhum elemento focável na cena; getByRole('img') do campo não enxerga as cartas grandes
    expect(cena.querySelector('button, [tabindex], a, input')).toBeNull()
    expect(screen.queryAllByRole('img', { name: 'Recife de Coral' })).toHaveLength(0)
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(document.querySelector('.confronto')).toBeNull()
    expect(screen.getByRole('dialog').textContent).toContain('Vitória')
  })

  it('a cena duplica no DOM os nomes das cartas enquanto existe e expira sem timers pendentes', () => {
    vi.useFakeTimers()
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], mao: ['CC-001'] } })
    atacarZona1()
    const dentro = Array.from(document.querySelectorAll('.confronto .carta__nome')).map((n) => n.textContent)
    expect(dentro).toEqual(['Recife de Coral', 'Manguezal Protegido'])
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('desmontar com a cena ativa limpa o timer da cena', () => {
    vi.useFakeTimers()
    const { unmount } = montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], mao: ['CC-001'] } })
    atacarZona1()
    expect(document.querySelector('.confronto')).toBeTruthy()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('movimento reduzido: sem cena', () => {
    vi.useFakeTimers()
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce') })) as unknown as typeof window.matchMedia
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], mao: ['CC-001'] } })
    atacarZona1()
    expect(document.querySelector('.confronto')).toBeNull()
  })

  it('turno da IA: ataque entre unidades mostra a cena e o passo seguinte espera; desistir no meio encerra sem timers pendentes', () => {
    vi.useFakeTimers()
    montar({ jogadaFeita: true, humano: { campo: ['CC-013'], baralho: 30 }, oponente: { campo: ['CC-003'], mao: ['CC-001'], baralho: 30 } }, 100)
    fireEvent.click(botao(/Encerrar turno/))
    let viuCena = false
    for (let t = 0; t < 40 && !viuCena; t++) {
      act(() => {
        vi.advanceTimersByTime(50)
      })
      viuCena = !!document.querySelector('.confronto')
    }
    expect(viuCena).toBe(true)
    // o alvo humano (Banco de Areia, ATK 700) foi atacado pelo Recife de Coral (1600) e queima
    const alvo = document.querySelector('.confronto [data-confronto="alvo"]')!
    expect(alvo.getAttribute('data-queima')).toBe('true')
    expect(alvo.textContent).toContain('Banco de Areia')
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    expect(screen.getByRole('dialog').textContent).toContain('Você desistiu do duelo.')
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(screen.getByRole('dialog').textContent).toContain('Você desistiu do duelo.')
    expect(document.querySelector('.confronto')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
})
