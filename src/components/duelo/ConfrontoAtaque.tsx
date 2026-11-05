import type { Carta } from '../../game/tipos'
import { CartaVerso, CartaView } from './CartaView'
import type { Confronto, LadoConfronto } from './efeitosVisuais'

interface Props {
  confronto: Confronto & { id: number }
  carta: (cartaId: string) => Carta | undefined
}

const FAGULHAS = [12, 28, 44, 60, 76, 90]

function CartaConfronto({ p, papel, carta }: { p: LadoConfronto; papel: 'atacante' | 'alvo'; carta: (id: string) => Carta | undefined }) {
  const c = p.cartaId ? carta(p.cartaId) : undefined
  const classe = ['confronto__carta', `confronto__carta--${papel}`, p.destruida ? 'confronto__carta--queima' : ''].filter(Boolean).join(' ')
  return (
    <div className={classe} data-confronto={papel} data-queima={p.destruida || undefined}>
      <div className="confronto__corpo">
        {c ? <CartaView carta={c} tamanho="mao" rotulo={c.nome} /> : <CartaVerso tamanho="mao" rotulo="Carta virada para baixo" />}
        {p.destruida ? <span className="confronto__brasa" /> : null}
      </div>
      {p.destruida ? (
        <span className="confronto__chamas">
          {FAGULHAS.map((x, i) => (
            <span key={x} className="confronto__fagulha" style={{ left: `${x}%`, animationDelay: `${1.95 + i * 0.12}s` }} />
          ))}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Cena de confronto (só apresentação, fora da árvore de acessibilidade e sem capturar cliques):
 * as duas cartas lado a lado em tamanho grande, o atacante avança, a atacada vibra e a derrotada queima.
 * A carta do jogador fica sempre à esquerda.
 */
export function ConfrontoAtaque({ confronto, carta }: Props) {
  const { atacante, alvo } = confronto
  const esquerda = atacante.lado === 'humano' ? atacante : alvo
  const direita = atacante.lado === 'humano' ? alvo : atacante
  const papel = (p: LadoConfronto) => (p === atacante ? 'atacante' : 'alvo')
  return (
    <div key={confronto.id} className={`confronto confronto--atq-${atacante.lado === 'humano' ? 'esquerda' : 'direita'}`} aria-hidden="true">
      <div className="confronto__palco">
        <CartaConfronto p={esquerda} papel={papel(esquerda)} carta={carta} />
        <span className="confronto__impacto" />
        <CartaConfronto p={direita} papel={papel(direita)} carta={carta} />
      </div>
    </div>
  )
}
