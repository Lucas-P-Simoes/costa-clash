// @vitest-environment jsdom
// Pop-up "Cartas que podem ser obtidas": lista do drop do adversário com as chances.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UsuarioAutenticado } from '../../auth/servicoAuth'
import { CATALOGO } from '../../data/catalogo'
import { MAX_COPIAS_COLECAO, TABELAS_DROP } from '../../data/dropsOponentes'
import { TelaDueloLivre } from '../dueloLivre/TelaDueloLivre'

afterEach(cleanup)

const nome = (id: string) => CATALOGO.find((c) => c.id === id)!.nome
const abrir = (n = 25) => {
  const b = screen.getByRole('button', { name: `Ver ${n} cartas e chances` })
  b.focus() // num navegador real o clique foca o botão
  fireEvent.click(b)
}
const dialogo = () => screen.getByRole('dialog', { name: /^Cartas de / })
const itens = () => within(dialogo()).getAllByRole('listitem')

describe('Pop-up de drops do adversário', () => {
  it('lista todas as cartas da tabela, da maior para a menor chance, com o percentual', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    abrir()
    expect(dialogo().getAttribute('aria-modal')).toBe('true')
    expect(within(dialogo()).getByRole('heading', { name: 'Cartas de Ressaca' })).toBeTruthy()
    const tabela = TABELAS_DROP.ressaca!
    expect(itens()).toHaveLength(tabela.length)
    const chances = itens().map((li) => Number(li.querySelector('.drops-item__chance')!.textContent!.replace('%', '').replace(',', '.')))
    expect(chances).toEqual([...chances].sort((a, b) => b - a))
    expect(chances.reduce((a, b) => a + b, 0)).toBeCloseTo(100)
    const [id, p] = tabela[0]!
    const linha = itens().find((li) => li.textContent!.includes(nome(id)))!
    expect(linha.textContent).toContain(`${p}%`)
    // O fundo fica inerte e o foco vai para Fechar.
    expect(document.querySelector('main')!.hasAttribute('inert')).toBe(true)
    expect(document.activeElement!.textContent).toBe('Fechar')
  })

  it('acompanha o adversário selecionado', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Porto' }))
    abrir(TABELAS_DROP.porto!.length)
    expect(within(dialogo()).getByRole('heading', { name: 'Cartas de Porto' })).toBeTruthy()
    expect(itens()).toHaveLength(TABELAS_DROP.porto!.length)
  })

  it('Fechar, Esc e clique fora fecham sem acionar o voltar da tela; o foco volta ao botão', () => {
    const onVoltar = vi.fn()
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={onVoltar} />)
    abrir()
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement!.textContent).toBe('Ver 25 cartas e chances')
    abrir()
    fireEvent.keyDown(within(dialogo()).getByRole('button', { name: 'Fechar' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onVoltar).not.toHaveBeenCalled()
    abrir()
    fireEvent.click(document.querySelector('.drops-overlay')!)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.querySelector('main')!.hasAttribute('inert')).toBe(false)
  })

  it('logado: mostra as cópias, marca as completas e renormaliza as chances das demais', () => {
    const tabela = TABELAS_DROP.ressaca!
    const [completa] = tabela[0]!
    const [parcial] = tabela[1]!
    const usuario: UsuarioAutenticado = {
      id: 'u1',
      email: 'a@b.c',
      colecao: [
        { cartaId: completa, quantidade: MAX_COPIAS_COLECAO },
        { cartaId: parcial, quantidade: 1 },
      ],
    }
    render(<TelaDueloLivre usuario={usuario} onDuelo={() => {}} />)
    abrir()
    expect(within(dialogo()).getByText(/já descontam as cartas que você completou/)).toBeTruthy()
    const li = (id: string) => itens().find((x) => x.textContent!.includes(nome(id)))!
    expect(li(completa).textContent).toContain('Completa')
    expect(li(completa).textContent).toContain(`você tem ${MAX_COPIAS_COLECAO}/${MAX_COPIAS_COLECAO}`)
    expect(li(parcial).textContent).toContain('você tem 1/3')
    const total = itens()
      .map((x) => x.querySelector('.drops-item__chance')!.textContent!)
      .filter((t) => t.endsWith('%'))
      .reduce((s, t) => s + Number(t.replace('%', '').replace(',', '.')), 0)
    expect(total).toBeGreaterThan(99.5)
    expect(total).toBeLessThan(100.5)
  })
})
