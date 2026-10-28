import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MENSAGEM_RECUPERACAO_NAO_CONFIGURADA } from '../../auth/servicoAuth'
import type { ResultadoCodigo, ServicoAuth } from '../../auth/servicoAuth'
import { useFocoDialogo } from '../../components/duelo/useFocoDialogo'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CampoRetro } from '../../components/ui/CampoRetro'
import { IconeCadeado, IconeOlho } from '../../components/ui/Icones'
import { MolduraPedra } from '../../components/ui/MolduraPedra'
import { PainelCodigo } from '../recuperacao/PainelCodigo'
import '../recuperacao/recuperacao.css'

interface Props {
  servicoAuth?: ServicoAuth
  email: string
  /** Fecha o diálogo. `geradoNovo` = um código novo foi gerado e confirmado (a conta passa a ter código). */
  onFechar: (geradoNovo: boolean) => void
  /** Sessão expirada (401): fecha o diálogo e a Conta volta ao login com este aviso. */
  onSessaoExpirada?: (mensagem: string) => void
}

const MENSAGEM_FALHA_INESPERADA = 'Não foi possível gerar o código agora. Tente novamente em instantes.'

/**
 * Diálogo modal acessível (foco preso, Esc cancela): pede a senha atual, gera o novo código e o mostra UMA vez.
 * Depois que o código aparece, só fecha após "Guardei meu código" (Esc não fecha).
 */
export function DialogoNovoCodigo({ servicoAuth, email, onFechar, onSessaoExpirada }: Props) {
  const idBase = useId()
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref)
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [codigo, setCodigo] = useState<string | null>(null)
  const enviando = useRef(false)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && codigo === null && !enviando.current) onFechar(false)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [codigo, onFechar])

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando.current) return
    if (senha === '') {
      setErro('Informe sua senha atual.')
      return
    }
    enviando.current = true
    setCarregando(true)
    setErro(null)
    try {
      const gerar = servicoAuth?.gerarNovoCodigo?.bind(servicoAuth)
      const r: ResultadoCodigo = gerar ? await gerar({ senhaAtual: senha }) : { ok: false, codigo: 'nao_configurado', mensagem: MENSAGEM_RECUPERACAO_NAO_CONFIGURADA }
      if (!montado.current) return
      if (r.ok) {
        setSenha('')
        setCodigo(r.codigoRecuperacao)
      } else if (r.codigo === 'sessao_invalida' && onSessaoExpirada) {
        onSessaoExpirada(r.mensagem)
      } else setErro(r.mensagem)
    } catch {
      if (montado.current) setErro(MENSAGEM_FALHA_INESPERADA)
    } finally {
      enviando.current = false
      if (montado.current) setCarregando(false)
    }
  }

  return (
    <div className="dialogo-fundo">
      <div ref={ref} className="dialogo-codigo" role="dialog" aria-modal="true" aria-labelledby={`${idBase}-titulo`}>
        <MolduraPedra variante="interna" className="dialogo-codigo__moldura">
          {codigo === null ? (
            <>
              <h2 id={`${idBase}-titulo`} className="recuperacao__subtitulo">
                Gerar novo código de recuperação
              </h2>
              <p className="recuperacao__intro">O código atual deixa de valer assim que o novo for gerado. Confirme sua senha atual.</p>
              <form onSubmit={aoEnviar} noValidate aria-busy={carregando || undefined}>
                {/* Campo de usuário oculto: ajuda gerenciadores de senha e silencia o aviso do Chrome; nada visível. */}
                <input type="text" name="username" autoComplete="username" readOnly tabIndex={-1} aria-hidden="true" value={email} className="sr-only" />
                <CampoRetro
                  id={`${idBase}-senha`}
                  rotulo="Senha atual"
                  type={mostrar ? 'text' : 'password'}
                  name="senha-atual"
                  autoComplete="current-password"
                  value={senha}
                  erro={undefined}
                  onChange={(e) => {
                    setSenha(e.target.value)
                    setErro(null)
                  }}
                  data-foco-inicial
                  icone={<IconeCadeado />}
                  acao={
                    <button
                      type="button"
                      className="campo__acao"
                      onClick={() => setMostrar((v) => !v)}
                      aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={mostrar}
                    >
                      <IconeOlho cortado={mostrar} />
                    </button>
                  }
                  required
                />
                {erro ? (
                  <p role="alert" className="recuperacao__erro-geral">
                    {erro}
                  </p>
                ) : null}
                <p className="sr-only" role="status" aria-live="polite">
                  {carregando ? 'Gerando o código...' : ''}
                </p>
                <div className="recuperacao__botoes">
                  <BotaoRetro type="submit" variante="primario" ocupado={carregando}>
                    {carregando ? 'Gerando…' : 'Gerar código'}
                  </BotaoRetro>
                  <BotaoRetro ocupado={carregando} onClick={() => onFechar(false)}>
                    Cancelar
                  </BotaoRetro>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 id={`${idBase}-titulo`} className="recuperacao__subtitulo">
                Seu novo código de recuperação
              </h2>
              <p className="recuperacao__intro">O código anterior não vale mais.</p>
              <PainelCodigo codigo={codigo} email={email} rotuloContinuar="Concluir" onContinuar={() => onFechar(true)} focarAoMontar />
            </>
          )}
        </MolduraPedra>
      </div>
    </div>
  )
}
