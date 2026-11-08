import { CartaView } from './CartaView'
import type { Carta } from '../../game/tipos'

/** Duração (ms) do efeito de queima ao soltar uma carta na lixeira. */
export const DURACAO_QUEIMA_LIXEIRA_MS = 2200

const CHAMAS = [8, 24, 42, 61, 79, 93]
const CINZAS = [12, 29, 47, 66, 84]
const FUMACA = [30, 52, 70]

/**
 * Efeito visual (só apresentação): a carta cai na câmara, sofre o impacto, carboniza, queima e se desfaz em cinza.
 * Fora da árvore de acessibilidade e sem capturar cliques.
 */
export function CartaQueimando({ carta, x, y }: { carta: Carta; x: number; y: number }) {
  return (
    <div className="lixeira-queima" aria-hidden="true" data-testid="lixeira-queima" style={{ left: x, top: y }}>
      <span className="lixeira-queima__impacto" />
      <div className="lixeira-queima__palco">
        <div className="lixeira-queima__corpo">
          <CartaView carta={carta} tamanho="mao" rotulo="Carta descartada" />
        </div>
        <span className="lixeira-queima__carbonizacao" />
        <span className="lixeira-queima__brasa" />
        <span className="lixeira-queima__chamas">
          {CHAMAS.map((p, i) => (
            <i key={p} className="lixeira-queima__chama" style={{ left: `${p}%`, animationDelay: `${0.48 + i * 0.06}s` }} />
          ))}
        </span>
        <span className="lixeira-queima__cinzas">
          {CINZAS.map((p, i) => (
            <i key={p} className="lixeira-queima__cinza" style={{ left: `${p}%`, animationDelay: `${1.05 + i * 0.09}s` }} />
          ))}
        </span>
      </div>
      <span className="lixeira-queima__fumaca">
        {FUMACA.map((p, i) => (
          <i key={p} style={{ left: `${p}%`, animationDelay: `${1.18 + i * 0.12}s` }} />
        ))}
      </span>
    </div>
  )
}
