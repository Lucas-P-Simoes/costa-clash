import { useEffect, useState } from 'react'
import type { Passo } from '../../screens/duelo/tutorial/roteiro'

interface Props {
  passo: Passo
  /** Posição do passo (1-based) e total, só para o rótulo "Passo x de y". */
  numero: number
  total: number
  onContinuar: () => void
  onPular: () => void
}

/** Marca (e desmarca) o elemento destacado do passo com `data-tutorial-alvo`; o anel pulsante vem do CSS. */
function useDestaque(seletor: string | undefined) {
  // Sem lista de dependências de propósito: o campo muda a cada jogada (zonas surgem), então reaplica a cada render.
  useEffect(() => {
    if (!seletor) return
    const marcados = Array.from(document.querySelectorAll<HTMLElement>(seletor))
    for (const el of marcados) el.setAttribute('data-tutorial-alvo', '')
    return () => {
      for (const el of marcados) el.removeAttribute('data-tutorial-alvo')
    }
  })
}

/** Balão do tutorial: não modal (não bloqueia o jogo), anunciado como status. Só orienta; as jogadas continuam livres. */
export function TutorialGuia({ passo, numero, total, onContinuar, onPular }: Props) {
  useDestaque(passo.alvo)
  // O balão cobre parte da tela (sobretudo no celular): o jogador pode recolhê-lo para ver o campo todo.
  const [recolhido, setRecolhido] = useState(false)
  return (
    <aside className="tutorial-guia moldura textura-pedra" aria-label="Tutorial do Guardião do Mangue" data-passo={passo.id} data-recolhido={recolhido || undefined}>
      <p className="tutorial-guia__passo">
        Tutorial · passo {numero} de {total}
      </p>
      <h2 className="tutorial-guia__titulo">{passo.titulo}</h2>
      <p className="tutorial-guia__texto" role="status" aria-live="polite" hidden={recolhido}>
        {passo.texto}
      </p>
      <div className="tutorial-guia__botoes">
        <button type="button" className="botao botao--secundario" aria-expanded={!recolhido} onClick={() => setRecolhido((r) => !r)}>
          <span>{recolhido ? 'Mostrar dica' : 'Ocultar dica'}</span>
        </button>
        {passo.manual ? (
          <button type="button" className="botao botao--primario" onClick={onContinuar}>
            <span>Continuar</span>
          </button>
        ) : null}
        <button type="button" className="botao botao--secundario" onClick={onPular}>
          <span>Pular tutorial</span>
        </button>
      </div>
    </aside>
  )
}
