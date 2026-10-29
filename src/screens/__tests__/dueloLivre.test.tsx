// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
  it('mostra 17 adversários e o atalho Baralho, com Ressaca selecionada e roving tabindex', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    const cabecalho = screen.getByRole('banner')
    expect(cabecalho.classList.contains('cabecalho--duelo-livre')).toBe(true)
    expect(cabecalho.querySelectorAll('.cabecalho__onda-grande')).toHaveLength(2)
    for (const onda of cabecalho.querySelectorAll('.cabecalho__onda-grande')) expect(onda.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('heading', { level: 2, name: 'Escolha seu adversário' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Adversários' })).toBeTruthy()
    expect(radios()).toHaveLength(17)
    expect(screen.getByRole('button', { name: 'Baralho (em breve)' }).getAttribute('aria-disabled')).toBe('true')
    expect(selecionado().map((r) => r.textContent)).toEqual(['Ressaca'])
    expect(radios().filter((r) => r.tabIndex === 0)).toEqual([radio('Ressaca')])
    expect(within(painel()).getByRole('heading', { level: 2, name: 'Ressaca' })).toBeTruthy()
    expect(within(painel()).getByText('Médio')).toBeTruthy()
    expect(within(painel()).getByText(/Domina cartas de impacto costeiro/)).toBeTruthy()
    expect(within(painel()).getByRole('heading', { level: 3, name: 'Cartas que podem ser obtidas' })).toBeTruthy()
    expect(within(painel()).getByRole('button', { name: 'Ver 25 cartas e chances' }).getAttribute('aria-haspopup')).toBe('dialog')
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
    teclar(radio('Comunidade Caiçara'), 'ArrowDown')
    expect(selecionado()[0].textContent).toBe('Oceano Limpo')
    teclar(radio('Oceano Limpo'), 'ArrowDown') // último adversário: permanece; Baralho é ignorado
    expect(selecionado()[0].textContent).toBe('Oceano Limpo')
    teclar(radio('Oceano Limpo'), 'ArrowUp')
    expect(selecionado()[0].textContent).toBe('Comunidade Caiçara')
    teclar(radio('Comunidade Caiçara'), 'ArrowUp')
    expect(selecionado()[0].textContent).toBe('Restinga')
    teclar(radio('Restinga'), 'ArrowLeft')
    expect(selecionado()[0].textContent).toBe('Urbanização')
  })

  it('Home/End vão ao primeiro/último; limites não ultrapassam a grade', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    teclar(radio('Ressaca'), 'End')
    expect(selecionado()[0].textContent).toBe('Oceano Limpo')
    teclar(radio('Oceano Limpo'), 'ArrowRight')
    expect(selecionado()[0].textContent).toBe('Oceano Limpo')
    teclar(radio('Oceano Limpo'), 'Home')
    expect(selecionado()[0].textContent).toBe('Guardião do Manguezal')
    teclar(radio('Guardião do Manguezal'), 'ArrowLeft')
    teclar(radio('Guardião do Manguezal'), 'ArrowUp')
    expect(selecionado()[0].textContent).toBe('Guardião do Manguezal')
    expect(document.activeElement).toBe(radio('Guardião do Manguezal'))
  })

  it('proximoIndice respeita colunas variáveis (2 no celular) e ignora outras teclas', () => {
    expect(proximoIndice('ArrowDown', 0, 17, 2)).toBe(2)
    expect(proximoIndice('ArrowUp', 1, 17, 2)).toBe(1)
    expect(proximoIndice('ArrowDown', 16, 17, 2)).toBe(16)
    expect(proximoIndice('ArrowUp', 6, 17, 4)).toBe(2)
    expect(proximoIndice('a', 3, 17, 4)).toBeNull()
  })

  it('Enter/Espaço (clique nativo do botão) confirmam a seleção do cartão focado', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    const c = radio('Coral')
    c.focus()
    fireEvent.click(c) // o navegador converte Enter/Espaço em click no botão; o handler é o mesmo
    expect(selecionado()[0].textContent).toBe('Coral')
  })

  it('Baralho é estritamente inerte e não participa da seleção ou da navegação dos adversários', () => {
    const onDuelo = vi.fn()
    render(<TelaDueloLivre onDuelo={onDuelo} onVoltar={() => {}} />)
    fireEvent.click(radio('Oceano Limpo'))
    const atalho = screen.getByRole('button', { name: 'Baralho (em breve)' })
    fireEvent.click(atalho)
    fireEvent.keyDown(atalho, { key: 'Enter' })
    fireEvent.keyDown(atalho, { key: ' ' })
    expect(selecionado().map((r) => r.textContent)).toEqual(['Oceano Limpo'])
    expect(within(painel()).getByRole('heading', { level: 2 }).textContent).toBe('Oceano Limpo')
    expect(within(painel()).getByRole('status').textContent).toBe('')
    expect(onDuelo).not.toHaveBeenCalled()
    teclar(radio('Oceano Limpo'), 'ArrowRight')
    expect(selecionado().map((r) => r.textContent)).toEqual(['Oceano Limpo'])
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

  it('INICIAR DUELO inicia o duelo com o adversário selecionado (sem aviso "Em breve")', () => {
    const onDuelo = vi.fn()
    render(<TelaDueloLivre onDuelo={onDuelo} onVoltar={() => {}} />)
    fireEvent.click(botao('Iniciar duelo'))
    expect(onDuelo).toHaveBeenCalledWith('ressaca')
    fireEvent.click(radio('Porto'))
    fireEvent.click(botao('Iniciar duelo'))
    expect(onDuelo).toHaveBeenLastCalledWith('porto')
    expect(within(painel()).getByRole('status').textContent).toBe('')
    fireEvent.click(radio('Oceano Limpo'))
    fireEvent.click(botao('Iniciar duelo'))
    expect(onDuelo).toHaveBeenLastCalledWith('oceano-limpo')
  })

  it('BARALHO: logado sem dado de baralho e sem usuário mostram "Em breve"', () => {
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
  it('login abre diretamente o Duelo Livre; Esc não sai e o botão SAIR encerra a sessão', async () => {
    const sair = vi.fn().mockResolvedValue(undefined)
    const servico: ServicoAuth = { entrar: vi.fn().mockResolvedValue({ ok: true, usuario }), sair }
    render(<App servicoAuth={servico} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-valida-1' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: 'Conta' })).toBeNull()
    expect(document.querySelector('footer.rodape ul')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' }).parentElement!.querySelectorAll('svg').length).toBe(2)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(sair).not.toHaveBeenCalled()
    fireEvent.click(botao('Sair'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
    expect(sair).toHaveBeenCalledTimes(1)
  })

  it('Duelo Livre direto recebe o perfil e mostra a contagem do baralho', async () => {
    const servico: ServicoAuth = { entrar: vi.fn().mockResolvedValue({ ok: true, usuario }) }
    render(<App servicoAuth={servico} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-valida-1' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    fireEvent.click(botao('Baralho'))
    expect(screen.getByRole('status').textContent).toContain('40 cartas')
    expect(servico.entrar).toHaveBeenCalledTimes(1)
  })
})
