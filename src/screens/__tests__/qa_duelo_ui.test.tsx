// @vitest-environment jsdom
// QA fase B: defeitos conhecidos da tela do duelo. `it.fails` = o defeito existe hoje; quando o DEV corrigir, o teste
// passa a "falhar como esperado" e deve ser trocado por `it`.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
const botao = (n: string | RegExp) => screen.getByRole('button', { name: n })

function iniciarTurnoDaIA() {
  vi.useFakeTimers()
  const e = cenario({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } })
  render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={100} onVoltar={() => {}} onNovamente={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
  fireEvent.click(botao(/Usar carta/))
  fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Virada para cima' }))
  fireEvent.click(botao(/Encerrar turno/))
  act(() => {
    vi.advanceTimersByTime(150) // IA no meio da reprodução
  })
}

describe('QA: desistir durante a reprodução do turno da IA', () => {
  // DEFEITO (alta): os timers da reprodução continuam e sobrescrevem o estado "desistido" com passos antigos da IA;
  // a partida volta a ficar em andamento e o resultado nunca aparece.
  it('a desistência confirmada durante o turno da IA permanece e mostra o resultado', () => {
    iniciarTurnoDaIA()
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/Você desistiu do duelo/)).toBeTruthy()
  })
})
