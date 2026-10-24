import { IconeSetas } from './iconesDuelo'

interface Props {
  rodada: number
  /** "Seu turno", "Turno do oponente" ou "Fim do duelo". */
  texto: string
  fase: string
  /** true = turno do jogador (dourado); false = oponente/fim (frio). */
  meuTurno: boolean
  /** Destaque temporário (animação) quando o turno acabou de mudar. */
  mudou?: boolean
}

/** Banner do turno: aba com a rodada, texto dourado com setas e fase. Região com aria-live (anuncia a troca de turno). */
export function BannerTurno({ rodada, texto, fase, meuTurno, mudou }: Props) {
  return (
    <div className={`duelo-turno${meuTurno ? ' duelo-turno--meu' : ' duelo-turno--outro'}${mudou ? ' duelo-turno--mudou' : ''}`} role="status" aria-live="polite">
      <p className="duelo-turno__rotulo">Rodada {rodada}</p>
      <div className="duelo-turno__faixa">
        {meuTurno ? <IconeSetas className="duelo-turno__setas" /> : null}
        <p className="duelo-turno__texto">{texto}</p>
      </div>
      <p className="duelo-turno__fase">Fase: {fase}</p>
    </div>
  )
}
