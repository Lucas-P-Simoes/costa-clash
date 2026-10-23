// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import type { ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { proximoIndice } from '../../components/ui/navegacaoGrade'
import { OPONENTES } from '../../data/oponentes'
import { TelaDueloLivre } from '../dueloLivre/TelaDueloLivre'

afterEach(cleanup)

const usuario: UsuarioAutenticado = {
  id: 'u1',
  email: 'ana@exemplo.com',
  baralho: Array<string>(40).fill('CC-001'),
  colecao: [{ cartaId: 'CC-001', quantidade: 40 }],
}

const radios = () => screen.getAllByRole('radio') as HTMLButtonElement[]
const radio = (nome: string) => screen.getByRole('radio', { name: nome }) as HTMLButtonElement
const selecionado = () => radios().filter((r) => r.getAttribute('aria-checked') === 'true')
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome })
const painel = () => screen.getByRole('region', { name: 'Detalhes do adversário' })
const teclar = (el: HTMLElement, key: string) => fireEvent.keyDown(el, { key })

describe('Tela Duelo Livre: seleção', () => {
  it('mostra 16 adversários em radiogroup, com Ressaca selecionada e roving tabindex', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Adversários' })).toBeTruthy()
    expect(radios()).toHaveLength(16)
    expect(selecionado().map((r) => r.textContent)).toEqual(['Ressaca'])
    expect(radios().filter((r) => r.tabIndex === 0)).toEqual([radio('Ressaca')])
    expect(within(painel()).getByRole('heading', { level: 2, name: 'Ressaca' })).toBeTruthy()
    expect(within(painel()).getByText('Médio')).toBeTruthy()
    expect(within(painel()).getByText(/Domina cartas de impacto costeiro/)).toBeTruthy()
  })

  it('clique seleciona e atualiza o painel (anúncio fica só no aviso role=status)', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    fireEvent.click(radio('Urbanização'))
    expect(selecionado().map((r) => r.textContent)).toEqual(['Urbanização'])
    expect(radio('Urbanização').tabIndex).toBe(0)
    expect(radio('Ressaca').tabIndex).toBe(-1)
    const h = within(painel()).getByRole('heading', { level: 2 })
    expect(h.textContent).toBe('Urbanização')
    expect(h.closest('[aria-live]')).toBeNull()
    expect(within(painel()).getByText('Difícil')).toBeTruthy()
    expect(within(painel()).getByText(OPONENTES.find((o) => o.id === 'urbanizacao')!.descricao)).toBeTruthy()
    expect(within(painel()).getByRole('img').getAttribute('alt')).toContain('Urbanização')
  })

  it('setas movem foco e seleção na grade de 4 colunas, sem sair dos limites', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    teclar(radio('Ressaca'), 'ArrowRight')
    expect(selecionado()[0].textContent).toBe('Urbanização')
    expect(document.activeElement).toBe(radio('Urbanização'))
    teclar(radio('Urbanização'), 'ArrowRight') // fim da linha: segue para o próximo índice (Restinga)
    expect(selecionado()[0].textContent).toBe('Restinga')
    teclar(radio('Restinga'), 'ArrowDown')
    expect(selecionado()[0].textContent).toBe('Comunidade Caiçara')
    teclar(radio('Comunidade Caiçara'), 'ArrowDown') // última linha: permanece
    expect(selecionado()[0].textContent).toBe('Comunidade Caiçara')
    teclar(radio('Comunidade Caiçara'), 'ArrowUp')
    expect(selecionado()[0].textContent).toBe('Restinga')
    teclar(radio('Restinga'), 'ArrowLeft')
    expect(selecionado()[0].textContent).toBe('Urbanização')
  })

  it('Home/End vão ao primeiro/último; limites não ultrapassam a grade', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    teclar(radio('Ressaca'), 'End')
    expect(selecionado()[0].textContent).toBe('Biodiversidade Costeira')
    teclar(radio('Biodiversidade Costeira'), 'ArrowRight')
    expect(selecionado()[0].textContent).toBe('Biodiversidade Costeira')
    teclar(radio('Biodiversidade Costeira'), 'Home')
    expect(selecionado()[0].textContent).toBe('Guardião do Manguezal')
    teclar(radio('Guardião do Manguezal'), 'ArrowLeft')
    teclar(radio('Guardião do Manguezal'), 'ArrowUp')
    expect(selecionado()[0].textContent).toBe('Guardião do Manguezal')
    expect(document.activeElement).toBe(radio('Guardião do Manguezal'))
  })

  it('proximoIndice respeita colunas variáveis (2 no celular) e ignora outras teclas', () => {
    expect(proximoIndice('ArrowDown', 0, 16, 2)).toBe(2)
    expect(proximoIndice('ArrowUp', 1, 16, 2)).toBe(1)
    expect(proximoIndice('ArrowDown', 15, 16, 2)).toBe(15)
    expect(proximoIndice('ArrowUp', 6, 16, 4)).toBe(2)
    expect(proximoIndice('a', 3, 16, 4)).toBeNull()
  })

  it('Enter/Espaço (clique nativo do botão) confirmam a seleção do cartão focado', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    const c = radio('Coral')
    c.focus()
    fireEvent.click(c) // o navegador converte Enter/Espaço em click no botão; o handler é o mesmo
    expect(selecionado()[0].textContent).toBe('Coral')
  })
})

describe('Tela Duelo Livre: ações', () => {
  it('"Ler mais" expande/recolhe a descrição (aria-expanded) e reinicia ao trocar de adversário', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    const mais = within(painel()).getByRole('button', { name: 'Ler mais' })
    expect(mais.getAttribute('aria-expanded')).toBe('false')
    expect(mais.getAttribute('aria-controls')).toBe(document.querySelector('.painel-oponente__descricao')!.id)
    fireEvent.click(mais)
    expect(within(painel()).getByRole('button', { name: 'Ler menos' }).getAttribute('aria-expanded')).toBe('true')
    expect(painel().hasAttribute('data-expandido')).toBe(true)
    fireEvent.click(radio('Porto'))
    expect(within(painel()).getByRole('button', { name: 'Ler mais' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('aviso repetido é reapresentado (novo nó na região status)', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    fireEvent.click(botao('Baralho'))
    const antes = within(painel()).getByRole('status').firstElementChild
    fireEvent.click(botao('Baralho'))
    const depois = within(painel()).getByRole('status').firstElementChild
    expect(depois).not.toBe(antes)
    expect(depois?.textContent).toBe(antes?.textContent)
  })

  it('DUELO inicia o duelo com o adversário selecionado (sem aviso "Em breve")', () => {
    const onDuelo = vi.fn()
    render(<TelaDueloLivre onDuelo={onDuelo} onVoltar={() => {}} />)
    fireEvent.click(botao('Duelo'))
    expect(onDuelo).toHaveBeenCalledWith('ressaca')
    fireEvent.click(radio('Porto'))
    fireEvent.click(botao('Duelo'))
    expect(onDuelo).toHaveBeenLastCalledWith('porto')
    expect(within(painel()).getByRole('status').textContent).toBe('')
  })

  it('BARALHO: logado sem dado de baralho e convidado mostram "Em breve"', () => {
    const { unmount } = render(<TelaDueloLivre onDuelo={() => {}} usuario={{ id: 'x', email: 'a@b.co' }} onVoltar={() => {}} />)
    fireEvent.click(botao('Baralho'))
    expect(within(painel()).getByRole('status').textContent).toMatch(/^Em breve/)
    unmount()
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    fireEvent.click(botao('Baralho'))
    expect(within(painel()).getByRole('status').textContent).toMatch(/^Em breve.*conta/)
  })

  it('VOLTAR e Esc chamam onVoltar', () => {
    const onVoltar = vi.fn()
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={onVoltar} />)
    fireEvent.click(botao('Voltar'))
    expect(onVoltar).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onVoltar).toHaveBeenCalledTimes(2)
  })
})

describe('Integração com o App', () => {
  it('convidado: abre o Duelo Livre e volta (botão e Esc) para a tela de convidado', () => {
    render(<App servicoAuth={{ entrar: vi.fn() }} />)
    fireEvent.click(botao('Jogar como convidado'))
    fireEvent.click(botao('Duelo livre'))
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    fireEvent.click(botao('Voltar'))
    expect(screen.getByRole('heading', { level: 1, name: 'Convidado' })).toBeTruthy()
    fireEvent.click(botao('Duelo livre'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('heading', { level: 1, name: 'Convidado' })).toBeTruthy()
  })

  it('conta: abre o Duelo Livre, mostra o baralho do perfil e volta ainda logado', async () => {
    const servico: ServicoAuth = { entrar: vi.fn().mockResolvedValue({ ok: true, usuario }) }
    render(<App servicoAuth={servico} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-valida-1' } })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(screen.getByText(/Conectado como ana@exemplo.com/)).toBeTruthy())
    fireEvent.click(botao('Duelo livre'))
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    fireEvent.click(botao('Baralho'))
    expect(screen.getByRole('status').textContent).toContain('40 cartas')
    fireEvent.click(botao('Voltar'))
    expect(screen.getByRole('heading', { level: 1, name: 'Conta' })).toBeTruthy()
    expect(screen.getByText(/Conectado como ana@exemplo.com/)).toBeTruthy()
    expect(servico.entrar).toHaveBeenCalledTimes(1)
  })
})
