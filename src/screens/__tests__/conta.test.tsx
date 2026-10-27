// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { MENSAGEM_CADASTRO_NAO_CONFIGURADO } from '../../auth/servicoAuth'
import type { ResultadoAuth, ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'

afterEach(cleanup)

const usuario: UsuarioAutenticado = {
  id: 'u1',
  email: 'ana@exemplo.com',
  baralho: Array<string>(40).fill('CC-001'),
  colecao: [
    { cartaId: 'CC-001', quantidade: 25 },
    { cartaId: 'CC-002', quantidade: 15 },
  ],
}

const entrarCriarConta = () => fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
const email = () => screen.getByLabelText('E-mail') as HTMLInputElement
const senha = () => screen.getByLabelText(/^Senha/) as HTMLInputElement
const confirmacao = () => screen.getByLabelText('Confirmar senha') as HTMLInputElement
const preencher = (e: string, s: string, c: string) => {
  fireEvent.change(email(), { target: { value: e } })
  fireEvent.change(senha(), { target: { value: s } })
  fireEvent.change(confirmacao(), { target: { value: c } })
}
const enviar = () => fireEvent.submit(document.querySelector('form')!)
const servicoCom = (extra: Partial<ServicoAuth>): ServicoAuth => ({ entrar: vi.fn(), ...extra })

describe('Tela de criar conta', () => {
  it('renderiza campos, título e foca o e-mail', () => {
    render(<App servicoAuth={servicoCom({})} />)
    entrarCriarConta()
    expect(screen.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeTruthy()
    expect(senha().type).toBe('password')
    expect(document.activeElement).toBe(email())
  })

  it('campos vazios: mostra os três erros e foca o primeiro', () => {
    render(<App servicoAuth={servicoCom({})} />)
    entrarCriarConta()
    enviar()
    const alertas = screen.getAllByRole('alert').map((a) => a.textContent)
    expect(alertas).toEqual(expect.arrayContaining(['Informe seu e-mail.', 'Crie uma senha.', 'Repita a senha para confirmar.']))
    expect(email().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(email())
  })

  it('senha curta e confirmação diferente não chamam o serviço', () => {
    const cadastrar = vi.fn()
    render(<App servicoAuth={servicoCom({ cadastrar })} />)
    entrarCriarConta()
    preencher('a@b.co', 'curta', 'curta')
    enviar()
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeTruthy()
    expect(document.activeElement).toBe(senha())
    preencher('a@b.co', 'senha-longa-1', 'senha-longa-2')
    enviar()
    expect(screen.getByText('As senhas não coincidem.')).toBeTruthy()
    expect(document.activeElement).toBe(confirmacao())
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('mostrar/ocultar alterna as duas senhas', () => {
    render(<App servicoAuth={servicoCom({})} />)
    entrarCriarConta()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senhas' }))
    expect(senha().type).toBe('text')
    expect(confirmacao().type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senhas' }))
    expect(senha().type).toBe('password')
  })

  it('serviço não configurado: erro claro, sem sucesso simulado', async () => {
    render(<App />)
    entrarCriarConta()
    preencher('a@b.co', 'senha-longa-1', 'senha-longa-1')
    enviar()
    expect((await screen.findByText(MENSAGEM_CADASTRO_NAO_CONFIGURADO)).getAttribute('role')).toBe('alert')
    expect(screen.queryByText(/Conectado como/)).toBeNull()
  })

  it('serviço sem método cadastrar também é tratado como não configurado', async () => {
    render(<App servicoAuth={servicoCom({})} />)
    entrarCriarConta()
    preencher('a@b.co', 'senha-longa-1', 'senha-longa-1')
    enviar()
    expect(await screen.findByText(MENSAGEM_CADASTRO_NAO_CONFIGURADO)).toBeTruthy()
  })

  it('bloqueia envio duplicado e anuncia o carregamento; sucesso entra logado', async () => {
    let resolver!: (r: ResultadoAuth) => void
    const cadastrar = vi.fn(() => new Promise<ResultadoAuth>((r) => (resolver = r)))
    render(<App servicoAuth={servicoCom({ cadastrar })} />)
    entrarCriarConta()
    preencher(' ana@exemplo.com ', 'senha-longa-1', 'senha-longa-1')
    enviar()
    enviar()
    fireEvent.click(screen.getByRole('button', { name: 'Criando…' }))
    expect(cadastrar).toHaveBeenCalledTimes(1)
    expect(cadastrar).toHaveBeenCalledWith({ email: 'ana@exemplo.com', senha: 'senha-longa-1' })
    expect(screen.getByRole('status').textContent).toBe('Criando conta...')
    await act(async () => resolver({ ok: true, usuario }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: 'Conta' })).toBeNull()
  })

  it('e-mail já usado aparece no campo; erro inesperado aparece em alerta', async () => {
    const cadastrar = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, codigo: 'email_em_uso', mensagem: 'Este e-mail já está cadastrado.' })
      .mockRejectedValueOnce(new Error('rede'))
    render(<App servicoAuth={servicoCom({ cadastrar })} />)
    entrarCriarConta()
    preencher('a@b.co', 'senha-longa-1', 'senha-longa-1')
    enviar()
    expect(await screen.findByText('Este e-mail já está cadastrado.')).toBeTruthy()
    expect(email().getAttribute('aria-invalid')).toBe('true')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Criar conta' }).getAttribute('aria-disabled')).toBeNull())
    enviar()
    expect(await screen.findByText(/Não foi possível criar a conta/)).toBeTruthy()
  })

  it('voltar leva ao login', () => {
    render(<App servicoAuth={servicoCom({})} />)
    entrarCriarConta()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao login' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
  })
})

describe('Navegação autenticada, restauração de sessão e logout', () => {
  it('login abre diretamente o Duelo Livre e mantém o baralho do perfil', async () => {
    const entrar = vi.fn().mockResolvedValue({ ok: true, usuario })
    render(<App servicoAuth={{ entrar }} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-longa-1' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: 'Conta' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Baralho' }))
    expect(screen.getByRole('status').textContent).toContain('40 cartas')
  })

  it('com sessão salva mostra carregamento (sem login) e restaura direto no Duelo Livre', async () => {
    let resolver!: (r: ResultadoAuth) => void
    const servico = servicoCom({
      temSessaoSalva: () => true,
      restaurarSessao: () => new Promise<ResultadoAuth>((r) => (resolver = r)),
    })
    render(<App servicoAuth={servico} />)
    expect(screen.getByRole('status').textContent).toMatch(/Carregando sua sessão/)
    expect(screen.queryByLabelText('Senha')).toBeNull()
    await act(async () => resolver({ ok: true, usuario }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: 'Conta' })).toBeNull()
  })

  it('se a restauração falhar, volta ao login', async () => {
    const servico = servicoCom({
      temSessaoSalva: () => true,
      restaurarSessao: () => Promise.resolve({ ok: false, codigo: 'sessao_invalida', mensagem: 'x' }),
    })
    render(<App servicoAuth={servico} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
  })

  it('falha de rede na restauração mostra aviso amigável no login', async () => {
    const servico = servicoCom({
      temSessaoSalva: () => true,
      restaurarSessao: () => Promise.resolve({ ok: false, codigo: 'indisponivel', mensagem: 'rede' }),
    })
    render(<App servicoAuth={servico} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Não foi possível reconectar à sua conta; tente novamente.')
  })

  it('sessão inválida (401) volta ao login sem aviso', async () => {
    const servico = servicoCom({
      temSessaoSalva: () => true,
      restaurarSessao: () => Promise.resolve({ ok: false, codigo: 'sessao_invalida', mensagem: 'x' }),
    })
    render(<App servicoAuth={servico} />)
    await screen.findByRole('heading', { level: 1, name: 'Login' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('se a restauração lançar exceção, volta ao login', async () => {
    const servico = servicoCom({ temSessaoSalva: () => true, restaurarSessao: () => Promise.reject(new Error('x')) })
    render(<App servicoAuth={servico} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
  })

  it('SAIR chama o logout do serviço e volta ao login', async () => {
    const sair = vi.fn().mockResolvedValue(undefined)
    const servico = servicoCom({ temSessaoSalva: () => true, restaurarSessao: () => Promise.resolve({ ok: true, usuario }), sair })
    render(<App servicoAuth={servico} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
    expect(sair).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeNull()
  })

  it('SAIR volta ao login mesmo se o logout falhar', async () => {
    const servico = servicoCom({
      temSessaoSalva: () => true,
      restaurarSessao: () => Promise.resolve({ ok: true, usuario }),
      sair: () => Promise.reject(new Error('offline')),
    })
    render(<App servicoAuth={servico} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
  })

  it('Esc no Duelo Livre autenticado não encerra a sessão silenciosamente', async () => {
    const sair = vi.fn().mockResolvedValue(undefined)
    const servico = servicoCom({ temSessaoSalva: () => true, restaurarSessao: () => Promise.resolve({ ok: true, usuario }), sair })
    render(<App servicoAuth={servico} />)
    await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(sair).not.toHaveBeenCalled()
  })
})
