import type { Carta } from '../../game/tipos'
import { CartaView } from './CartaView'

/** Duração (ms) da cena de substituição (campo cheio): entrada, aviso DESCARTADA e queima da carta antiga. */
export const DURACAO_SUBSTITUICAO_MS = 3200

const FAGULHAS = [12, 28, 44, 60, 76, 90]

/**
 * Cena (só apresentação, fora da árvore de acessibilidade e sem capturar cliques): com o campo cheio, a carta
 * que estava na zona e a nova aparecem grandes lado a lado; a antiga recebe DESCARTADA e queima.
 */
export function SubstituicaoCarta({ antiga, nova }: { antiga: Carta; nova: Carta }) {
  return (
    <div className="substituicao" aria-hidden="true" data-testid="substituicao-carta">
      <div className="substituicao__palco">
        <div className="substituicao__carta substituicao__carta--antiga" data-papel="antiga">
          <span className="substituicao__rotulo">DESCARTADA</span>
          <div className="substituicao__corpo">
            <CartaView carta={antiga} tamanho="mao" rotulo={antiga.nome} />
            <span className="substituicao__brasa" />
          </div>
          <span className="substituicao__chamas">
            {FAGULHAS.map((x, i) => (
              <span key={x} className="confronto__fagulha" style={{ left: `${x}%`, animationDelay: `${1.1 + i * 0.15}s` }} />
            ))}
          </span>
        </div>
        <div className="substituicao__carta substituicao__carta--nova" data-papel="nova">
          <div className="substituicao__corpo">
            <CartaView carta={nova} tamanho="mao" rotulo={nova.nome} />
          </div>
        </div>
      </div>
    </div>
  )
}
