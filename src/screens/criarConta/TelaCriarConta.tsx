import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MENSAGEM_CADASTRO_NAO_CONFIGURADO } from '../../auth/servicoAuth'
import type { ResultadoAuth, ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { validarCadastro, validarConfirmacao, validarEmail, validarSenhaNova } from '../../auth/validacao'
import type { ErrosCadastro } from '../../auth/validacao'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { CampoRetro } from '../../components/ui/CampoRetro'
import { IconeCadeado, IconeOlho, IconePessoaMais, IconeVoltar } from '../../components/ui/Icones'
import { MolduraPedra } from '../../components/ui/MolduraPedra'
import { RodapeControles } from '../../components/ui/RodapeControles'
import { useAtalhoVoltar } from '../../components/ui/useAtalhoVoltar'
import '../telaSimples.css'
import './criarConta.css'

const MENSAGEM_FALHA_INESPERADA = 'Não foi possível criar a conta agora. Tente novamente em instantes.'

interface Props {
  servicoAuth: ServicoAuth
  onAutenticado: (usuario: UsuarioAutenticado) => void
  onVoltar: () => void
}

type Campo = 'email' | 'senha' | 'confirmacao'

function validarCampo(campo: Campo, v: { email: string; senha: string; confirmacao: string }) {
  if (campo === 'email') return validarEmail(v.email)
  if (campo === 'senha') return validarSenhaNova(v.senha)
  return validarConfirmacao(v.senha, v.confirmacao)
}

export function TelaCriarConta({ servicoAuth, onAutenticado, onVoltar }: Props) {
  const idBase = useId()
  const [valores, setValores] = useState({ email: '', senha: '', confirmacao: '' })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erros, setErros] = useState<ErrosCadastro>({})
  const [tocados, setTocados] = useState({ email: false, senha: false, confirmacao: false })
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const refs = {
    email: useRef<HTMLInputElement>(null),
    senha: useRef<HTMLInputElement>(null),
    confirmacao: useRef<HTMLInputElement>(null),
  }
  const enviando = useRef(false)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    refs.email.current?.focus()
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Esc volta, exceto enquanto o cadastro está em andamento.
  const voltar = useCallback(() => {
    if (!enviando.current) onVoltar()
  }, [onVoltar])
  useAtalhoVoltar(voltar)

  const ok = (campo: Campo) => tocados[campo] && validarCampo(campo, valores).valido

  function aoSair(campo: Campo) {
    if (valores[campo] === '') return
    setTocados((t) => ({ ...t, [campo]: true }))
    const r = validarCampo(campo, valores)
    setErros((e) => ({ ...e, [campo]: r.valido ? undefined : r.mensagem }))
  }

  function aoDigitar(campo: Campo, valor: string) {
    const novos = { ...valores, [campo]: valor }
    setValores(novos)
    setErroGeral(null)
    // Limpa erros que deixam de valer; a confirmação depende da senha.
    setErros((e) => {
      const prox = { ...e }
      for (const c of ['email', 'senha', 'confirmacao'] as const) {
        if (prox[c] && validarCampo(c, novos).valido) prox[c] = undefined
      }
      return prox
    })
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando.current) return
    setErroGeral(null)
    const novos = validarCadastro(valores.email, valores.senha, valores.confirmacao)
    setTocados({ email: true, senha: true, confirmacao: true })
    setErros(novos)
    const primeiro = (['email', 'senha', 'confirmacao'] as const).find((c) => novos[c])
    if (primeiro) {
      refs[primeiro].current?.focus()
      return
    }
    enviando.current = true
    setCarregando(true)
    try {
      const cadastrar = servicoAuth.cadastrar?.bind(servicoAuth)
      const resultado: ResultadoAuth = cadastrar
        ? await cadastrar({ email: valores.email.trim(), senha: valores.senha })
        : { ok: false, codigo: 'nao_configurado', mensagem: MENSAGEM_CADASTRO_NAO_CONFIGURADO }
      if (!montado.current) return
      if (resultado.ok) {
        onAutenticado(resultado.usuario)
        return
      }
      if (resultado.campos?.email || resultado.campos?.senha) {
        setErros({ email: resultado.campos.email, senha: resultado.campos.senha })
        refs[resultado.campos.email ? 'email' : 'senha'].current?.focus()
      } else if (resultado.codigo === 'email_em_uso') {
        setErros({ email: resultado.mensagem })
        refs.email.current?.focus()
      } else {
        setErroGeral(resultado.mensagem)
      }
    } catch {
      if (montado.current) setErroGeral(MENSAGEM_FALHA_INESPERADA)
    } finally {
      enviando.current = false
      if (montado.current) setCarregando(false)
    }
  }

  const botaoOlho = (
    <button
      type="button"
      className="campo__acao"
      onClick={() => setMostrarSenha((v) => !v)}
      aria-label={mostrarSenha ? 'Ocultar senhas' : 'Mostrar senhas'}
      aria-pressed={mostrarSenha}
    >
      <IconeOlho cortado={mostrarSenha} />
    </button>
  )
  const tipoSenha = mostrarSenha ? 'text' : 'password'

  return (
    <div className="tela">
      <CabecalhoTela titulo="Criar conta" />
      <main className="tela-simples__corpo">
        <MolduraPedra as="section" className="tela-simples__painel" aria-label="Criar conta">
          <MolduraPedra variante="interna" className="tela-simples__miolo criar-conta__miolo">
            <form onSubmit={aoEnviar} noValidate aria-busy={carregando || undefined}>
              <CampoRetro
                id={`${idBase}-email`}
                rotulo="E-mail"
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputRef={refs.email}
                value={valores.email}
                erro={erros.email}
                valido={ok('email')}
                onChange={(e) => aoDigitar('email', e.target.value)}
                onBlur={() => aoSair('email')}
                placeholder="nome@exemplo.com"
                required
              />
              <CampoRetro
                id={`${idBase}-senha`}
                rotulo="Senha (8 a 128 caracteres)"
                type={tipoSenha}
                name="nova-senha"
                autoComplete="new-password"
                inputRef={refs.senha}
                value={valores.senha}
                erro={erros.senha}
                valido={ok('senha')}
                onChange={(e) => aoDigitar('senha', e.target.value)}
                onBlur={() => aoSair('senha')}
                icone={<IconeCadeado />}
                acao={botaoOlho}
                required
              />
              <CampoRetro
                id={`${idBase}-confirmacao`}
                rotulo="Confirmar senha"
                type={tipoSenha}
                name="confirmar-senha"
                autoComplete="new-password"
                inputRef={refs.confirmacao}
                value={valores.confirmacao}
                erro={erros.confirmacao}
                valido={ok('confirmacao')}
                onChange={(e) => aoDigitar('confirmacao', e.target.value)}
                onBlur={() => aoSair('confirmacao')}
                icone={<IconeCadeado />}
                required
              />

              {erroGeral ? (
                <p role="alert" className="criar-conta__erro-geral">
                  {erroGeral}
                </p>
              ) : null}

              <p className="sr-only" role="status" aria-live="polite">
                {carregando ? 'Criando conta...' : ''}
              </p>

              <p className="criar-conta__nota">
                Você começa com um baralho inicial de 40 cartas. Ainda não há verificação de e-mail nem recuperação de senha.
              </p>

              <div className="criar-conta__botoes">
                <BotaoRetro type="submit" variante="primario" icone={<IconePessoaMais />} ocupado={carregando}>
                  {carregando ? 'Criando…' : 'Criar conta'}
                </BotaoRetro>
                <BotaoRetro icone={<IconeVoltar />} ocupado={carregando} onClick={onVoltar}>
                  Voltar ao login
                </BotaoRetro>
              </div>
            </form>
          </MolduraPedra>
        </MolduraPedra>
      </main>
      <RodapeControles />
    </div>
  )
}
