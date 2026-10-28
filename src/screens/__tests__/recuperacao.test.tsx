// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { codigoComFormatoValido, formatarCodigo, normalizarCodigo, validarCodigoRecuperacao } from '../../auth/codigoRecuperacao'
import { textoContatoSuporte } from '../../auth/contatoSuporte'
import type { ResultadoAuth, ResultadoCodigo, ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { servicoAuthNaoConfigurado } from '../../auth/servicoAuth'
import { TelaConta } from '../conta/TelaConta'
import { montarArquivoCodigo } from '../recuperacao/transferencia'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const CODIGO = 'K7M2Q-9XWPD-4NHTR-VBS38'
const usuario: UsuarioAutenticado = { id: 'u1', email: 'ana@exemplo.com', baralho: [], colecao: [], temCodigoRecuperacao: true }
const servico = (extra: Partial<ServicoAuth>): ServicoAuth => ({ entrar: vi.fn(), ...extra })
const botao = (n: string | RegExp) => screen.getByRole('button', { name: n })

describe('formato do código', () => {
  it('normaliza e valida', () => {
    expect(normalizarCodigo(' k7m2q-9xwpd 4nhtr–vbs38 ')).toBe('K7M2Q9XWPD4NHTRVBS38')
    expect(formatarCodigo('k7m2q9xwpd4nhtrvbs38')).toBe(CODIGO)
    expect(codigoComFormatoValido(CODIGO.toLowerCase())).toBe(true)
    expect(codigoComFormatoValido('K7M2Q-9XWPD-4NHTR-VBS3')).toBe(false)
    expect(codigoComFormatoValido('K7M2Q-9XWPD-4NHTR-VBS30')).toBe(false) // 0 não existe no alfabeto
    expect(validarCodigoRecuperacao('').valido).toBe(false)
    expect(validarCodigoRecuperacao(CODIGO).valido).toBe(true)
  })
  it('contato configurável sem inventar dados', () => {
    expect(textoContatoSuporte(undefined)).toMatch(/responsável pelo projeto/)
    expect(textoContatoSuporte(' @fulano ')).toContain('@fulano')
  })
  it('arquivo baixado tem e-mail e código', () => {
    const t = montarArquivoCodigo('a@b.co', CODIGO)
    expect(t).toContain('a@b.co')
    expect(t).toContain(CODIGO)
  })
})

describe('cadastro mostra o código', () => {
  async function cadastrarComCodigo() {
    const cadastrar = vi.fn().mockResolvedValue({ ok: true, usuario, codigoRecuperacao: CODIGO } satisfies ResultadoAuth)
    render(<App servicoAuth={servico({ cadastrar })} />)
    fireEvent.click(botao('Criar conta'))
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: 'senha-longa-1' } })
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha-longa-1' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByLabelText('Seu código de recuperação')
  }

  it('exige o checkbox antes de continuar e só então abre o Duelo Livre; o código sai da tela', async () => {
    await cadastrarComCodigo()
    expect((screen.getByLabelText('Seu código de recuperação') as HTMLInputElement).value).toBe(CODIGO)
    expect(document.body.textContent).toMatch(/mostrado uma única vez/)
    const continuar = botao('Continuar')
    expect(continuar.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(continuar)
    expect(screen.queryByText(/Conectado como/)).toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByLabelText('Seu código de recuperação')).toBeTruthy() // Esc não perde o código
    fireEvent.click(screen.getByLabelText('Guardei meu código'))
    expect(botao('Continuar').getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(botao('Continuar'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(document.body.textContent).not.toContain(CODIGO)
    expect(screen.queryByRole('heading', { level: 1, name: 'Conta' })).toBeNull()
  })

  it('copiar usa a área de transferência e anuncia; sem clipboard mostra plano B honesto', async () => {
    await cadastrarComCodigo()
    const escrever = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true })
    fireEvent.click(botao('Copiar'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Código copiado.'))
    expect(escrever).toHaveBeenCalledWith(CODIGO)
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    fireEvent.click(botao('Copiar'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Não foi possível copiar/))
  })

  it('não guarda o código em localStorage', async () => {
    await cadastrarComCodigo()
    expect(JSON.stringify({ ...localStorage })).not.toContain(CODIGO)
  })

  it('serviço que não devolve código (testes antigos) vai direto ao Duelo Livre', async () => {
    const cadastrar = vi.fn().mockResolvedValue({ ok: true, usuario })
    render(<App servicoAuth={servico({ cadastrar })} />)
    fireEvent.click(botao('Criar conta'))
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: 'senha-longa-1' } })
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha-longa-1' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
  })
})

describe('Esqueci a senha', () => {
  const abrir = (s: ServicoAuth) => {
    render(<App servicoAuth={s} />)
    fireEvent.click(botao('Esqueci a senha'))
  }
  const preencher = (codigo = CODIGO, senha = 'nova-senha-2', conf = senha) => {
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' ana@exemplo.com ' } })
    fireEvent.change(screen.getByLabelText('Código de recuperação'), { target: { value: codigo } })
    fireEvent.change(screen.getByLabelText(/^Nova senha/), { target: { value: senha } })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: conf } })
  }
  const enviar = () => fireEvent.submit(document.querySelector('form')!)

  it('campos com autocomplete correto e validações em português sem chamar o serviço', () => {
    const recuperarSenha = vi.fn()
    abrir(servico({ recuperarSenha }))
    expect(screen.getByLabelText('Código de recuperação').getAttribute('autocomplete')).toBe('off')
    expect(screen.getByLabelText(/^Nova senha/).getAttribute('autocomplete')).toBe('new-password')
    enviar()
    const alertas = screen.getAllByRole('alert').map((a) => a.textContent)
    expect(alertas).toEqual(expect.arrayContaining(['Informe seu e-mail.', 'Informe o código de recuperação.', 'Crie uma senha.']))
    preencher('ABC', 'curta')
    enviar()
    expect(screen.getByText(/20 letras e números/)).toBeTruthy()
    preencher(CODIGO, 'senha-longa-1', 'outra-senha-1')
    enviar()
    expect(screen.getByText('As senhas não coincidem.')).toBeTruthy()
    expect(recuperarSenha).not.toHaveBeenCalled()
  })

  it('sucesso: bloqueia duplo envio, mostra Senha alterada com o NOVO código e volta ao login sem logar', async () => {
    let resolver!: (r: ResultadoCodigo) => void
    const recuperarSenha = vi.fn(() => new Promise<ResultadoCodigo>((r) => (resolver = r)))
    abrir(servico({ recuperarSenha }))
    preencher(CODIGO.toLowerCase().replaceAll('-', ''))
    enviar()
    enviar()
    expect(recuperarSenha).toHaveBeenCalledTimes(1)
    expect(recuperarSenha).toHaveBeenCalledWith({ email: 'ana@exemplo.com', codigo: CODIGO.toLowerCase().replaceAll('-', ''), novaSenha: 'nova-senha-2' })
    expect(screen.getByRole('status').textContent).toBe('Trocando a senha...')
    await act(async () => resolver({ ok: true, codigoRecuperacao: 'ABCDE-FGHJK-MNPQR-STUVW' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Senha alterada' })).toBeTruthy()
    expect((screen.getByLabelText('Seu código de recuperação') as HTMLInputElement).value).toBe('ABCDE-FGHJK-MNPQR-STUVW')
    expect(botao('Ir para o login').getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByLabelText('Guardei meu código'))
    fireEvent.click(botao('Ir para o login'))
    expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeTruthy()
    expect(screen.queryByText(/Conectado como/)).toBeNull()
    expect(document.body.textContent).not.toContain('ABCDE-FGHJK')
  })

  it('erro genérico do servidor aparece em alerta e os campos são mantidos', async () => {
    const recuperarSenha = vi.fn().mockResolvedValue({ ok: false, codigo: 'credenciais_invalidas', mensagem: 'E-mail ou código de recuperação inválidos.' })
    abrir(servico({ recuperarSenha }))
    preencher()
    enviar()
    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou código de recuperação inválidos.')
    expect((screen.getByLabelText(/^Nova senha/) as HTMLInputElement).value).toBe('nova-senha-2')
    await waitFor(() => expect(botao('Trocar senha').getAttribute('aria-disabled')).toBeNull())
  })

  it('serviço não configurado nunca simula sucesso', async () => {
    abrir(servicoAuthNaoConfigurado)
    preencher()
    enviar()
    expect((await screen.findByRole('alert')).textContent).toMatch(/não está disponível/)
    expect(screen.queryByRole('heading', { name: 'Senha alterada' })).toBeNull()
  })

  it('"Não tenho o código" explica a limitação e o contato; sem texto de convidado', () => {
    abrir(servico({}))
    const link = botao('Não tenho o código')
    expect(link.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(link)
    expect(link.getAttribute('aria-expanded')).toBe('true')
    expect(document.body.textContent).toMatch(/não está conectado não consegue recuperar/)
    expect(document.body.textContent).toMatch(/responsável pelo projeto/)
    expect(document.body.textContent).not.toMatch(/convidado/i)
  })
})

describe('Tela Conta preservada sem rota no App: gerar novo código', () => {
  const abrirConta = async (gerarNovoCodigo?: ServicoAuth['gerarNovoCodigo'], u: UsuarioAutenticado = usuario, onSessaoExpirada?: (mensagem: string) => void) => {
    render(
      <TelaConta
        usuario={u}
        servicoAuth={servico({ gerarNovoCodigo })}
        onSair={() => {}}
        onSessaoExpirada={onSessaoExpirada}
      />,
    )
    await screen.findByText('Conectado como ana@exemplo.com')
  }

  it('indicador ativo / ausente', async () => {
    await abrirConta(undefined, { ...usuario, temCodigoRecuperacao: false })
    expect(screen.getByText('não configurado')).toBeTruthy()
    expect(screen.getByRole('note').textContent).toMatch(/ainda não tem código/)
    expect(botao('Gerar código de recuperação')).toBeTruthy()
    cleanup()
    await abrirConta()
    expect(screen.getByText('ativo')).toBeTruthy()
  })

  it('diálogo: foco no campo, foco preso, senha errada mostra erro; senha certa mostra o código uma vez', async () => {
    const gerarNovoCodigo = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, codigo: 'senha_incorreta', mensagem: 'Senha atual incorreta.' })
      .mockResolvedValueOnce({ ok: true, codigoRecuperacao: CODIGO })
    await abrirConta(gerarNovoCodigo)
    fireEvent.click(botao('Gerar novo código de recuperação'))
    const dialogo = screen.getByRole('dialog')
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    const campo = screen.getByLabelText('Senha atual') as HTMLInputElement
    expect(document.activeElement).toBe(campo)
    expect(document.querySelector('main')!.hasAttribute('inert')).toBe(true)
    fireEvent.change(campo, { target: { value: 'errada-errada' } })
    fireEvent.submit(dialogo.querySelector('form')!)
    expect((await screen.findByRole('alert')).textContent).toBe('Senha atual incorreta.')
    fireEvent.change(campo, { target: { value: 'senha-longa-1' } })
    fireEvent.submit(dialogo.querySelector('form')!)
    expect(gerarNovoCodigo).toHaveBeenLastCalledWith({ senhaAtual: 'senha-longa-1' })
    expect(((await screen.findByLabelText('Seu código de recuperação')) as HTMLInputElement).value).toBe(CODIGO)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy() // com o código à mostra, Esc não fecha
    fireEvent.click(screen.getByLabelText('Guardei meu código'))
    fireEvent.click(botao('Concluir'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.textContent).not.toContain(CODIGO)
    expect(document.querySelector('main')!.hasAttribute('inert')).toBe(false)
  })

  it('Esc e Cancelar fecham antes de gerar; sem serviço mostra indisponível', async () => {
    await abrirConta()
    fireEvent.click(botao('Gerar novo código de recuperação'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(botao('Gerar novo código de recuperação'))
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'x' } })
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
    expect((await screen.findByRole('alert')).textContent).toMatch(/não está disponível/)
    fireEvent.click(botao('Cancelar'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ressalvas do QA', () => {
  it('beforeunload avisa enquanto o código não foi guardado e some depois do checkbox', async () => {
    const cadastrar = vi.fn().mockResolvedValue({ ok: true, usuario, codigoRecuperacao: CODIGO })
    render(<App servicoAuth={servico({ cadastrar })} />)
    fireEvent.click(botao('Criar conta'))
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: 'senha-longa-1' } })
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha-longa-1' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByLabelText('Seu código de recuperação')
    const antes = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(antes)
    expect(antes.defaultPrevented).toBe(true)
    fireEvent.click(screen.getByLabelText('Guardei meu código'))
    const depois = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(depois)
    expect(depois.defaultPrevented).toBe(false)
  })

  it('Conta com código: texto honesto; 401 é entregue ao navegador da sessão; campo de usuário oculto', async () => {
    const gerarNovoCodigo = vi.fn().mockResolvedValue({ ok: false, codigo: 'sessao_invalida', mensagem: 'Sua sessão expirou. Entre novamente.' })
    const onSessaoExpirada = vi.fn()
    render(
      <TelaConta
        usuario={usuario}
        servicoAuth={servico({ gerarNovoCodigo })}
        onSair={() => {}}
        onSessaoExpirada={onSessaoExpirada}
      />,
    )
    await screen.findByText('Conectado como ana@exemplo.com')
    expect(screen.getByText('Se você não guardou o código, gere um novo abaixo.')).toBeTruthy()
    fireEvent.click(botao('Gerar novo código de recuperação'))
    const oculto = document.querySelector('input[autocomplete="username"]') as HTMLInputElement
    expect(oculto.value).toBe('ana@exemplo.com')
    expect(oculto.getAttribute('aria-hidden')).toBe('true')
    expect(oculto.readOnly).toBe(true)
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'x' } })
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!)
    await waitFor(() => expect(onSessaoExpirada).toHaveBeenCalledWith('Sua sessão expirou. Entre novamente.'))
  })
})
