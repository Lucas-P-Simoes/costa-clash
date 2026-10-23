import type { Carta } from '../../game/tipos'
import { ArteCarta } from './ArteCarta'
import { efeitoCurto, rotuloTipo, tipoArte } from './textoCarta'

export interface CartaViewProps {
  carta: Carta
  /** ATK/DEF a mostrar (efetivos em campo). Padrão: valores do catálogo. */
  atk?: number
  def?: number
  /** Só em campo. */
  posicao?: 'ATAQUE' | 'DEFESA'
  tamanho?: 'mao' | 'campo' | 'mini'
  selecionada?: boolean
  /** 'alvo' = alvo válido; 'valida' = zona/atacante possível. */
  destaque?: 'alvo' | 'valida' | null
  /** Texto acessível completo (obrigatório: inclui zona, atributos e posição). */
  rotulo: string
  onClick?: () => void
  /** Marca para o foco guiado (primeiro alvo/atacante válido). */
  focoAlvo?: boolean
  /** Se true, o botão continua focável (aria-disabled), mas o clique é ignorado. */
  inativa?: boolean
}

/** Carta do catálogo: nome, arte por grupo/tipo, ATK (vermelho) / DEF (azul) ou tipo + efeito curto. */
export function CartaView({ carta, atk, def, posicao, tamanho = 'mao', selecionada, destaque, rotulo, onClick, focoAlvo, inativa }: CartaViewProps) {
  const unidade = carta.tipo === 'unidade'
  const classe = [
    'carta',
    `carta--${tamanho}`,
    `carta--${tipoArte(carta)}`,
    posicao === 'DEFESA' ? 'carta--defesa' : '',
    selecionada ? 'carta--selecionada' : '',
    destaque ? `carta--${destaque}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const conteudo = (
    <>
      <span className="carta__nome">{carta.nome}</span>
      <span className="carta__arte" aria-hidden="true">
        <ArteCarta tipo={tipoArte(carta)} />
      </span>
      {unidade ? (
        <span className="carta__atributos" aria-hidden="true">
          <span className="carta__atk">
            <small>ATK</small>
            {atk ?? carta.atk}
          </span>
          <span className="carta__def">
            <small>DEF</small>
            {def ?? carta.defesa}
          </span>
        </span>
      ) : (
        <span className="carta__efeito" aria-hidden="true">
          <strong>{rotuloTipo(carta)}</strong>
          {tamanho === 'mao' ? <span>{efeitoCurto(carta)}</span> : null}
        </span>
      )}
      {posicao ? (
        <span className="carta__posicao" aria-hidden="true">
          {posicao === 'ATAQUE' ? 'ATQ' : 'DEF'}
        </span>
      ) : null}
    </>
  )
  if (!onClick) {
    return (
      <div className={classe} role="img" aria-label={rotulo}>
        {conteudo}
      </div>
    )
  }
  return (
    <button
      type="button"
      className={classe}
      aria-label={rotulo}
      data-foco={focoAlvo ? 'alvo' : undefined}
      aria-pressed={selecionada === undefined ? undefined : selecionada}
      aria-disabled={inativa || undefined}
      onClick={() => {
        if (!inativa) onClick()
      }}
    >
      {conteudo}
    </button>
  )
}

/** Verso de carta (mão ou armadilha virada do adversário): não revela nada. */
export function CartaVerso({ rotulo, tamanho = 'mini' }: { rotulo: string; tamanho?: 'mao' | 'campo' | 'mini' }) {
  return (
    <div className={`carta carta--verso carta--${tamanho}`} role="img" aria-label={rotulo}>
      <span className="carta__verso-marca" aria-hidden="true" />
    </div>
  )
}
