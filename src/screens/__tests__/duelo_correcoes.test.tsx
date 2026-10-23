// @vitest-environment jsdom
// Correções pós-QA da tela do duelo (D1 a D10).
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarOponente } from '../../data/oponentes'
import { aplicarComando } from '../../game'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const botao = (n: string | RegExp) => screen.getByRole('button', { name: n })
const aviso = () => document.querySelector('.duelo-aviso')!.textContent

function montar(cfg: ConfigCenario = {}, atrasoIA = 0) {
  const e = cenario({ humano: { baralho: 20 }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={atrasoIA} onVoltar={() => {}} onNovamente={() => {}} />)
}

function iaEmAndamento() {
  vi.useFakeTimers()
  const r = montar({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } }, 100)
  fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
  fireEvent.click(botao(/Usar carta/))
  fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
  fireEvent.click(botao(/Encerrar turno/))
  act(() => {
    vi.advanceTimersByTime(150)
  })
  return r
}

describe('D1: desistir durante a reprodução do turno da IA', () => {
  it('a desistência vale, cancela os timers e mostra o resultado', () => {
    iaEmAndamento()
    const antes = vi.getTimerCount()
    expect(antes).toBeGreaterThan(0)
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    const d = screen.getByRole('dialog')
    expect(d.textContent).toContain('Derrota')
    expect(d.textContent).toContain('Você desistiu do duelo.')
  })

  it('Esc também abre a confirmação durante a reprodução', () => {
    iaEmAndamento()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })

  it('sair da tela (desmontar) durante a reprodução limpa todos os timers', () => {
    const { unmount } = iaEmAndamento()
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('D2: diálogos prendem e devolvem o foco', () => {
  it('desistir: foco inicial em "Continuar jogando", fundo inert, Tab preso e foco volta ao botão Desistir', () => {
    montar({ humano: { mao: ['CC-003'] } })
    const desistir = botao('Desistir')
    desistir.focus()
    fireEvent.click(desistir)
    const continuar = botao('Continuar jogando')
    expect(document.activeElement).toBe(continuar)
    expect(document.querySelector('.duelo-fundo')!.hasAttribute('inert')).toBe(true)
    // Tab no último volta ao primeiro; Shift+Tab no primeiro vai ao último
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(botao('Confirmar'))
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(continuar)
    fireEvent.click(continuar)
    expect(document.activeElement).toBe(botao('Desistir'))
    expect(document.querySelector('.duelo-fundo')!.hasAttribute('inert')).toBe(false)
  })

  it('aberto por Esc, o foco volta ao botão Desistir ao cancelar', () => {
    montar({ humano: { mao: ['CC-003'] } })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.activeElement).toBe(botao('Desistir'))
  })

  it('resultado: foco no botão JOGAR NOVAMENTE e fundo inert', () => {
    montar({ humano: { mao: ['CC-003'] } })
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    expect(document.activeElement).toBe(botao('Jogar novamente'))
    expect(document.querySelector('.duelo-fundo')!.hasAttribute('inert')).toBe(true)
  })
})

describe('D3: foco depois das ações', () => {
  it('modo de zona leva o foco à primeira zona livre; concluir leva a ENCERRAR TURNO', () => {
    montar({ humano: { mao: ['CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(document.activeElement as HTMLElement)
    expect(document.activeElement).toBe(botao(/Encerrar turno/))
  })

  it('modo de alvo leva o foco ao primeiro alvo válido', () => {
    montar({ humano: { mao: ['CC-077'], campo: ['CC-001', 'CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Zona 1 sua: Manguezal Protegido.*alvo válido/ }))
  })

  it('modo de ataque: foco no primeiro atacante, depois no alvo; ao atacar, de volta ao próximo útil', () => {
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], mao: ['CC-001'] } })
    fireEvent.click(botao(/^Atacar/))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ }))
    fireEvent.click(document.activeElement as HTMLElement)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido.*alvo válido/ }))
    fireEvent.click(document.activeElement as HTMLElement)
    expect(document.activeElement).toBe(botao(/Encerrar turno/))
  })
})

describe('D6/D7: seleção mantida e modo zerado no fim', () => {
  it('DEFENDER em campo mantém a unidade selecionada e permite alternar de volta', () => {
    montar({ humano: { campo: ['CC-003'] }, jogadaFeita: true })
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ }))
    fireEvent.click(botao(/Defender/))
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*em defesa/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(botao(/Defender/))
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*em ataque/ })).toBeTruthy()
  })

  it('ao terminar o duelo o botão não fica em "Cancelar ataque"', () => {
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] } })
    fireEvent.click(botao(/^Atacar/))
    expect(botao(/Cancelar ataque/)).toBeTruthy()
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    expect(document.getElementById('b-atacar')!.textContent).toContain('Atacar')
    expect(document.getElementById('b-atacar')!.textContent).not.toContain('Cancelar')
  })
})

describe('D8 a D11: textos', () => {
  it('terreno sem prefixo duplicado', () => {
    montar({ terreno: { id: 'CC-089', dono: 'humano' } })
    const t = document.querySelector('.duelo-terreno')!.textContent!
    expect(t).toContain('Terreno: Manguezal')
    expect(t).not.toContain('Terreno: Terreno')
  })

  it('subtítulo de ATACAR em português e rodada compreensível', () => {
    montar({})
    expect(botao(/^Atacar/).textContent).toContain('Ataca uma carta do oponente')
    expect(document.querySelector('.duelo-turno__rotulo')!.textContent).toBe('Rodada 2') // turno absoluto 3
  })

  it('log da armadilha com redação correta para os dois lados', () => {
    const e = cenario({ ativo: 'oponente', jogadaFeita: true, fase: 'COMBATE', oponente: { campo: ['CC-003'] }, humano: { suporte: ['CC-099'], campo: ['CC-001'] } })
    const r = aplicarComando(e, { tipo: 'atacar', jogador: 'oponente', atacante: 0, alvo: 0 })
    if (!r.ok) throw new Error(r.erro)
    expect(r.eventos.find((x) => x.tipo === 'armadilha_ativada')!.texto).toMatch(/^Sua armadilha foi ativada: Proteção Emergencial/)
    const e2 = cenario({ jogadaFeita: true, fase: 'COMBATE', humano: { campo: ['CC-003'] }, oponente: { suporte: ['CC-099'], campo: ['CC-001'] } })
    const r2 = aplicarComando(e2, { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 0 })
    if (!r2.ok) throw new Error(r2.erro)
    expect(r2.eventos.find((x) => x.tipo === 'armadilha_ativada')!.texto).toMatch(/^Armadilha do oponente ativada/)
    void aviso
  })
})
