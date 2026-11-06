import { CartaView } from './CartaView'
import type { Carta } from '../../game/tipos'

/** Duração (ms) do efeito de queima ao soltar uma carta na lixeira. */
export const DURACAO_QUEIMA_LIXEIRA_MS = 1400

/**
 * Efeito visual (só apresentação): a carta descartada continua no ponto onde foi solta e queima de baixo para cima
 * (máscara + brasa + fagulhas). Fora da árvore de acessibilidade e sem capturar cliques.
 */
export function CartaQueimando({ carta, x, y }: { carta: Carta; x: number; y: number }) {
  return (
    <div className="lixeira-queima" aria-hidden="true" data-testid="lixeira-queima" style={{ left: x, top: y }}>
      <div className="lixeira-queima__corpo">
        <CartaView carta={carta} tamanho="mao" rotulo="Carta descartada" />
      </div>
      <span className="lixeira-queima__brasa" />
      <span className="lixeira-queima__chamas">
        {[12, 32, 52, 72, 90].map((p, i) => (
          <span key={p} className="confronto__fagulha lixeira-queima__fagulha" style={{ left: `${p}%`, animationDelay: `${0.1 + i * 0.15}s` }} />
        ))}
      </span>
    </div>
  )
}
