// @vitest-environment jsdom
// Arrasto por TOQUE (pressão longa), limiar de 10 px no mouse, dica por tipo de ponteiro, tela baixa, nomes curtos e selo de posição.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CartaView } from '../../components/duelo/CartaView'
import { nomeCurto } from '../../components/duelo/textoCarta'
import { CATALOGO } from '../../data/catalogo'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'

const tick = () => new Promise((r) => setTimeout(r, 5))
afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  await tick()
  // @ts-expect-error remove stubs
  delete document.elementFromPoint
  // @ts-expect-error remove stubs
  delete window.matchMedia
  // @ts-expect-error remove stubs
  delete navigator.vibrate
})

function montar(cfg: ConfigCenario = {}) {
  const e = cenario({ humano: { baralho: 20, mao: ['CC-003', 'CC-004'] }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={0} onVoltar={() => {}} onNovamente={() => {}} />)
}
const mao = (i = 1) => screen.getByRole('button', { name: new RegExp('^Mão ' + i + ':') })
const zona = (i: number) => [...document.querySelectorAll<HTMLElement>('.duelo-lado--voce .duelo-zonas > .zona')][i]
const campoV = () => [...document.querySelectorAll('.duelo-lado--voce .duelo-zonas .carta')].map((c) => c.getAttribute('aria-label')).join('|')
const fantasma = () => document.querySelector('.duelo-arrasto-fantasma')
const T = { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true }
const M = { pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true }
const stubMedia = (consultas: RegExp) => {
  window.matchMedia = ((q: string) => ({ matches: consultas.test(q), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

describe('Toque: pressão longa arma o arrasto', () => {
  it('parado ~240 ms: entra em modo arrasto (fantasma, zonas destacadas, vibração) e soltar na zona joga a carta', () => {
    vi.useFakeTimers()
    const vibrar = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrar, configurable: true, writable: true })
    montar()
    document.elementFromPoint = () => zona(2)
    fireEvent.pointerDown(mao(1), { ...T, clientX: 100, clientY: 500 })
    expect(fantasma()).toBeNull()
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(fantasma()).not.toBeNull()
    expect(document.querySelectorAll('.zona--drop')).toHaveLength(5)
    expect(vibrar).toHaveBeenCalledTimes(1)
    fireEvent.pointerMove(window, { ...T, clientX: 140, clientY: 400 })
    fireEvent.pointerUp(window, { ...T, clientX: 140, clientY: 400 })
    expect(campoV()).toMatch(/^Zona 3 sua: Recife de Coral/)
  })

  it('mover mais de 8 px antes do tempo cancela (é rolagem): nada de arrasto, mesmo depois do prazo', () => {
    vi.useFakeTimers()
    montar()
    fireEvent.pointerDown(mao(1), { ...T, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...T, clientX: 100, clientY: 480 })
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(fantasma()).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    expect(campoV()).toBe('')
  })

  it('tolerância: tremor de até 8 px não cancela a pressão longa', () => {
    vi.useFakeTimers()
    montar()
    fireEvent.pointerDown(mao(1), { ...T, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...T, clientX: 104, clientY: 503 })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(fantasma()).not.toBeNull()
    fireEvent.pointerUp(window, { ...T, clientX: 104, clientY: 503 })
  })

  it('soltar sem mover após armar não joga; a carta fica selecionada e o clique seguinte não a desmarca', async () => {
    vi.useFakeTimers()
    montar()
    document.elementFromPoint = () => zona(0)
    fireEvent.pointerDown(mao(1), { ...T, clientX: 100, clientY: 500 })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    fireEvent.pointerUp(window, { ...T, clientX: 100, clientY: 500 })
    expect(campoV()).toBe('')
    expect(fantasma()).toBeNull()
    fireEvent.click(mao(1)) // clique sintetizado pelo navegador: engolido
    expect(mao(1).getAttribute('aria-pressed')).toBe('true')
  })

  it('toque curto (levantar antes do prazo) é clique normal: seleciona e não deixa timer pendente', () => {
    vi.useFakeTimers()
    montar()
    fireEvent.pointerDown(mao(1), { ...T, clientX: 100, clientY: 500 })
    fireEvent.pointerUp(window, { ...T, clientX: 100, clientY: 500 })
    fireEvent.click(mao(1))
    expect(mao(1).getAttribute('aria-pressed')).toBe('true')
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(fantasma()).toBeNull()
  })

  it('bloqueado (jogada da mão já feita): a pressão longa mostra o motivo e não arma', () => {
    vi.useFakeTimers()
    montar({ jogadaFeita: true })
    fireEvent.pointerDown(mao(1), { ...T, clientX: 100, clientY: 500 })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(fantasma()).toBeNull()
    expect(document.querySelector('.duelo-aviso')!.textContent).toBe('Você já fez a jogada da mão neste turno.')
  })

  it('touchmove só é cancelado (impede rolagem) enquanto o arrasto está ativo', () => {
    vi.useFakeTimers()
    montar()
    const mover = () => {
      const ev = new Event('touchmove', { bubbles: true, cancelable: true })
      mao(1).dispatchEvent(ev)
      return ev.defaultPrevented
    }
    expect(mover()).toBe(false) // rolagem normal sobre a mão
    fireEvent.pointerDown(mao(1), { ...T, clientX: 100, clientY: 500 })
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(mover()).toBe(true)
    fireEvent.pointerUp(window, { ...T, clientX: 100, clientY: 500 })
    expect(mover()).toBe(false)
  })

  it('o CSS não bloqueia a rolagem vertical sobre a mão (sem pan-x/none)', () => {
    const css = readFileSync(resolve(__dirname, '../duelo/duelo.css'), 'utf8')
    const i = css.indexOf('.carta--arrastavel {')
    const bloco = css.slice(i, css.indexOf('}', i))
    expect(bloco).toContain('touch-action: manipulation')
    expect(bloco).not.toMatch(/touch-action: (pan-x|none)/)
  })
})

describe('Mouse/caneta: limiar de 10 px', () => {
  it('tremor de 8 px não vira arrasto; 12 px vira', () => {
    montar()
    fireEvent.pointerDown(mao(1), { ...M, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...M, clientX: 106, clientY: 505 })
    expect(fantasma()).toBeNull()
    fireEvent.pointerMove(window, { ...M, clientX: 100, clientY: 488 })
    expect(fantasma()).not.toBeNull()
    fireEvent.pointerUp(window, { ...M, clientX: 100, clientY: 488 })
  })
})

describe('Dica e tela baixa', () => {
  it('dica por tipo de ponteiro: toque (pointer: coarse) pede "Segure e arraste"; mouse, "Arraste"', () => {
    montar()
    expect(document.querySelector('.duelo-mao__dica')!.textContent).toBe('Arraste a carta até o campo ou use USAR CARTA')
    cleanup()
    stubMedia(/pointer: coarse/)
    montar()
    expect(document.querySelector('.duelo-mao__dica')!.textContent).toBe('Segure e arraste a carta até o campo, ou use USAR CARTA')
  })

  it('celular em paisagem (altura baixa): sem dica de arrasto e o arrasto mostra o motivo; seleção + USAR CARTA seguem', async () => {
    stubMedia(/max-height: 520px/)
    montar()
    expect(document.querySelector('.duelo-mao__dica')).toBeNull()
    document.elementFromPoint = () => zona(0)
    fireEvent.pointerDown(mao(1), { ...M, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...M, clientX: 100, clientY: 400 })
    expect(fantasma()).toBeNull()
    expect(document.querySelector('.duelo-aviso')!.textContent).toContain('USAR CARTA')
    await tick() // o clique engolido após o arrasto bloqueado expira no ciclo seguinte
    fireEvent.click(mao(1))
    fireEvent.click(screen.getByRole('button', { name: /Usar carta/ }))
    fireEvent.click(document.querySelector<HTMLElement>('.duelo-lado--voce .duelo-zonas button.zona--vazia')!)
    expect(campoV()).toContain('Recife de Coral')
  })
})

describe('Nomes por palavra e selo de posição', () => {
  it('nomeCurto abrevia só palavras/trechos de 10+ letras, sem cortar no meio sem marcar', () => {
    expect(nomeCurto('Pesquisa Oceanográfica')).toBe('Pesquisa Oceanogr.')
    expect(nomeCurto('Branqueamento de Corais')).toBe('Branquea. de Corais')
    expect(nomeCurto('Caranguejo-Uçá')).toBe('Carangue.-Uçá')
    expect(nomeCurto('Manguezal Protegido')).toBe('Manguezal Protegido')
    expect(nomeCurto('Derramamento de Óleo')).toBe('Derramam. de Óleo')
  })

  it('carta de campo guarda nome completo e curto (CSS escolhe pela largura); mão e suporte mostram o nome inteiro', () => {
    const c = CATALOGO.find((x) => x.nome === 'Pesquisa Oceanográfica')!
    const { container } = render(<CartaView carta={c} tamanho="campo" posicao="DEFESA" rotulo="x" />)
    expect(container.querySelector('.nome-completo')!.textContent).toBe('Pesquisa Oceanográfica')
    expect(container.querySelector('.nome-curto')!.textContent).toBe('Pesquisa Oceanogr.')
    expect(container.querySelector('.nome-curto')!.getAttribute('aria-hidden')).toBe('true')
    cleanup()
    const r = render(<CartaView carta={c} tamanho="mao" rotulo="x" />)
    expect(r.container.querySelector('.nome-curto')).toBeNull()
    expect(r.container.querySelector('.carta__nome')!.textContent).toBe('Pesquisa Oceanográfica')
  })

  it('CSS: selo de posição de 10 px; deitada o chip contra-rotacionado tem o centro a >= 20 px da borda; container query do nome', () => {
    const css = readFileSync(resolve(__dirname, '../duelo/duelo.css'), 'utf8')
    const trecho = (sel: string) => {
      const i = css.indexOf(`
${sel} {`)
      expect(i, sel).toBeGreaterThanOrEqual(0)
      return css.slice(i, css.indexOf('}', i))
    }
    expect(trecho('.carta__posicao')).toContain('font-size: 10px')
    expect(trecho('.carta__posicao')).toContain('width: 40px')
    expect(trecho('.carta--campo.carta--defesa .carta__posicao')).toContain('top: 15px') // 3 + (40 - 16) / 2
    expect(css).toContain('@container carta (max-width: 107px)')
    expect(trecho('.duelo-mao__dica')).toContain('font-size: 0.6875rem')
  })
})
