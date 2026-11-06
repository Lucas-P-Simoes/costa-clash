import { useRef, useState } from 'react'
import type { Posicao } from '../../game'
import type { Carta } from '../../game/tipos'
import { CartaVerso, CartaView } from './CartaView'
import { useFocoDialogo } from './useFocoDialogo'

/**
 * Prévia da colocação de uma unidade: a carta aparece grande com uma seta à direita. A seta vira a carta
 * (para baixo e de volta para cima); COLOCAR confirma com a face escolhida, CANCELAR desiste.
 * Substitui o antigo diálogo "Como colocar a unidade?".
 */
export function PreviaColocacao({
  carta,
  posicao,
  onColocar,
  onCancelar,
}: {
  carta: Carta
  posicao: Posicao
  onColocar: (viradaParaBaixo: boolean) => void
  onCancelar: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref, 'b-usar')
  const [baixo, setBaixo] = useState(false)
  return (
    <div className="duelo-overlay">
      <div ref={ref} className="previa-colocacao moldura textura-pedra" role="dialog" aria-modal="true" aria-label={`Colocar ${carta.nome}`}>
        <div className="previa-colocacao__palco">
          <div className={`previa-colocacao__carta${baixo ? ' previa-colocacao__carta--baixo' : ''}`} data-face={baixo ? 'baixo' : 'cima'}>
            <div className="previa-colocacao__face previa-colocacao__face--frente">
              <CartaView carta={carta} tamanho="mao" rotulo={`${carta.nome}, virada para cima`} />
            </div>
            <div className="previa-colocacao__face previa-colocacao__face--verso">
              <CartaVerso tamanho="mao" rotulo="Carta virada para baixo" />
            </div>
          </div>
          <button
            type="button"
            className="previa-colocacao__seta"
            aria-label={baixo ? 'Virar a carta para cima' : 'Virar a carta para baixo'}
            aria-pressed={baixo}
            onClick={() => setBaixo((v) => !v)}
          >
            <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
              <path d="M5 1h3v2h2v2h2v2h2v2h-2v2h-2v2H8v2H5v-2h2v-2h2v-2h2V8H9V6H7V4H5z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <p className="previa-colocacao__dica">
          {posicao === 'ATAQUE' ? 'Posição de ataque' : 'Posição de defesa'} · {baixo ? 'virada para baixo' : 'virada para cima'}
        </p>
        <div className="duelo-dialogo__botoes">
          <button type="button" className="botao botao--primario" data-foco-inicial onClick={() => onColocar(baixo)}>
            <span>Colocar carta</span>
          </button>
          <button type="button" className="botao botao--secundario" onClick={onCancelar}>
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
