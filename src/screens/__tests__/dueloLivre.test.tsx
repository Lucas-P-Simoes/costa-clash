// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import type { ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { proximoIndice } from '../../components/ui/navegacaoGrade'
import { BARALHO_INICIAL, colecaoInicial } from '../../data/baralhoInicial'
import { CATALOGO } from '../../data/catalogo'
import { TABELAS_DROP } from '../../data/dropsOponentes'
import { OPONENTES } from '../../data/oponentes'
import { TelaDueloLivre } from '../dueloLivre/TelaDueloLivre'

afterEach(cleanup)

const usuario: UsuarioAutenticado = {
  id: 'u1',
  email: 'ana@exemplo.com',
  baralho: Array<string>(40).fill('CC-101'),
  colecao: [{ cartaId: 'CC-101', quantidade: 40 }],
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
    expect(screen.getByRole('button', { name: 'Coleção de cartas' })).toBeTruthy()
    expect(selecionado().map((r) => r.textContent)).toEqual(['Ressaca'])
    expect(radios().filter((r) => r.tabIndex === 0)).toEqual([radio('Ressaca')])
    expect(within(painel()).getByRole('heading', { level: 2, name: 'Ressaca' })).toBeTruthy()
    expect(within(painel()).getByText('Médio')).toBeTruthy()
    expect(within(painel()).getByText(/Domina cartas de impacto costeiro/)).toBeTruthy()
    expect(within(painel()).getByRole('heading', { level: 3, name: 'Cartas que podem ser obtidas' })).toBeTruthy()
    expect(within(painel()).getByRole('button', { name: `Ver ${TABELAS_DROP.ressaca!.length} cartas e chances` }).getAttribute('aria-haspopup')).toBe('dialog')
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
    teclar(radio('Urbanização'), 'ArrowRight')
    expect(selecionado()[0].textContent).toBe('Porto')
    teclar(radio('Porto'), 'ArrowDown')
    expect(selecionado()[0].textContent).toBe('Espécies Invasoras')
    teclar(radio('Espécies Invasoras'), 'ArrowDown')
    expect(selecionado()[0].textContent).toBe('Bitucas na Areia')
    teclar(radio('Bitucas na Areia'), 'ArrowDown') // sem linha abaixo desta coluna: permanece; Baralho é ignorado
    expect(selecionado()[0].textContent).toBe('Bitucas na Areia')
    teclar(radio('Bitucas na Areia'), 'ArrowUp')
    expect(selecionado()[0].textContent).toBe('Espécies Invasoras')
    teclar(radio('Espécies Invasoras'), 'ArrowUp')
    expect(selecionado()[0].textContent).toBe('Porto')
    teclar(radio('Porto'), 'ArrowLeft')
    expect(selecionado()[0].textContent).toBe('Urbanização')
  })

  it('Home/End vão ao primeiro/último; limites não ultrapassam a grade', () => {
    render(<TelaDueloLivre onDuelo={() => {}} onVoltar={() => {}} />)
    teclar(radio('Ressaca'), 'End')
    expect(selecionado()[0].textContent).toBe('Ser Humano')
    teclar(radio('Ser Humano'), 'ArrowRight')
    expect(selecionado()[0].textContent).toBe('Ser Humano')
    teclar(radio('Ser Humano'), 'Home')
    expect(selecionado()[0].textContent).toBe('Guardião do Mangue')
    teclar(radio('Guardião do Mangue'), 'ArrowLeft')
    teclar(radio('Guardião do Mangue'), 'ArrowUp')
    expect(selecionado()[0].textContent).toBe('Guardião do Mangue')
    expect(document.activeElement).toBe(radio('Guardião do Mangue'))
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
    const c = radio('Maré Vermelha')
    c.focus()
    fireEvent.click(c) // o navegador converte Enter/Espaço em click no botão; o handler é o mesmo
    expect(selecionado()[0].textContent).toBe('Maré Vermelha')
  })

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

  it('INICIAR DUELO inicia o duelo com o adversário selecionado (sem aviso "Em breve")', () => {
    const onDuelo = vi.fn()
    render(<TelaDueloLivre onDuelo={onDuelo} onVoltar={() => {}} />)
    fireEvent.click(botao('Iniciar duelo'))
    expect(onDuelo).toHaveBeenCalledWith('ressaca')
    fireEvent.click(radio('Porto'))
    fireEvent.click(botao('Iniciar duelo'))
    expect(onDuelo).toHaveBeenLastCalledWith('porto')
    expect(within(painel()).getByRole('status').textContent).toBe('')
    fireEvent.click(radio('Ser Humano'))
    fireEvent.click(botao('Iniciar duelo'))
    expect(onDuelo).toHaveBeenLastCalledWith('ser-humano')
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
    expect(screen.getByRole('dialog', { name: 'Baralho' }).textContent).toContain('cartas diferentes')
    expect(servico.entrar).toHaveBeenCalledTimes(1)
  })
})

describe('Bloqueio de adversários por progressão', () => {
  it('só o primeiro fica liberado; bloqueados não são selecionáveis; derrotar libera o seguinte', () => {
    const ids = OPONENTES.map((o) => o.id)
    const { rerender } = render(<TelaDueloLivre onDuelo={() => {}} derrotados={[]} />)
    const radios = () => screen.getAllByRole('radio')
    expect(radios()[0].getAttribute('aria-checked')).toBe('true')
    expect(radios().filter((r) => r.getAttribute('aria-disabled') === 'true')).toHaveLength(ids.length - 1)
    fireEvent.click(radios()[1])
    expect(radios()[0].getAttribute('aria-checked')).toBe('true')
    rerender(<TelaDueloLivre onDuelo={() => {}} derrotados={[ids[0]]} />)
    fireEvent.click(radios()[1])
    expect(radios()[1].getAttribute('aria-checked')).toBe('true')
  })
})

describe('Modal de história do adversário', () => {
  it('clicar abre a história com Duelar, que inicia a partida; bloqueado não abre; Esc fecha', () => {
    const onDuelo = vi.fn()
    render(<TelaDueloLivre onDuelo={onDuelo} derrotados={[OPONENTES[0].id]} />)
    fireEvent.click(radios()[2])
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(radios()[1])
    const dialogo = screen.getByRole('dialog', { name: OPONENTES[1].nome })
    expect(within(dialogo).getAllByText(/./).length).toBeGreaterThan(3)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: OPONENTES[1].nome })).toBeNull()
    fireEvent.click(radios()[1])
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Duelar' }))
    expect(onDuelo).toHaveBeenCalledWith(OPONENTES[1].id)
  })
})

describe('Clique em bloqueado e engrenagem', () => {
  it('bloqueado avisa qual adversário enfrentar e o faz pulsar', () => {
    render(<TelaDueloLivre onDuelo={() => {}} derrotados={[]} />)
    fireEvent.click(radios()[3])
    const balao = within(radios()[0]).getByRole('status')
    expect(balao.textContent).toContain(`liberar ${OPONENTES[3].nome}`)
    expect(radios()[0].getAttribute('data-alerta')).toBe('true')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('engrenagem lista os adversários e Salvar libera só os marcados', () => {
    const onSalvar = vi.fn()
    render(<TelaDueloLivre onDuelo={() => {}} derrotados={[]} liberados={[]} onSalvarLiberados={onSalvar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }))
    const grupo = screen.getByRole('group', { name: 'Desbloquear adversários' })
    expect(within(grupo).getAllByRole('checkbox')).toHaveLength(OPONENTES.length)
    const caixas = within(grupo).getAllByRole('checkbox') as HTMLInputElement[] // mesma ordem de OPONENTES
    expect(caixas[0].disabled).toBe(true)
    fireEvent.click(caixas[3])
    fireEvent.click(within(grupo).getByRole('button', { name: 'Salvar' }))
    expect(onSalvar).toHaveBeenCalledWith([OPONENTES[3].id])
  })

  it('liberado manualmente deixa de ser bloqueado', () => {
    render(<TelaDueloLivre onDuelo={() => {}} derrotados={[]} liberados={[OPONENTES[3].id]} />)
    expect(radios()[3].getAttribute('aria-disabled')).toBeNull()
    expect(radios()[2].getAttribute('aria-disabled')).toBe('true')
  })

  it('o balão aponta para o anterior imediato, mesmo com liberações manuais', () => {
    render(<TelaDueloLivre onDuelo={() => {}} derrotados={[]} liberados={[OPONENTES[2].id, OPONENTES[5].id]} />)
    fireEvent.click(radios()[6])
    expect(within(radios()[5]).getByRole('status').textContent).toContain(`liberar ${OPONENTES[6].nome}`)
    expect(within(radios()[0]).queryByRole('status')).toBeNull()
    fireEvent.click(radios()[4])
    expect(within(radios()[2]).getByRole('status').textContent).toContain(`liberar ${OPONENTES[4].nome}`)
  })
})

describe('Modal Baralho (coleção)', () => {
  it('lista as cartas ganhas com a quantidade; atalho e botão abrem; Esc fecha', () => {
    const u: UsuarioAutenticado = { id: 'u9', email: 'z@x.co', colecao: [{ cartaId: 'CC-101', quantidade: 2 }] }
    render(<TelaDueloLivre onDuelo={() => {}} usuario={u} />)
    fireEvent.click(screen.getByRole('button', { name: 'Coleção de cartas' }))
    const d = screen.getByRole('dialog', { name: 'Baralho' })
    expect(d.textContent).toContain('1 de 70 cartas diferentes')
    expect(within(d).getAllByRole('listitem')).toHaveLength(1)
    expect(d.textContent).toContain('×2')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(botao('Baralho'))
    expect(screen.getByRole('dialog', { name: 'Baralho' })).toBeTruthy()
  })

  it('sem conta convida a entrar; conta sem cartas explica como ganhar', () => {
    const { unmount } = render(<TelaDueloLivre onDuelo={() => {}} />)
    fireEvent.click(botao('Baralho'))
    expect(screen.getByRole('dialog', { name: 'Baralho' }).textContent).toMatch(/Entre com uma conta/)
    unmount()
    render(<TelaDueloLivre onDuelo={() => {}} usuario={{ id: 'u', email: 'a@b.co', colecao: [] }} />)
    fireEvent.click(botao('Baralho'))
    expect(screen.getByRole('dialog', { name: 'Baralho' }).textContent).toMatch(/Vença duelos/)
  })
})

describe('Modal Baralho: montar o baralho', () => {
  const extra = CATALOGO.find((c) => !BARALHO_INICIAL.includes(c.id))!
  const u: UsuarioAutenticado = { id: 'u7', email: 'm@x.co', baralho: [...BARALHO_INICIAL], colecao: [...colecaoInicial(), { cartaId: extra.id, quantidade: 1 }] }
  const abrir = (onSalvar = vi.fn().mockResolvedValue({ ok: true, baralho: [] })) => {
    render(<TelaDueloLivre onDuelo={() => {}} usuario={u} onSalvarBaralho={onSalvar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Coleção de cartas' }))
    return { onSalvar, d: screen.getByRole('dialog', { name: 'Baralho' }) }
  }

  it('mostra duas seções: Minhas cartas e Meu baralho com 40/40', () => {
    const { d } = abrir()
    expect(within(d).getByRole('heading', { level: 3, name: /Minhas cartas/ })).toBeTruthy()
    expect(within(d).getByRole('heading', { level: 3, name: /Meu baralho/ })).toBeTruthy()
    expect(within(d).getByLabelText('40 de 40 cartas no baralho')).toBeTruthy()
  })

  it('trocar uma carta: salvar só habilita com 40; envia as 40 cartas novas', async () => {
    const { d, onSalvar } = abrir()
    const salvar = within(d).getByRole('button', { name: 'Salvar baralho' })
    expect(salvar.getAttribute('aria-disabled')).toBe('true') // sem alterações
    fireEvent.click(within(d).getAllByRole('button', { name: /^Remover .* do baralho$/ })[0])
    expect(within(d).getByLabelText('39 de 40 cartas no baralho')).toBeTruthy()
    expect(salvar.getAttribute('aria-disabled')).toBe('true') // 39
    fireEvent.click(within(d).getByRole('button', { name: `Adicionar ${extra.nome} ao baralho` }))
    expect(within(d).getByLabelText('40 de 40 cartas no baralho')).toBeTruthy()
    expect(salvar.getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(salvar)
    expect(onSalvar).toHaveBeenCalledTimes(1)
    const enviado = onSalvar.mock.calls[0][0] as string[]
    expect(enviado).toHaveLength(40)
    expect(enviado).toContain(extra.id)
    expect(await within(d).findByText(/Baralho salvo/)).toBeTruthy()
  })

  it('não deixa passar de 40 nem usar mais cópias do que possui; Desfazer restaura', () => {
    const { d } = abrir()
    const add = within(d).getByRole('button', { name: `Adicionar ${extra.nome} ao baralho` })
    expect(add.getAttribute('aria-disabled')).toBe('true') // baralho cheio
    fireEvent.click(within(d).getAllByRole('button', { name: /^Remover .* do baralho$/ })[0])
    fireEvent.click(add)
    fireEvent.click(add) // só possui 1 cópia
    expect(within(d).getByLabelText('40 de 40 cartas no baralho')).toBeTruthy()
    fireEvent.click(within(d).getByRole('button', { name: 'Desfazer' }))
    expect(within(d).queryByRole('button', { name: `Remover ${extra.nome} do baralho` })).toBeNull()
  })

  it('erro do servidor aparece sem fechar o modal', async () => {
    const { d } = abrir(vi.fn().mockResolvedValue({ ok: false, codigo: 'dados_invalidos', mensagem: 'Baralho inválido.' }))
    fireEvent.click(within(d).getAllByRole('button', { name: /^Remover .* do baralho$/ })[0])
    fireEvent.click(within(d).getByRole('button', { name: `Adicionar ${extra.nome} ao baralho` }))
    fireEvent.click(within(d).getByRole('button', { name: 'Salvar baralho' }))
    expect(await within(d).findByText('Baralho inválido.')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Baralho' })).toBeTruthy()
  })
})

describe('Modal da carta (Baralho)', () => {
  const extra = CATALOGO.find((c) => !BARALHO_INICIAL.includes(c.id))!
  const u: UsuarioAutenticado = { id: 'u8', email: 'c@x.co', baralho: [...BARALHO_INICIAL], colecao: [...colecaoInicial(), { cartaId: extra.id, quantidade: 1 }] }

  it('clicar numa carta abre o modal com duas abas; a de trás conta a história; Esc fecha só o modal da carta', () => {
    render(<TelaDueloLivre onDuelo={() => {}} usuario={u} onSalvarBaralho={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Coleção de cartas' }))
    fireEvent.click(screen.getByRole('button', { name: `Ver carta ${extra.nome}` }))
    const d = screen.getByRole('dialog', { name: extra.nome })
    const abas = within(d).getAllByRole('tab')
    expect(abas.map((a) => a.textContent)).toEqual(['Carta', 'História'])
    expect(abas[0].getAttribute('aria-selected')).toBe('true')
    expect(within(d).getByRole('tabpanel').textContent).toContain(extra.educacao)
    fireEvent.click(abas[1])
    expect(within(d).getByRole('tabpanel').textContent).toBe(extra.educacao)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: extra.nome })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Baralho' })).toBeTruthy() // o modal Baralho continua aberto
  })

  it('cartas do baralho também abrem o modal; setas trocam de aba', () => {
    render(<TelaDueloLivre onDuelo={() => {}} usuario={u} onSalvarBaralho={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Coleção de cartas' }))
    const nomeDeck = CATALOGO.find((c) => c.id === BARALHO_INICIAL[0])!.nome
    const botoes = screen.getAllByRole('button', { name: `Ver carta ${nomeDeck}` })
    expect(botoes).toHaveLength(2) // coleção e baralho
    fireEvent.click(botoes[1])
    const d = screen.getByRole('dialog', { name: nomeDeck })
    fireEvent.keyDown(within(d).getByRole('tablist'), { key: 'ArrowRight' })
    expect(within(d).getByRole('tab', { name: 'História' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(within(d).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog', { name: nomeDeck })).toBeNull()
  })

  it('baralho vazio vindo do servidor é tratado como o baralho inicial', () => {
    render(<TelaDueloLivre onDuelo={() => {}} usuario={{ ...u, baralho: [] }} onSalvarBaralho={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Coleção de cartas' }))
    expect(screen.getByLabelText('40 de 40 cartas no baralho')).toBeTruthy()
  })
})
