// @vitest-environment jsdom
// QA do tutorial do Guardião do Mangue na UI: partida inteira, desistência, pular no meio, destaque e cena de corrupção.
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

const guia = () => document.querySelector<HTMLElement>('.tutorial-guia')
const alvos = () => document.querySelectorAll('[data-tutorial-alvo]')
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome })
const talvezBotao = (nome: string | RegExp) => screen.queryByRole('button', { name: nome })
const q = (s: string) => document.querySelector<HTMLElement>(s)!

/** Um turno do humano pela UI: baixa a 1ª carta (se puder), ataca com tudo que puder e encerra o turno. */
function turnoPelaUI(passosVistos: string[]) {
  const registrar = () => {
    const p = guia()?.dataset.passo
    if (p && passosVistos[passosVistos.length - 1] !== p) passosVistos.push(p)
    // invariante: destaque só existe com o balão na tela
    if (!guia()) expect(alvos().length).toBe(0)
  }
  registrar()
  const mao = screen.queryAllByRole('button', { name: /^Mão \d/ })
  const vazia = document.querySelector<HTMLElement>('.zona--vazia[data-destino^="zona:humano"]')
  if (mao.length > 0 && vazia) {
    fireEvent.click(mao[0]!)
    registrar()
    fireEvent.click(document.querySelector<HTMLElement>('.zona--vazia[data-destino^="zona:humano"]')!)
    const colocar = talvezBotao('Colocar carta')
    if (colocar) fireEvent.click(colocar)
    registrar()
  }
  for (let z = 0; z < 5; z++) {
    const unidade = document.querySelector<HTMLElement>(`[data-zona-unidade="humano:${z}"] .carta`)
    if (!unidade) continue
    const alvo = document.querySelector<HTMLElement>('[data-zona-unidade^="oponente"] .carta') ?? q('[data-alvo-vida="oponente"]')
    arrastarAtaque(unidade, alvo)
    act(() => {
      vi.advanceTimersByTime(6000) // deixa a cena de confronto terminar
    })
    registrar()
    if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
  }
  const enc = talvezBotao(/Encerrar turno/)
  if (enc) fireEvent.click(enc)
  registrar()
}

describe('QA tutorial UI: partida inteira', () => {
  it('um humano que baixa e ataca vence o tutorial; passos coerentes; cena de corrupção; Jogar novamente reinicia o tutorial', () => {
    vi.useFakeTimers()
    const vitorias = vi.fn()
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVitoriaOponente={vitorias} onVoltar={() => {}} />)
    const vistos: string[] = []
    // passo manual (boas-vindas) não bloqueia: ignoramos o Continuar e jogamos direto
    for (let i = 0; i < 12 && !document.querySelector('[role="dialog"]'); i++) turnoPelaUI(vistos)
    expect(vistos).toEqual(expect.arrayContaining(['boas-vindas', 'posicao', 'atacar', 'defesa-e-direto']))
    expect(screen.getByRole('dialog', { name: 'Algo está errado...' })).toBeTruthy()
    expect(guia()).toBeNull()
    expect(alvos().length).toBe(0)
    expect(vitorias).toHaveBeenCalledTimes(1)
    fireEvent.click(botao('Continuar'))
    expect(vitorias).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Jogar novamente/ })).toBeTruthy()
    expect(alvos().length).toBe(0)
    fireEvent.click(botao(/Jogar novamente/))
    expect(guia()).toBeTruthy()
    expect(guia()!.dataset.passo).toBe('boas-vindas')
    expect(screen.getByLabelText('Vida do oponente: 2000')).toBeTruthy()
    expect(vitorias).toHaveBeenCalledTimes(1)
  })

  it('com atraso real da IA (700 ms) o balão some durante a vez do Guardião e o passo "Vez do Guardião" nunca aparece', () => {
    vi.useFakeTimers()
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={700} onVoltar={() => {}} />)
    fireEvent.click(botao('Continuar'))
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(q('.zona--vazia[data-destino^="zona:humano"]'))
    fireEvent.click(botao('Colocar carta'))
    fireEvent.click(botao('Continuar')) // passo "Ataque ou defesa"
    const vistos: string[] = [guia()!.dataset.passo!]
    fireEvent.click(botao(/Encerrar turno/))
    for (let i = 0; i < 40; i++) {
      act(() => {
        vi.advanceTimersByTime(100)
      })
      const p = guia()?.dataset.passo
      if (p && vistos[vistos.length - 1] !== p) vistos.push(p)
    }
    expect(vistos).toContain('encerrar')
    expect(vistos).toContain('atacar')
    expect(vistos).not.toContain('turno-guardiao')
  })
})

describe('QA tutorial UI: desistir, pular, derrota e destaque', () => {
  it('desistir no tutorial mostra a derrota (sem cena de corrupção) e remove o balão e o destaque', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    fireEvent.click(botao('Continuar')) // destaca a mão
    expect(alvos().length).toBeGreaterThan(0)
    fireEvent.click(botao('Desistir'))
    expect(guia()).toBeNull() // diálogo aberto: balão sai
    expect(alvos().length).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }))
    expect(screen.queryByRole('dialog', { name: 'Algo está errado...' })).toBeNull()
    expect(screen.getByRole('button', { name: /Jogar novamente/ })).toBeTruthy()
    expect(alvos().length).toBe(0)
    expect(guia()).toBeNull()
  })

  it('cancelar a desistência devolve o balão do mesmo passo', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    fireEvent.click(botao('Desistir'))
    expect(guia()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Continuar jogando/ }))
    expect(guia()!.dataset.passo).toBe('boas-vindas')
  })

  it('Pular tutorial no meio: remonta como duelo normal (vida cheia, sem balão/destaque) e não chama onVitoria', () => {
    const vitorias = vi.fn()
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVitoriaOponente={vitorias} onVoltar={() => {}} />)
    fireEvent.click(botao('Continuar'))
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(q('.zona--vazia[data-destino^="zona:humano"]'))
    fireEvent.click(botao('Colocar carta'))
    fireEvent.click(botao(/Encerrar turno/))
    expect(screen.getByLabelText('Vida do oponente: 2000')).toBeTruthy()
    fireEvent.click(botao('Pular tutorial'))
    expect(guia()).toBeNull()
    expect(alvos().length).toBe(0)
    expect(screen.getByLabelText('Vida do oponente: 5000')).toBeTruthy()
    expect(document.querySelectorAll('[data-zona-unidade^="humano"] .carta').length).toBe(0) // partida nova
    expect(vitorias).not.toHaveBeenCalled()
  })

  it('Pular tutorial enquanto a IA joga não é possível (balão oculto) e não deixa timers soltos', () => {
    vi.useFakeTimers()
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={700} onVoltar={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(q('.zona--vazia[data-destino^="zona:humano"]'))
    fireEvent.click(botao('Colocar carta'))
    fireEvent.click(botao(/Encerrar turno/))
    expect(guia()).toBeNull()
    expect(talvezBotao('Pular tutorial')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(guia()).toBeTruthy()
  })

  it('o destaque data-tutorial-alvo some ao trocar de passo e ao desmontar', () => {
    const { unmount } = render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    fireEvent.click(botao('Continuar'))
    expect(alvos().length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(q('.zona--vazia[data-destino^="zona:humano"]'))
    fireEvent.click(botao('Colocar carta'))
    // passo "Ataque ou defesa": destaca a setinha de posição (e não mais a mão)
    expect(q('.duelo-mao__cartas').hasAttribute('data-tutorial-alvo')).toBe(false)
    expect(q('.zona__girar').hasAttribute('data-tutorial-alvo')).toBe(true)
    unmount()
    expect(alvos().length).toBe(0)
  })

  it('balão: não modal, sem aria-modal, texto anunciado como status, fora do fundo inert, botão Pular sempre presente', () => {
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} onVoltar={() => {}} />)
    const g = guia()!
    expect(g.getAttribute('aria-modal')).toBeNull()
    expect(g.closest('[inert]')).toBeNull()
    expect(g.querySelectorAll('[role="status"]').length).toBe(1)
    expect(g.querySelector('[role="status"]')!.getAttribute('aria-live')).toBe('polite')
    expect(talvezBotao('Pular tutorial')).toBeTruthy()
  })
})

describe('QA tutorial UI: resultados e cena de corrupção', () => {
  const montar = (cfg: Parameters<typeof cenario>[0], onVitoria?: () => void) =>
    render(<Partida estadoInicial={cenario(cfg)} oponente={buscarOponente('guardiao-manguezal')!} atrasoIA={0} tutorial={{ onPular: () => {} }} onVitoria={onVitoria} onVoltar={() => {}} onNovamente={() => {}} />)

  it('vitória: cena de corrupção com fundo inert, foco no Continuar, onVitoria uma única vez, resultado depois', () => {
    const onVitoria = vi.fn()
    montar({ turno: 3, fase: 'COMBATE', humano: { baralho: 20, campo: ['CC-043'] }, oponente: { baralho: 20, lp: 500, campo: [] } }, onVitoria)
    arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Saneamento Integrado/ }), screen.getByLabelText('Vida do oponente: 500'))
    const dlg = screen.getByRole('dialog', { name: 'Algo está errado...' })
    expect(dlg.getAttribute('aria-modal')).toBe('true')
    expect(q('.duelo-fundo').hasAttribute('inert')).toBe(true)
    expect(document.activeElement).toBe(botao('Continuar'))
    expect(guia()).toBeNull()
    expect(onVitoria).toHaveBeenCalledTimes(1)
    fireEvent.click(botao('Continuar'))
    expect(onVitoria).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Algo está errado...' })).toBeNull()
  })

  // DEFEITO (baixo/médio): Esc na cena de corrupção chama onVoltar e sai do duelo sem ver o resultado/recompensa.
  it('Esc na cena de corrupção deveria apenas continuar (não sair para o menu)', () => {
    const onVoltar = vi.fn()
    render(<Partida estadoInicial={cenario({ turno: 3, fase: 'COMBATE', humano: { baralho: 20, campo: ['CC-043'] }, oponente: { baralho: 20, lp: 500, campo: [] } })} oponente={buscarOponente('guardiao-manguezal')!} atrasoIA={0} tutorial={{ onPular: () => {} }} onVoltar={onVoltar} onNovamente={() => {}} />)
    arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Saneamento Integrado/ }), screen.getByLabelText('Vida do oponente: 500'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onVoltar).not.toHaveBeenCalled()
  })

  it('derrota por LP/compra no tutorial não mostra a cena de corrupção', () => {
    montar({ turno: 3, fase: 'PRINCIPAL', ativo: 'oponente', humano: { baralho: 0, mao: [], campo: [] }, oponente: { baralho: 10, campo: ['CC-043'] } })
    // humano sem cartas para repor a mão na vez dele: o motor encerra por compra
    expect(screen.queryByRole('dialog', { name: 'Algo está errado...' })).toBeNull()
  })

  it('empate (ambos a zero) no tutorial não mostra a cena de corrupção', () => {
    const e = cenario({ turno: 3, fase: 'COMBATE', humano: { baralho: 20, lp: 500, campo: ['CC-043'] }, oponente: { baralho: 20, lp: 500, campo: ['CC-043'] } })
    render(<Partida estadoInicial={{ ...e, resultado: { vencedor: null, motivo: 'empate_lp' } }} oponente={buscarOponente('guardiao-manguezal')!} atrasoIA={0} tutorial={{ onPular: () => {} }} onVoltar={() => {}} onNovamente={() => {}} />)
    expect(screen.queryByRole('dialog', { name: 'Algo está errado...' })).toBeNull()
    expect(screen.getByRole('button', { name: /Jogar novamente/ })).toBeTruthy()
  })

  it('derrota no tutorial não mostra a cena de corrupção', () => {
    const e = cenario({ turno: 3, fase: 'COMBATE', humano: { baralho: 20, campo: ['CC-043'] }, oponente: { baralho: 20, campo: ['CC-043'] } })
    render(<Partida estadoInicial={{ ...e, resultado: { vencedor: 'oponente', motivo: 'lp' } }} oponente={buscarOponente('guardiao-manguezal')!} atrasoIA={0} tutorial={{ onPular: () => {} }} onVoltar={() => {}} onNovamente={() => {}} />)
    expect(screen.queryByRole('dialog', { name: 'Algo está errado...' })).toBeNull()
    expect(screen.getByRole('button', { name: /Jogar novamente/ })).toBeTruthy()
  })
})

describe('QA tutorial UI: recompensa ao pular o tutorial', () => {
  it('Pular no meio não registra uma segunda partida no servidor nem resgata vitória; só a vitória posterior resgata (uma vez)', async () => {
    const iniciarDuelo = vi.fn().mockResolvedValue({ ok: true, dueloId: 'd1' })
    const resgatarVitoria = vi.fn().mockResolvedValue({ ok: true, colecao: [], carta: null, quantidade: 0 })
    const servico = { iniciarDuelo, resgatarVitoria } as never
    render(<TelaDuelo oponenteId="guardiao-manguezal" seedInicial={1} atrasoIA={0} usuario={{ id: 'u', email: 'a@b.c', colecao: [] }} servicoAuth={servico} onVoltar={() => {}} />)
    await act(async () => {})
    expect(iniciarDuelo).toHaveBeenCalledTimes(1)
    fireEvent.click(botao('Continuar'))
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(q('.zona--vazia[data-destino^="zona:humano"]'))
    fireEvent.click(botao('Colocar carta'))
    fireEvent.click(botao('Pular tutorial'))
    await act(async () => {})
    expect(iniciarDuelo).toHaveBeenCalledTimes(1)
    expect(resgatarVitoria).not.toHaveBeenCalled()
  })
})
