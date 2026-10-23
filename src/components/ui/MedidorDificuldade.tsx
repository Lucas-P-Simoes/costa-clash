import { ROTULO_DIFICULDADE } from '../../data/oponentes'
import type { NivelDificuldade } from '../../data/oponentes'
import { IconeConcha } from './Icones'

/** Medidor de dificuldade: 3 conchas (preenchidas até o nível) + rótulo em dourado. */
export function MedidorDificuldade({ nivel, className }: { nivel: NivelDificuldade; className?: string }) {
  return (
    <div className={`medidor ${className ?? ''}`} data-nivel={nivel}>
      <span className="medidor__conchas" aria-hidden="true">
        {([1, 2, 3] as const).map((n) => (
          <IconeConcha key={n} cheia={n <= nivel} className="medidor__concha" />
        ))}
      </span>
      <span className="medidor__rotulo">{ROTULO_DIFICULDADE[nivel]}</span>
    </div>
  )
}
