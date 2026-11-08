// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'
import { TelaDuelo } from '../duelo/TelaDuelo'
import { arrastarAtaque } from './ajudanteAtaque'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const guia = () => document.querySelector('.tutorial-guia')
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome })

describe('Tutorial do Guardião do Mangue na tela do duelo', () => {
  it('abre guiado no Guardião: boas-vindas, mão fixa, Guardião com vida reduzida', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    expect(guia()).toBeTruthy()
    expect(screen.getByText('Bem-vindo ao manguezal!')).toBeTruthy()
    expect(screen.getByLabelText('Vida do oponente: 2000')).toBeTruthy()
    expect(screen.getByLabelText('Sua vida: 5000')).toBeTruthy()
    // mão fixa: a primeira carta é Saneamento Integrado
    expect(screen.getByRole('button', { name: /^Mão 1: Saneamento Integrado/ })).toBeTruthy()
  })

  it('Continuar avança para "Baixe uma carta" e destaca a mão; jogar a carta avança sozinho', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    fireEvent.click(botao('Continuar'))
    expect(screen.getByText('Baixe uma carta')).toBeTruthy()
    expect(document.querySelector('.duelo-mao__item:first-child .carta')!.hasAttribute('data-tutorial-alvo')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull() // passo automático
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(botao('Colocar carta'))
    expect(screen.getByText('Ataque ou defesa')).toBeTruthy()
  })

  it('o que deve ser clicado pulsa em vermelho: o Continuar nas boas-vindas e, ao arrastar, as pontas e o dedo animado', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    expect(botao('Continuar').hasAttribute('data-tutorial-alvo')).toBe(true)
    expect(document.querySelector('.tutorial-dedo')).toBeNull()
    fireEvent.click(botao('Continuar'))
    expect(document.querySelector('.tutorial-dedo')).toBeTruthy() // demonstração do arrasto da carta até a zona
    expect(document.querySelector('[data-destino="zona:humano:0"]')!.hasAttribute('data-tutorial-alvo')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(botao('Colocar carta'))
    expect(document.querySelector('.tutorial-dedo')).toBeNull() // passo "Ataque ou defesa": só a setinha pulsa
    expect(document.querySelector('.zona__girar')!.hasAttribute('data-tutorial-alvo')).toBe(true)
  })

  it('balões de fala apontados: "Pegue esta carta" e "Solte aqui" no arrasto; setinha de posição no passo seguinte', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    const baloes = () => [...document.querySelectorAll('.tutorial-balao')].map((b) => b.textContent)
    expect(baloes().join('|')).toMatch(/Sua vida: 5.000 LP.*Minha vida: 2.000 LP|Minha vida: 2.000 LP.*Sua vida: 5.000 LP/)
    fireEvent.click(botao('Continuar'))
    expect(baloes()).toEqual(['1Pegue esta carta', '2Solte aqui'])
    for (const b of document.querySelectorAll('.tutorial-balao')) expect(b.getAttribute('aria-hidden')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(botao('Colocar carta'))
    expect(baloes()).toEqual(['Clique aqui para virar entre ataque e defesa'])
  })

  it('Pular tutorial vira um duelo normal (sem balão, vida cheia, mão embaralhada)', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    fireEvent.click(botao('Pular tutorial'))
    expect(guia()).toBeNull()
    expect(screen.getByLabelText('Vida do oponente: 5000')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(5)
  })

  it('outros oponentes não têm tutorial', () => {
    render(<TelaDuelo oponenteId="ressaca" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    expect(guia()).toBeNull()
    expect(screen.getByLabelText('Vida do oponente: 5000')).toBeTruthy()
  })

  it('o balão não bloqueia o jogo: o botão Encerrar turno continua disponível e o texto é anunciado como status', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    expect(guia()!.querySelector('[role="status"]')).toBeTruthy()
    expect(guia()!.closest('[inert]')).toBeNull()
    act(() => {})
    expect(document.querySelector('#b-encerrar')).toBeTruthy()
  })

  it('vencer o tutorial mostra a cena de corrupção antes do resultado; vencer um duelo normal não mostra', () => {
    const montar = (comTutorial: boolean) => {
      const e = cenario({ turno: 3, fase: 'COMBATE', humano: { baralho: 20, campo: ['CC-043'] }, oponente: { baralho: 20, lp: 500, campo: [] } })
      return render(
        <Partida estadoInicial={e} oponente={buscarOponente('guardiao-manguezal')!} atrasoIA={0} tutorial={comTutorial ? { onPular: () => {} } : undefined} onVoltar={() => {}} onNovamente={() => {}} />,
      )
    }
    montar(true)
    arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Saneamento Integrado/ }), screen.getByLabelText('Vida do oponente: 500'))
    expect(screen.getByRole('dialog', { name: 'Algo está errado...' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Jogar novamente' })).toBeNull()
    fireEvent.click(botao('Continuar'))
    expect(screen.queryByRole('dialog', { name: 'Algo está errado...' })).toBeNull()
    expect(screen.getByRole('button', { name: /Jogar novamente/ })).toBeTruthy()
    cleanup()
    montar(false)
    arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Saneamento Integrado/ }), screen.getByLabelText('Vida do oponente: 500'))
    expect(screen.queryByRole('dialog', { name: 'Algo está errado...' })).toBeNull()
    expect(screen.getByRole('button', { name: /Jogar novamente/ })).toBeTruthy()
  })
})
