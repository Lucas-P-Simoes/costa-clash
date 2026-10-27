// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'

const elementFromPointOriginal = document.elementFromPoint

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: elementFromPointOriginal })
})

function montar(cfg: ConfigCenario = {}, atrasoIA = 0) {
  const estado = cenario({ humano: { baralho: 20 }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={estado} oponente={buscarOponente('ressaca')!} atrasoIA={atrasoIA} onVoltar={() => {}} onNovamente={() => {}} />)
}

function apontarPara(alvo: Element) {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => alvo })
}

function iniciar(atacante: Element, pointerType = 'mouse') {
  fireEvent.pointerDown(atacante, { pointerId: 73, pointerType, button: 0, isPrimary: true, clientX: 10, clientY: 10 })
}

function mover(pointerType = 'mouse') {
  fireEvent.pointerMove(window, { pointerId: 73, pointerType, isPrimary: true, clientX: 90, clientY: 80 })
}

function soltar(pointerType = 'mouse') {
  fireEvent.pointerUp(window, { pointerId: 73, pointerType, isPrimary: true, clientX: 90, clientY: 80 })
}

describe('ataque por seta', () => {
  it('remove o botão ATACAR, pulsa atacantes disponíveis e resolve ao soltar num alvo válido', () => {
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'] } })
    expect(document.getElementById('b-atacar')).toBeNull()
    const atacante = screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ })
    const alvo = screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido/ })
    expect(atacante.className).toContain('carta--valida')
    iniciar(atacante)
    expect(document.querySelector('.duelo-seta-ataque--humano')).toBeTruthy()
    expect(alvo.closest('.zona')?.className).toContain('duelo-alvo-ataque--valido')
    apontarPara(alvo)
    mover()
    expect(alvo.closest('.zona')?.className).toContain('duelo-alvo-ataque--sobre')
    soltar()
    expect(document.querySelector('.duelo-seta-ataque')).toBeNull()
    expect(screen.getByLabelText('Vida do oponente: 7600')).toBeTruthy()
  })

  it('soltar fora de alvo cancela sem alterar vida/campo; Escape também cancela', () => {
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'] } })
    const atacante = screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ })
    apontarPara(document.body)
    iniciar(atacante)
    mover()
    soltar()
    expect(screen.getByLabelText('Vida do oponente: 8000')).toBeTruthy()
    expect(document.querySelector('.duelo-aviso')?.textContent).toContain('Ataque cancelado')
    expect(screen.getByText('Fase: Principal')).toBeTruthy()
    iniciar(atacante)
    expect(document.querySelector('.duelo-seta-ataque')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('.duelo-seta-ataque')).toBeNull()
    expect(screen.getByLabelText('Vida do oponente: 8000')).toBeTruthy()
  })

  it('funciona por toque e permite direcionar aos pontos de vida quando o ataque direto é legal', () => {
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] } })
    const atacante = screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ })
    const vida = screen.getByLabelText('Vida do oponente: 8000')
    apontarPara(vida)
    iniciar(atacante, 'touch')
    mover('touch')
    expect(vida.className).toContain('duelo-vida--alvo-ataque')
    soltar('touch')
    expect(screen.getByLabelText('Vida do oponente: 6400')).toBeTruthy()
  })

  it('não inicia fora do turno, em defesa ou com unidade que já atacou', () => {
    montar({ ativo: 'oponente', jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'] } })
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ }).className).not.toContain('carta--arrastavel')
    cleanup()
    montar({ fase: 'COMBATE', jogadaFeita: true, humano: { campo: [{ id: 'CC-003', pos: 'DEFESA' }, { id: 'CC-001', atacou: true }] } })
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ }).className).not.toContain('carta--arrastavel')
    expect(screen.getByRole('button', { name: /Zona 2 sua: Manguezal Protegido/ }).className).not.toContain('carta--arrastavel')
  })

  it('mostra a seta automática e os destaques antes de executar o ataque da IA', () => {
    vi.useFakeTimers()
    montar(
      {
        jogadaFeita: true,
        humano: { campo: ['CC-001'], baralho: 20 },
        oponente: { campo: ['CC-071'], mao: ['CC-093', 'CC-094', 'CC-095', 'CC-096', 'CC-099'], baralho: 20 },
      },
      100,
    )
    fireEvent.click(screen.getByRole('button', { name: /Encerrar turno/ }))
    let apareceu = false
    for (let i = 0; i < 80 && !apareceu; i++) {
      act(() => vi.advanceTimersByTime(25))
      apareceu = !!document.querySelector('.duelo-seta-ataque--oponente')
    }
    expect(apareceu).toBe(true)
    expect(document.querySelector('.duelo-atacante-ia')).toBeTruthy()
    expect(document.querySelector('.duelo-alvo-ataque--ia')).toBeTruthy()
    act(() => vi.runAllTimers())
    expect(document.querySelector('.duelo-seta-ataque')).toBeNull()
  })

  it('QA: não pode aplicar o gesto antigo depois que outro comando avançou o turno', () => {
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'] } })
    const atacante = screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ })
    const alvoAntigo = screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido/ })

    iniciar(atacante)
    fireEvent.click(screen.getByRole('button', { name: /Encerrar turno/ }))
    apontarPara(alvoAntigo)
    mover()
    soltar()

    // Encerrar o turno já consumiu a vez humana. Um pointerup atrasado não pode
    // restaurar a fotografia anterior nem executar um ataque daquele turno.
    expect(screen.getByLabelText(/Vida do oponente:/).getAttribute('aria-label')).toBe('Vida do oponente: 8000')
  })
})
