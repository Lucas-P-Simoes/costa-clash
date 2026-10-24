import { PixelArt } from '../ui/PixelArt'
import { SELO_GRADES, SELO_PALETAS } from '../../arte/categorias'
import type { SeloId } from '../../arte/categorias'

/** Selo circular (octógono escuro) com pictograma em pixel art, no canto superior esquerdo da arte. */
export function SeloCarta({ selo }: { selo: SeloId }) {
  return (
    <span className="carta__selo" aria-hidden="true" data-selo={selo}>
      <span className="carta__selo-miolo">
        <PixelArt grade={SELO_GRADES[selo]} paleta={SELO_PALETAS[selo]} />
      </span>
    </span>
  )
}
