// @vitest-environment jsdom
// QA: casos extremos do pop-up de drops do adversário.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UsuarioAutenticado } from '../../auth/servicoAuth'
import { MAX_COPIAS_COLECAO, TABELAS_DROP } from '../../data/dropsOponentes'
import { OPONENTES } from '../../data/oponentes'
import { TelaDueloLivre } from '../dueloLivre/TelaDueloLivre'

afterEach(cleanup)

const abrir = () => {
  const b = screen.getByRole('button', { name: /^Ver \d+ cartas e chances$/ })
  b.focus()
  fireEvent.click(b)
}

describe('QA: pop-up de drops', () => {
  it('todo adversário da grade tem tabela e o botão mostra a contagem correta', () => {
    render(<TelaDueloLivre onDuelo={() => {}} />)
    for (const o of OPONENTES) {
      fireEvent.click(screen.getByRole('radio', { name: o.nome }))
      expect(screen.getByRole('button', { name: `Ver ${TABELAS_DROP[o.id]!.length} cartas e chances` })).toBeTruthy()
    }
  })

  it('logado com todas as cartas completas: todas marcadas "Completa", nenhuma chance em %', () => {
    const tabela = TABELAS_DROP.ressaca!
    const usuario: UsuarioAutenticado = { id: 'u', email: 'a@b.c', colecao: tabela.map(([cartaId]) => ({ cartaId, quantidade: MAX_COPIAS_COLECAO })) }
    render(<TelaDueloLivre usuario={usuario} onDuelo={() => {}} />)
    abrir()
    const itens = within(screen.getByRole('dialog')).getAllByRole('listitem')
    expect(itens).toHaveLength(tabela.length)
    for (const li of itens) expect(li.querySelector('.drops-item__chance')!.textContent).toBe('Completa')
  })

  it('logado sem coleção: chances base e "você tem 0/3"', () => {
    render(<TelaDueloLivre usuario={{ id: 'u', email: 'a@b.c', colecao: [] }} onDuelo={() => {}} />)
    abrir()
    const d = screen.getByRole('dialog')
    expect(within(d).queryByText(/já descontam/)).toBeNull()
    for (const li of within(d).getAllByRole('listitem')) expect(li.textContent).toContain(`você tem 0/${MAX_COPIAS_COLECAO}`)
  })

  // Regressão D2 (QA rodada 1): num navegador real, clicar em texto não focável do pop-up deixa o foco em <body>;
  // o Esc deve fechar só o pop-up, sem cair no atalho global de voltar da tela (useAtalhoVoltar, em window).
  it('Esc com o foco fora do diálogo (body) fecha só o pop-up e não aciona o voltar da tela', () => {
    const onVoltar = vi.fn()
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={onVoltar} />)
    abrir()
    ;(document.activeElement as HTMLElement).blur()
    expect(document.activeElement).toBe(document.body)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onVoltar).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('QA (rodada 2): foco, Tab e Esc depois das correções', () => {
  it('foco inicial em Fechar; Tab alterna Fechar -> lista -> Fechar; Shift+Tab inverso', () => {
    render(<TelaDueloLivre onDuelo={() => {}} />)
    abrir()
    const d = screen.getByRole('dialog')
    const fechar = within(d).getByRole('button', { name: 'Fechar' })
    const lista = d.querySelector('ul.drops-dialogo__lista') as HTMLElement
    expect(document.activeElement).toBe(fechar)
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(lista)
    lista.focus()
    fireEvent.keyDown(lista, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(fechar)
  })

  it('Esc com foco na lista fecha o pop-up, devolve o foco ao botão e não aciona voltar', () => {
    const onVoltar = vi.fn()
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={onVoltar} />)
    abrir()
    const lista = screen.getByRole('dialog').querySelector('ul') as HTMLElement
    lista.focus()
    fireEvent.keyDown(lista, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onVoltar).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Ver \d+ cartas e chances$/ }))
  })

  it('depois de fechar, o listener de captura é removido: Esc volta a acionar o voltar da tela', () => {
    const onVoltar = vi.fn()
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={onVoltar} />)
    abrir()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onVoltar).toHaveBeenCalledTimes(1)
  })

  it('outras teclas não são engolidas pelo listener de captura (Enter/Tab continuam propagando)', () => {
    const espiao = vi.fn()
    window.addEventListener('keydown', espiao)
    try {
      render(<TelaDueloLivre onDuelo={() => {}} />)
      abrir()
      fireEvent.keyDown(document.body, { key: 'Enter' })
      fireEvent.keyDown(document.body, { key: 'a' })
      expect(espiao).toHaveBeenCalledTimes(2)
      expect(screen.getByRole('dialog')).toBeTruthy()
    } finally {
      window.removeEventListener('keydown', espiao)
    }
  })
})
