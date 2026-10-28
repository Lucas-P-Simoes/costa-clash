// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { MENSAGEM_AUTH_NAO_CONFIGURADA } from '../../auth/servicoAuth'
import type { ResultadoAuth, ServicoAuth } from '../../auth/servicoAuth'

afterEach(cleanup)

const campoEmail = () => screen.getByLabelText('E-mail') as HTMLInputElement
const campoSenha = () => screen.getByLabelText('Senha') as HTMLInputElement
const botao = (nome: RegExp | string) => screen.getByRole('button', { name: nome })
const preencher = (email: string, senha: string) => {
  fireEvent.change(campoEmail(), { target: { value: email } })
  fireEvent.change(campoSenha(), { target: { value: senha } })
}
const enviar = () => fireEvent.submit(document.querySelector('form')!)

describe('Tela de login', () => {
  it('renderiza títulos, campos e botões esperados', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
    expect(campoEmail()).toBeTruthy()
    expect(campoSenha().type).toBe('password')
    for (const n of ['Entrar', 'Criar conta', 'Esqueci a senha']) expect(botao(n)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /convidado/i })).toBeNull()
    expect(document.body.textContent).not.toMatch(/convidado/i)
    for (const t of ['Aprenda', 'Jogue', 'Proteja']) expect(screen.getByRole('heading', { name: t })).toBeTruthy()
  })

  it('campos vazios: mostra erros, marca aria-invalid/describedby e foca o e-mail', () => {
    render(<App />)
    enviar()
    const alertas = screen.getAllByRole('alert').map((a) => a.textContent)
    expect(alertas).toContain('Informe seu e-mail.')
    expect(alertas).toContain('Informe sua senha.')
    expect(campoEmail().getAttribute('aria-invalid')).toBe('true')
    const id = campoEmail().getAttribute('aria-describedby')!
    expect(document.getElementById(id)?.textContent).toBe('Informe seu e-mail.')
    expect(document.activeElement).toBe(campoEmail())
  })

  it('e-mail inválido mostra mensagem de formato; senha inválida recebe o foco', () => {
    render(<App />)
    preencher('semarroba', 'x')
    enviar()
    expect(screen.getByText(/e-mail válido/)).toBeTruthy()
    expect(document.activeElement).toBe(campoEmail())
    preencher('a@b.co', '')
    enviar()
    expect(document.activeElement).toBe(campoSenha())
    expect(campoSenha().getAttribute('aria-invalid')).toBe('true')
    expect(campoEmail().getAttribute('aria-invalid')).toBeNull()
  })

  it('mostrar/ocultar senha alterna o type e o rótulo', () => {
    render(<App />)
    const alternar = botao('Mostrar senha')
    expect(campoSenha().type).toBe('password')
    fireEvent.click(alternar)
    expect(campoSenha().type).toBe('text')
    expect(alternar.getAttribute('aria-label')).toBe('Ocultar senha')
    fireEvent.click(alternar)
    expect(campoSenha().type).toBe('password')
  })

  it('serviço padrão não configurado mostra erro claro e não autentica', async () => {
    render(<App />)
    preencher('a@b.co', 'segredo')
    enviar()
    const alerta = await screen.findByText(MENSAGEM_AUTH_NAO_CONFIGURADA)
    expect(alerta.getAttribute('role')).toBe('alert')
    expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
    expect(screen.queryByText(/Conectado como/)).toBeNull()
  })

  it('bloqueia envio duplicado durante o carregamento', async () => {
    let resolver!: (r: ResultadoAuth) => void
    const entrar = vi.fn(() => new Promise<ResultadoAuth>((res) => (resolver = res)))
    const servico: ServicoAuth = { entrar }
    render(<App servicoAuth={servico} />)
    preencher('a@b.co', 'segredo')
    enviar()
    enviar()
    fireEvent.click(botao('Entrando…'))
    expect(entrar).toHaveBeenCalledTimes(1)
    expect(botao('Entrando…').getAttribute('aria-disabled')).toBe('true')
    await act(async () => resolver({ ok: false, codigo: 'indisponivel', mensagem: 'Falhou.' }))
    expect(await screen.findByText('Falhou.')).toBeTruthy()
    expect(botao('Entrar').getAttribute('aria-disabled')).toBeNull()
  })

  it('exceção do serviço vira mensagem genérica e libera novo envio', async () => {
    const entrar = vi.fn().mockRejectedValue(new Error('rede'))
    render(<App servicoAuth={{ entrar }} />)
    preencher('a@b.co', 'segredo')
    enviar()
    expect(await screen.findByText(/Não foi possível entrar agora/)).toBeTruthy()
    await waitFor(() => expect(botao('Entrar').getAttribute('aria-disabled')).toBeNull())
  })

  it('envia e-mail sem espaços nas pontas e senha intacta', async () => {
    const entrar = vi.fn().mockResolvedValue({ ok: false, codigo: 'credenciais_invalidas', mensagem: 'x' })
    render(<App servicoAuth={{ entrar }} />)
    preencher('  a@b.co ', ' senha com espaço ')
    enviar()
    await screen.findByText('x')
    expect(entrar).toHaveBeenCalledWith({ email: 'a@b.co', senha: ' senha com espaço ' })
  })
})

describe('Regressões de QA', () => {
  it('blur em campo vazio não insere erro (evita deslocar layout e perder clique)', () => {
    render(<App />)
    fireEvent.focus(campoSenha())
    fireEvent.blur(campoSenha())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(campoSenha().getAttribute('aria-invalid')).toBeNull()
  })

  it('blur com valor inválido ainda mostra o erro, em espaço já reservado', () => {
    render(<App />)
    const reserva = campoEmail().closest('.campo')!.querySelector('.campo__reserva')!
    expect(reserva).toBeTruthy()
    fireEvent.change(campoEmail(), { target: { value: 'abc' } })
    fireEvent.blur(campoEmail())
    expect(reserva.querySelector('[role="alert"]')).toBeTruthy()
  })

  it('carregamento é anunciado em região role=status', async () => {
    let resolver!: (r: ResultadoAuth) => void
    render(<App servicoAuth={{ entrar: () => new Promise<ResultadoAuth>((r) => (resolver = r)) }} />)
    preencher('a@b.co', 'segredo')
    enviar()
    expect((await screen.findByRole('status')).textContent).toBe('Entrando...')
    await act(async () => resolver({ ok: false, codigo: 'indisponivel', mensagem: 'Falhou.' }))
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('carga inicial não rouba o foco', () => {
    render(<App />)
    expect(document.activeElement).not.toBe(campoEmail())
  })
})

describe('Navegação por estado', () => {
  it.each([
    ['Esqueci a senha', 'Recuperar senha', /código de recuperação/],
  ])('%s abre a tela de recuperação e volta ao login', (rotulo, titulo, texto) => {
    render(<App />)
    fireEvent.click(botao(rotulo))
    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeTruthy()
    expect(screen.getByText(texto)).toBeTruthy()
    expect(screen.queryByLabelText('Senha')).toBeNull()
    fireEvent.click(botao('Voltar ao login'))
    expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
    expect(document.activeElement).toBe(campoEmail())
  })

  it('login: o h1 "Login" fica dentro do painel, rotula o formulário e o cabeçalho não tem faixa de título', () => {
    render(<App />)
    const h1 = screen.getByRole('heading', { level: 1, name: 'Login' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const form = document.querySelector('form')!
    expect(h1.closest('.painel-form')).toBeTruthy()
    expect(h1.closest('header')).toBeNull()
    expect(form.getAttribute('aria-labelledby')).toBe(h1.id)
    expect(document.querySelector('header .cabecalho__faixa')).toBeNull()
    expect(document.querySelector('header')!.textContent).toContain('Costa Clash')
    expect(h1.compareDocumentPosition(campoEmail()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(h1.querySelector('svg')).toBeNull()
    const rodape = document.querySelector('footer.rodape')!
    expect(rodape.textContent).toMatch(/Conhecimento também protege os nossos mares/i)
    expect(rodape.querySelector('ul')).toBeNull()
    expect(screen.queryByLabelText('Controles do jogo')).toBeNull()
    for (const t of ['Selecionar', 'Confirmar']) expect(rodape.textContent).not.toContain(t)
  })

  it('outras telas mantêm os ornamentos do título; sem texto de convidado nas telas provisórias', () => {
    render(<App />)
    fireEvent.click(botao('Criar conta'))
    const faixa = screen.getByRole('heading', { level: 1, name: /Criar conta/ }).parentElement!
    expect(faixa.querySelectorAll('svg').length).toBe(2)
    expect(document.querySelector('footer.rodape ul')).toBeNull()
    expect(document.body.textContent).not.toMatch(/convidado/i)
    fireEvent.click(botao('Voltar ao login'))
    fireEvent.click(botao('Esqueci a senha'))
    expect(document.body.textContent).not.toMatch(/convidado/i)
  })

  it('serviço não configurado: mensagem coerente, sem citar convidado', async () => {
    render(<App />)
    preencher('a@b.co', 'segredo')
    enviar()
    expect(await screen.findByText('Login com conta ainda não está disponível.')).toBeTruthy()
  })

  it('Esc volta ao login a partir de uma tela provisória', () => {
    render(<App />)
    fireEvent.click(botao('Esqueci a senha'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
  })

  it('login com serviço que autentica leva direto ao Duelo Livre', async () => {
    const entrar = vi.fn().mockResolvedValue({ ok: true, usuario: { id: '1', email: 'a@b.co' } })
    render(<App servicoAuth={{ entrar }} />)
    preencher('a@b.co', 'segredo')
    enviar()
    expect(await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: 'Conta' })).toBeNull()
  })
})
