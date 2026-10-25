import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { servicoAuthNaoConfigurado } from '../../auth/servicoAuth'
import type { ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { validarEmail, validarLogin, validarSenha } from '../../auth/validacao'
import type { ErrosLogin } from '../../auth/validacao'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CampoRetro } from '../../components/ui/CampoRetro'
import { IconeCadeado, IconeEspadas, IconeOlho, IconeOndaEmblema, IconePessoaMais } from '../../components/ui/Icones'
import { MolduraPedra } from '../../components/ui/MolduraPedra'

const MENSAGEM_FALHA_INESPERADA = 'Não foi possível entrar agora. Tente novamente em instantes.'

interface Props {
  servicoAuth?: ServicoAuth
  /** Foca o campo de e-mail ao montar (ex.: ao voltar de outra tela). */
  focarAoMontar?: boolean
  /** Aviso inicial (ex.: falha ao reconectar a sessão salva). */
  aviso?: string
  onAutenticado: (usuario: UsuarioAutenticado) => void
  onCriarConta: () => void
  onRecuperarSenha: () => void
}

export function PainelFormulario({ servicoAuth = servicoAuthNaoConfigurado, focarAoMontar = false, aviso, onAutenticado, onCriarConta, onRecuperarSenha }: Props) {
  const idBase = useId()
  const idEmail = `${idBase}-email`
  const idSenha = `${idBase}-senha`
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erros, setErros] = useState<ErrosLogin>({})
  const [tocados, setTocados] = useState({ email: false, senha: false })
  const [erroGeral, setErroGeral] = useState<string | null>(aviso ?? null)
  const [carregando, setCarregando] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const senhaRef = useRef<HTMLInputElement>(null)
  const enviando = useRef(false)
  const montado = useRef(true)

  useEffect(() => {
    if (focarAoMontar) emailRef.current?.focus()
  }, [focarAoMontar])

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const emailValido = tocados.email && validarEmail(email).valido
  const senhaValida = tocados.senha && validarSenha(senha).valido

  function aoSair(campo: 'email' | 'senha') {
    // Campo vazio só é validado no envio: evita inserir erro no blur e perder cliques em outros botões.
    if ((campo === 'email' ? email : senha) === '') return
    setTocados((t) => ({ ...t, [campo]: true }))
    const r = campo === 'email' ? validarEmail(email) : validarSenha(senha)
    setErros((e) => ({ ...e, [campo]: r.valido ? undefined : r.mensagem }))
  }

  function aoDigitar(campo: 'email' | 'senha', valor: string) {
    if (campo === 'email') setEmail(valor)
    else setSenha(valor)
    setErroGeral(null)
    // Limpa o erro do campo assim que ele deixa de ser inválido.
    if (erros[campo]) {
      const r = campo === 'email' ? validarEmail(valor) : validarSenha(valor)
      if (r.valido) setErros((e) => ({ ...e, [campo]: undefined }))
    }
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando.current) return
    setErroGeral(null)
    const novosErros = validarLogin(email, senha)
    setTocados({ email: true, senha: true })
    setErros(novosErros)
    if (novosErros.email) {
      emailRef.current?.focus()
      return
    }
    if (novosErros.senha) {
      senhaRef.current?.focus()
      return
    }
    enviando.current = true
    setCarregando(true)
    try {
      const resultado = await servicoAuth.entrar({ email: email.trim(), senha })
      if (!montado.current) return
      if (resultado.ok) onAutenticado(resultado.usuario)
      else setErroGeral(resultado.mensagem)
    } catch {
      if (montado.current) setErroGeral(MENSAGEM_FALHA_INESPERADA)
    } finally {
      enviando.current = false
      if (montado.current) setCarregando(false)
    }
  }

  return (
    <MolduraPedra as="section" className="painel-form" aria-labelledby={`${idBase}-titulo`}>
      <div className="painel-form__emblema">
        <IconeOndaEmblema />
      </div>
      <h2 id={`${idBase}-titulo`} className="sr-only">
        Entrar na sua conta
      </h2>
      <MolduraPedra variante="interna" className="painel-form__miolo">
        <form onSubmit={aoEnviar} noValidate aria-busy={carregando || undefined}>
          <CampoRetro
            id={idEmail}
            rotulo="E-mail"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            inputRef={emailRef}
            value={email}
            erro={erros.email}
            valido={emailValido}
            onChange={(e) => aoDigitar('email', e.target.value)}
            onBlur={() => aoSair('email')}
            placeholder="nome@exemplo.com"
            required
          />
          <CampoRetro
            id={idSenha}
            rotulo="Senha"
            type={mostrarSenha ? 'text' : 'password'}
            name="senha"
            autoComplete="current-password"
            inputRef={senhaRef}
            value={senha}
            erro={erros.senha}
            valido={senhaValida}
            onChange={(e) => aoDigitar('senha', e.target.value)}
            onBlur={() => aoSair('senha')}
            icone={<IconeCadeado />}
            required
            acao={
              <button
                type="button"
                className="campo__acao"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
              >
                <IconeOlho cortado={mostrarSenha} />
              </button>
            }
          />

          {erroGeral ? (
            <p role="alert" className="painel-form__erro-geral">
              {erroGeral}
            </p>
          ) : null}

          <p className="sr-only" role="status" aria-live="polite">
            {carregando ? 'Entrando...' : ''}
          </p>

          <div className="painel-form__botoes">
            <BotaoRetro type="submit" variante="primario" icone={<IconeEspadas />} ocupado={carregando}>
              {carregando ? 'Entrando…' : 'Entrar'}
            </BotaoRetro>
            <BotaoRetro icone={<IconePessoaMais />} ocupado={carregando} onClick={onCriarConta}>
              Criar conta
            </BotaoRetro>
            <div className="painel-form__link">
              <BotaoRetro variante="link" ocupado={carregando} onClick={onRecuperarSenha}>
                Esqueci a senha
              </BotaoRetro>
            </div>
          </div>
        </form>
      </MolduraPedra>
    </MolduraPedra>
  )
}
