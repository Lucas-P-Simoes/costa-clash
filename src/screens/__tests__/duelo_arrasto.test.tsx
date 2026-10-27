// @vitest-environment jsdom
// Arrastar a carta da mão até o campo (Pointer Events): mesmo caminho do botão USAR CARTA, sem regra duplicada na UI.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'

/** O clique sintetizado depois de um arrasto é engolido uma vez; deixa o ciclo passar para não afetar o teste seguinte. */
const tick = () => new Promise((r) => setTimeout(r, 5))

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  await tick()
  // @ts-expect-error remove o stub
  delete document.elementFromPoint
})

const botao = (n: string | RegExp) => screen.getByRole('button', { name: n })
const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!
const qa = (s: string) => [...document.querySelectorAll<HTMLElement>(s)]

function montar(cfg: ConfigCenario = {}) {
  const e = cenario({ humano: { baralho: 20 }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={0} onVoltar={() => {}} onNovamente={() => {}} />)
}

const mao = (i = 1) => screen.getByRole('button', { name: new RegExp('^Mão ' + i + ':') })
const P = { pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true }

/** Arrasta a carta da mão: pointerdown, move (passando o limiar) e, se `soltarEm !== undefined`, solta sobre o elemento. */
function arrastar(card: Element, sobre: Element | null, soltar = true) {
  document.elementFromPoint = () => sobre
  fireEvent.pointerDown(card, { ...P, clientX: 100, clientY: 500 })
  fireEvent.pointerMove(window, { ...P, clientX: 140, clientY: 420 })
  fireEvent.pointerMove(window, { ...P, clientX: 200, clientY: 300 })
  if (soltar) fireEvent.pointerUp(window, { ...P, clientX: 200, clientY: 300 })
}

const zonaDoJogador = (i: number) => qa('.duelo-lado--voce .duelo-zonas > .zona')[i]
const suporteDoJogador = (i: number) => qa('.duelo-lado--voce .duelo-suportes > .suporte')[i]
const zonaDoOponente = (i: number) => qa('.duelo-lado--oponente .duelo-zonas > .zona')[i]
const aviso = () => q('.duelo-aviso').textContent
const tabuleiro = () => qa('.duelo-zonas .carta, .duelo-suportes .carta').map((c) => c.getAttribute('aria-label')).join('|') + '#' + q('.duelo-terreno').textContent + '#' + qa('.duelo-log li').map((l) => l.textContent).join('|')
const confirmarFaceParaCima = () => fireEvent.click(screen.getByRole('button', { name: 'Virada para cima' }))

describe('Arrastar: unidade para zona livre', () => {
  it('entra na zona solta, com a animação de entrada, e o resultado é igual ao do fluxo por botão', async () => {
    montar({ humano: { mao: ['CC-003', 'CC-077'] } })
    arrastar(mao(1), zonaDoJogador(2))
    await tick()
    confirmarFaceParaCima()
    const carta = q('.duelo-lado--voce .duelo-zonas > .zona:nth-child(3) .carta')
    expect(carta.getAttribute('aria-label')).toMatch(/^Zona 3 sua: Recife de Coral, ATK 1600, DEF 1500, em ataque/)
    expect(carta.className).toContain('carta--fx-entrando')
    const viaArrasto = tabuleiro()
    cleanup()
    await tick()

    montar({ humano: { mao: ['CC-003', 'CC-077'] } })
    fireEvent.click(mao(1))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 3 sua: vazia/ }))
    confirmarFaceParaCima()
    expect(tabuleiro()).toBe(viaArrasto)
  })

  it('respeita a posição pendente (DEFENDER antes de arrastar): entra deitada', async () => {
    montar({ humano: { mao: ['CC-003'] } })
    fireEvent.click(mao(1))
    fireEvent.click(botao(/Defender/)) // entrará em defesa
    arrastar(mao(1), zonaDoJogador(0))
    await tick()
    confirmarFaceParaCima()
    const c = q('.duelo-lado--voce .zona .carta')
    expect(c.getAttribute('aria-label')).toContain('em defesa')
    expect(c.className).toContain('carta--defesa')
  })

  it('ao soltar, não baixa ainda: abre a mesma escolha e aceita virada para baixo', async () => {
    montar({ humano: { mao: ['CC-003'] } })
    arrastar(mao(1), zonaDoJogador(0))
    const dialogo = screen.getByRole('dialog', { name: 'Como colocar a unidade?' })
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(1)
    await tick()
    fireEvent.click(screen.getByRole('button', { name: 'Virada para baixo' }))
    expect(dialogo.isConnected).toBe(false)
    expect(screen.queryAllByRole('button', { name: /^Mão \d/ })).toHaveLength(0)
    expect(document.querySelector('[role="log"]')?.textContent).toContain('virada para baixo em ataque')
  })

  it('durante o arrasto: carta fantasma aria-hidden, original esmaecida e zonas livres destacadas', () => {
    montar({ humano: { mao: ['CC-003'], campo: ['CC-001'] } })
    arrastar(mao(1), zonaDoJogador(1), false)
    const f = q('.duelo-arrasto-fantasma')
    expect(f.getAttribute('aria-hidden')).toBe('true')
    expect(f.textContent).toContain('Recife de Coral')
    expect(mao(1).className).toContain('carta--arrastando')
    const destinos = qa('.zona--drop')
    expect(destinos).toHaveLength(4) // 4 zonas livres; a ocupada não é destino
    destinos.forEach((d) => expect(d.getAttribute('aria-dropeffect')).toBe('move'))
    expect(qa('.duelo-lado--oponente .zona--drop')).toHaveLength(0)
    expect(zonaDoJogador(1).className).toContain('zona--sobre')
    fireEvent.pointerUp(window, { ...P, clientX: 1, clientY: 1 })
  })

  it('zona ocupada: o motor recusa, a mensagem aparece e nada muda', () => {
    montar({ humano: { mao: ['CC-003'], campo: ['CC-001'] } })
    const antes = tabuleiro()
    arrastar(mao(1), zonaDoJogador(0))
    expect(aviso()).not.toBe('')
    expect(q('.duelo-aviso').className).toContain('duelo-aviso--erro')
    expect(tabuleiro()).toBe(antes)
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(1)
    expect(q('.duelo-arrasto-fantasma' as string)).toBeNull()
  })

  it('fora do campo (nenhum destino): cancela com motivo curto e sem alterar o estado', () => {
    montar({ humano: { mao: ['CC-003'] } })
    const antes = tabuleiro()
    arrastar(mao(1), null)
    expect(aviso()).toBe('Solte a unidade em uma zona livre do seu campo.')
    expect(tabuleiro()).toBe(antes)
    expect(mao(1).className).not.toContain('carta--arrastando')
  })
})

describe('Arrastar: outros tipos de carta', () => {
  it('armadilha vai para um suporte livre', () => {
    montar({ humano: { mao: ['CC-093'] } })
    arrastar(mao(1), suporteDoJogador(1))
    expect(screen.getByRole('button', { name: /^Suporte 2 sua: Fiscalização Surpresa/ })).toBeTruthy()
  })

  it('armadilha solta numa zona de unidade: motivo, sem alterar nada', () => {
    montar({ humano: { mao: ['CC-093'] } })
    arrastar(mao(1), zonaDoJogador(0))
    expect(aviso()).toBe('Solte a armadilha em uma zona de suporte livre.')
  })

  it('ação com alvo: soltar sobre a unidade-alvo válida aplica o efeito; igual ao fluxo por botão', async () => {
    const cfg: ConfigCenario = { humano: { mao: ['CC-073'] }, oponente: { campo: ['CC-056'], mao: ['CC-001'] } }
    montar(cfg)
    expect(qa('.zona--drop')).toHaveLength(0)
    arrastar(mao(1), zonaDoOponente(0))
    const viaArrasto = tabuleiro()
    expect(q('.duelo-lado--oponente .zona .carta').getAttribute('aria-label')).toMatch(/Derramamento de Óleo, ATK 1700/)
    cleanup()
    await tick()
    montar(cfg)
    fireEvent.click(mao(1))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 do oponente: Derramamento de Óleo.*alvo válido/ }))
    expect(tabuleiro()).toBe(viaArrasto)
  })

  it('ação com alvo solta sobre unidade que não é alvo: motivo e nada muda', () => {
    montar({ humano: { mao: ['CC-073'], campo: ['CC-001'] }, oponente: { campo: ['CC-056'], mao: ['CC-001'] } })
    arrastar(mao(1), zonaDoJogador(0))
    expect(aviso()).toBe('Solte sobre uma unidade alvo válida (destacada).')
    expect(q('.duelo-lado--oponente .zona .carta').getAttribute('aria-label')).toContain('ATK 2200')
  })

  it('equipamento: soltar sobre a unidade aliada válida escolhe o alvo (suporte automático)', () => {
    montar({ humano: { mao: ['CC-085'], campo: ['CC-001'] } })
    arrastar(mao(1), zonaDoJogador(0))
    expect(q('.duelo-lado--voce .zona .carta').getAttribute('aria-label')).toContain('equipada')
  })

  it('terreno: soltar sobre a faixa de terreno (e destacada durante o arrasto)', () => {
    montar({ humano: { mao: ['CC-089'] } })
    document.elementFromPoint = () => q('.duelo-terreno')
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 160, clientY: 400 })
    expect(q('.duelo-terreno').className).toContain('zona--drop')
    expect(q('.duelo-lado--voce').className).toContain('duelo-lado--drop')
    fireEvent.pointerUp(window, { ...P, clientX: 160, clientY: 400 })
    expect(q('.duelo-terreno').textContent).toContain('Terreno: Manguezal')
  })

  it('ação sem alvo (cura): soltar sobre o próprio campo', () => {
    montar({ humano: { mao: ['CC-079'], lp: 5000 } })
    arrastar(mao(1), q('.duelo-lado--voce'))
    expect(screen.getByLabelText(/^Sua vida: [0-9]+$/).getAttribute('aria-label')).not.toBe('Sua vida: 5000')
  })
})

describe('Arrastar: cancelar, bloqueios e clique', () => {
  it('Esc cancela o arrasto sem abrir a confirmação de desistência', () => {
    montar({ humano: { mao: ['CC-003'] } })
    const antes = tabuleiro()
    arrastar(mao(1), zonaDoJogador(0), false)
    expect(q('.duelo-arrasto-fantasma')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('.duelo-arrasto-fantasma')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(mao(1).className).not.toContain('carta--arrastando')
    // soltar depois do Esc não faz nada
    fireEvent.pointerUp(window, { ...P, clientX: 200, clientY: 300 })
    expect(tabuleiro()).toBe(antes)
  })

  it('bloqueado (jogada da mão já feita): não inicia, mostra o motivo do motor', () => {
    montar({ jogadaFeita: true, humano: { mao: ['CC-003'] } })
    arrastar(mao(1), zonaDoJogador(0), false)
    expect(document.querySelector('.duelo-arrasto-fantasma')).toBeNull()
    expect(aviso()).toBe('Você já fez a jogada da mão neste turno.')
  })

  it('fora da vez (turno do oponente em reprodução): arrasto desabilitado com motivo', () => {
    vi.useFakeTimers()
    const e = cenario({ humano: { mao: ['CC-003', 'CC-004'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } })
    render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={100} onVoltar={() => {}} onNovamente={() => {}} />)
    fireEvent.click(mao(1))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    confirmarFaceParaCima()
    fireEvent.click(botao(/Encerrar turno/))
    arrastar(mao(1), zonaDoJogador(1), false)
    expect(document.querySelector('.duelo-arrasto-fantasma')).toBeNull()
    expect(aviso()).toBe('Aguarde a sua vez.')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
  })

  it('clique simples (sem passar o limiar) ainda seleciona; o clique após um arrasto cancelado não alterna a seleção', () => {
    montar({ humano: { mao: ['CC-003'] } })
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 103, clientY: 502 }) // 3 px: abaixo do limiar
    fireEvent.pointerUp(window, { ...P, clientX: 103, clientY: 502 })
    fireEvent.click(mao(1))
    expect(mao(1).getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('.duelo-arrasto-fantasma')).toBeNull()
    // arrasto solto fora: o clique que vem junto é ignorado e a carta segue selecionada
    arrastar(mao(1), null)
    fireEvent.click(mao(1))
    expect(mao(1).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(mao(1))
    expect(mao(1).getAttribute('aria-pressed')).toBe('false')
  })

  it('alternativa por clique/teclado continua disponível e a dica de arrasto aparece', () => {
    montar({ humano: { mao: ['CC-003'] } })
    expect(q('.duelo-mao__dica').textContent).toBe('Arraste a carta até o campo ou use USAR CARTA')
    expect(mao(1).className).toContain('carta--arrastavel')
    fireEvent.click(mao(1))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    confirmarFaceParaCima()
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ })).toBeTruthy()
  })

  it('desmontar durante o arrasto remove os ouvintes (nada de erro ao soltar depois)', () => {
    const { unmount } = montar({ humano: { mao: ['CC-003'] } })
    arrastar(mao(1), zonaDoJogador(0), false)
    unmount()
    expect(() => fireEvent.pointerUp(window, { ...P, clientX: 1, clientY: 1 })).not.toThrow()
  })
})
