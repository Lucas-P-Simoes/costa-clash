import { useEffect, useId, useRef, useState } from 'react'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { baixarTexto, copiarTexto, montarArquivoCodigo, NOME_ARQUIVO_CODIGO } from './transferencia'

interface Props {
  /** Código no formato XXXXX-XXXXX-XXXXX-XXXXX (vive só nesta tela: ao sair, o estado é descartado). */
  codigo: string
  /** E-mail da conta, só para constar no arquivo baixado. */
  email?: string
  rotuloContinuar: string
  onContinuar: () => void
  /** Foca o campo do código ao montar (diálogos); nas telas cheias o foco inicial é do subtítulo. */
  focarAoMontar?: boolean
}

/**
 * Mostra o código UMA vez: texto grande monoespaçado e selecionável, aviso, COPIAR, BAIXAR (.txt) e a confirmação
 * "Guardei meu código", obrigatória para habilitar o botão de continuar. Sem animações.
 */
export function PainelCodigo({ codigo, email, rotuloContinuar, onContinuar, focarAoMontar = false }: Props) {
  const idBase = useId()
  const [guardei, setGuardei] = useState(false)
  const [aviso, setAviso] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)
  const caixa = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focarAoMontar) campo.current?.focus({ preventScroll: true })
  }, [focarAoMontar])

  // Fechar/recarregar a aba antes de guardar o código: aviso nativo do navegador.
  useEffect(() => {
    if (guardei) return
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [guardei])

  async function copiar() {
    const ok = await copiarTexto(codigo, campo.current)
    setAviso(ok ? 'Código copiado.' : 'Não foi possível copiar sozinho. Selecione o código e use Ctrl+C.')
    if (!ok) campo.current?.select()
  }

  function baixar() {
    const ok = baixarTexto(NOME_ARQUIVO_CODIGO, montarArquivoCodigo(email, codigo))
    setAviso(ok ? 'Arquivo do código baixado.' : 'Não foi possível baixar o arquivo. Copie o código e guarde-o manualmente.')
  }

  function continuar() {
    if (!guardei) {
      caixa.current?.focus()
      setAviso('Marque “Guardei meu código” para continuar.')
      return
    }
    onContinuar()
  }

  return (
    <div className="codigo">
      <p className="codigo__aviso" id={`${idBase}-aviso`}>
        <strong>Este código será mostrado uma única vez.</strong> Sem ele não há como recuperar a senha. Guarde em lugar seguro; não compartilhe.
      </p>
      <textarea
        ref={campo}
        className="codigo__valor"
        value={codigo}
        rows={2}
        readOnly
        aria-label="Seu código de recuperação"
        aria-describedby={`${idBase}-aviso`}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="codigo__acoes">
        <BotaoRetro onClick={copiar}>Copiar</BotaoRetro>
        <BotaoRetro onClick={baixar}>Baixar</BotaoRetro>
      </div>
      <p className="codigo__retorno" role="status" aria-live="polite">
        {aviso}
      </p>
      <label className="codigo__confirmacao">
        <input ref={caixa} type="checkbox" checked={guardei} onChange={(e) => setGuardei(e.target.checked)} />
        <span>Guardei meu código</span>
      </label>
      <BotaoRetro
        variante="primario"
        className="codigo__continuar"
        aria-disabled={!guardei || undefined}
        aria-describedby={guardei ? undefined : `${idBase}-ajuda`}
        onClick={continuar}
      >
        {rotuloContinuar}
      </BotaoRetro>
      {guardei ? null : (
        <p className="sr-only" id={`${idBase}-ajuda`}>
          Marque a caixa “Guardei meu código” para habilitar este botão.
        </p>
      )}
    </div>
  )
}
