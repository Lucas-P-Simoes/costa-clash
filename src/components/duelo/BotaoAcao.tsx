import type { ReactNode } from 'react'

export type VarianteBotaoAcao = 'atacar' | 'defender' | 'usar' | 'neutro' | 'desistir'

interface Props {
  id: string
  variante: VarianteBotaoAcao
  titulo: string
  sub?: string
  /** Motivo do bloqueio: o botão continua focável (aria-disabled), o motivo fica visível e ligado por aria-describedby. */
  motivo: string | null
  onClick: () => void
  icone?: ReactNode
}

/** Botão de ação do duelo (ATACAR, DEFENDER, USAR CARTA, ENCERRAR TURNO, DESISTIR). Nunca decorativo: sempre chama `onClick`. */
export function BotaoAcao({ id, variante, titulo, sub, motivo, onClick, icone }: Props) {
  return (
    <div className={`duelo-btn-wrap${motivo ? ' duelo-btn-wrap--bloqueado' : ''}`}>
      <button
        type="button"
        id={id}
        className={`duelo-btn duelo-btn--${variante}`}
        aria-disabled={motivo ? true : undefined}
        aria-describedby={motivo ? `${id}-motivo` : undefined}
        title={motivo ?? undefined}
        onClick={onClick}
      >
        {icone ? (
          <span className="duelo-btn__icone" aria-hidden="true">
            {icone}
          </span>
        ) : null}
        <span className="duelo-btn__texto">
          <strong>{titulo}</strong>
          {sub ? <small>{sub}</small> : null}
        </span>
      </button>
      {motivo ? (
        <span id={`${id}-motivo`} className="duelo-btn__motivo">
          {motivo}
        </span>
      ) : null}
    </div>
  )
}
