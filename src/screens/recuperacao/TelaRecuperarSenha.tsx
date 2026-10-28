import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { codigoComFormatoValido, formatarCodigo, validarCodigoRecuperacao, validarRecuperacao } from '../../auth/codigoRecuperacao'
import type { ErrosRecuperacao } from '../../auth/codigoRecuperacao'
import { contatoSuportePadrao } from '../../auth/contatoSuporte'
import { MENSAGEM_RECUPERACAO_NAO_CONFIGURADA } from '../../auth/servicoAuth'
import type { ResultadoCodigo, ServicoAuth } from '../../auth/servicoAuth'
import { validarConfirmacao, validarEmail, validarSenhaNova } from '../../auth/validacao'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { CampoRetro } from '../../components/ui/CampoRetro'
import { IconeCadeado, IconeOlho, IconeVoltar } from '../../components/ui/Icones'
import { MolduraPedra } from '../../components/ui/MolduraPedra'
import { RodapeControles } from '../../components/ui/RodapeControles'
import { useAtalhoVoltar } from '../../components/ui/useAtalhoVoltar'
import '../telaSimples.css'
import './recuperacao.css'

const MENSAGEM_FALHA_INESPERADA = 'Não foi possível trocar a senha agora. Tente novamente em instantes.'

interface Props {
  servicoAuth: ServicoAuth
  /** Senha trocada: recebe o e-mail usado e o NOVO código (exibido uma vez). Não autentica. */
  onConcluido: (email: string, novoCodigo: string) => void
  onVoltar: () => void
  /** Texto do contato do responsável (configurável); o padrão vem de VITE_CONTATO_SUPORTE. */
  contato?: string
}

type Campo = 'email' | 'codigo' | 'senha' | 'confirmacao'
const CAMPOS: Campo[] = ['email', 'codigo', 'senha', 'confirmacao']
type Valores = Record<Campo, string>

function validarCampo(campo: Campo, v: Valores) {
  if (campo === 'email') return validarEmail(v.email)
  if (campo === 'codigo') return validarCodigoRecuperacao(v.codigo)
  if (campo === 'senha') return validarSenhaNova(v.senha)
  return validarConfirmacao(v.senha, v.confirmacao)
}

export function TelaRecuperarSenha({ servicoAuth, onConcluido, onVoltar, contato = contatoSuportePadrao }: Props) {
  const idBase = useId()
  const [valores, setValores] = useState<Valores>({ email: '', codigo: '', senha: '', confirmacao: '' })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erros, setErros] = useState<ErrosRecuperacao>({})
  const [tocados, setTocados] = useState<Record<Campo, boolean>>({ email: false, codigo: false, senha: false, confirmacao: false })
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [semCodigo, setSemCodigo] = useState(false)
  const refs = {
    email: useRef<HTMLInputElement>(null),
    codigo: useRef<HTMLInputElement>(null),
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

  const voltar = useCallback(() => {
    if (!enviando.current) onVoltar()
  }, [onVoltar])
  useAtalhoVoltar(voltar)

  const ok = (campo: Campo) => tocados[campo] && validarCampo(campo, valores).valido

  function aoSair(campo: Campo) {
    if (valores[campo] === '') return
    // Código válido: reagrupa em XXXXX-XXXXX-XXXXX-XXXXX (máscara aplicada ao sair do campo, sem mexer no cursor enquanto digita).
    if (campo === 'codigo' && codigoComFormatoValido(valores.codigo)) {
      setValores((v) => ({ ...v, codigo: formatarCodigo(v.codigo) }))
    }
    setTocados((t) => ({ ...t, [campo]: true }))
    const r = validarCampo(campo, valores)
    setErros((e) => ({ ...e, [campo]: r.valido ? undefined : r.mensagem }))
  }

  function aoDigitar(campo: Campo, valor: string) {
    const novos = { ...valores, [campo]: valor }
    setValores(novos)
    setErroGeral(null)
    setErros((e) => {
      const prox = { ...e }
      for (const c of CAMPOS) if (prox[c] && validarCampo(c, novos).valido) prox[c] = undefined
      return prox
    })
  }

  function aplicarResultado(resultado: ResultadoCodigo, email: string) {
    if (resultado.ok) {
      onConcluido(email, resultado.codigoRecuperacao)
      return
    }
    if (resultado.campos?.senha) {
      setErros((e) => ({ ...e, senha: resultado.campos?.senha }))
      refs.senha.current?.focus()
    } else {
      setErroGeral(resultado.mensagem)
    }
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando.current) return
    setErroGeral(null)
    const novos = validarRecuperacao(valores)
    setTocados({ email: true, codigo: true, senha: true, confirmacao: true })
    setErros(novos)
    const primeiro = CAMPOS.find((c) => novos[c])
    if (primeiro) {
      refs[primeiro].current?.focus()
      return
    }
    enviando.current = true
    setCarregando(true)
    try {
      const recuperar = servicoAuth.recuperarSenha?.bind(servicoAuth)
      const email = valores.email.trim()
      const resultado: ResultadoCodigo = recuperar
        ? await recuperar({ email, codigo: valores.codigo, novaSenha: valores.senha })
        : { ok: false, codigo: 'nao_configurado', mensagem: MENSAGEM_RECUPERACAO_NAO_CONFIGURADA }
      if (!montado.current) return
      aplicarResultado(resultado, email)
    } catch {
      if (montado.current) setErroGeral(MENSAGEM_FALHA_INESPERADA)
    } finally {
      enviando.current = false
      if (montado.current) setCarregando(false)
    }
  }

  const tipoSenha = mostrarSenha ? 'text' : 'password'
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

  return (
    <div className="tela tela-jogo">
      <CabecalhoTela titulo="Recuperar senha" />
      <main className="tela-simples__corpo">
        <MolduraPedra as="section" className="tela-simples__painel recuperacao__painel recuperacao__painel--larga" aria-label="Recuperar senha">
          <MolduraPedra variante="interna" className="tela-simples__miolo recuperacao__miolo">
            <p className="recuperacao__intro">Informe o e-mail da conta, o código de recuperação que você guardou e escolha uma nova senha.</p>
            <form onSubmit={aoEnviar} noValidate aria-busy={carregando || undefined}>
              <div className="recuperacao__campos">
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
                  id={`${idBase}-codigo`}
                  rotulo="Código de recuperação"
                  type="text"
                  name="codigo-recuperacao"
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="recuperacao__campo-codigo"
                  inputRef={refs.codigo}
                  value={valores.codigo}
                  erro={erros.codigo}
                  valido={ok('codigo')}
                  onChange={(e) => aoDigitar('codigo', e.target.value)}
                  onBlur={() => aoSair('codigo')}
                  placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                  data-1p-ignore
                  data-lpignore="true"
                  required
                />
                <CampoRetro
                  id={`${idBase}-senha`}
                  rotulo="Nova senha (8 a 128 caracteres)"
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
                  rotulo="Confirmar nova senha"
                  type={tipoSenha}
                  name="confirmar-nova-senha"
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
              </div>

              {erroGeral ? (
                <p role="alert" className="recuperacao__erro-geral">
                  {erroGeral}
                </p>
              ) : null}

              <p className="sr-only" role="status" aria-live="polite">
                {carregando ? 'Trocando a senha...' : ''}
              </p>

              <div className="recuperacao__botoes">
                <BotaoRetro type="submit" variante="primario" icone={<IconeCadeado />} ocupado={carregando}>
                  {carregando ? 'Trocando…' : 'Trocar senha'}
                </BotaoRetro>
                <BotaoRetro icone={<IconeVoltar />} ocupado={carregando} onClick={onVoltar}>
                  Voltar ao login
                </BotaoRetro>
              </div>
            </form>

            <div className="recuperacao__sem-codigo">
              <BotaoRetro
                variante="link"
                aria-expanded={semCodigo}
                aria-controls={`${idBase}-sem-codigo`}
                onClick={() => setSemCodigo((v) => !v)}
              >
                Não tenho o código
              </BotaoRetro>
              {semCodigo ? (
                <div id={`${idBase}-sem-codigo`} className="recuperacao__explica">
                  <p>
                    Hoje a recuperação funciona só com o código que aparece ao criar a conta (ou que você gerou depois, na tela Conta). Ainda não enviamos
                    e-mail de recuperação.
                  </p>
                  <p>
                    Quem não tem o código e não está conectado não consegue recuperar a senha por aqui. Se você ainda estiver conectado e souber sua
                    senha, abra a tela Conta e gere um novo código.
                  </p>
                  <p>{contato}</p>
                </div>
              ) : null}
            </div>
          </MolduraPedra>
        </MolduraPedra>
      </main>
      <RodapeControles />
    </div>
  )
}
