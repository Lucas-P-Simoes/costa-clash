import type { Carta } from '../../game/tipos'
import imagemDica from '../../assets/duelo/dica-garca-mangue.jpg'
import { IconeLivro } from '../ui/Icones'
import { MolduraOrnamentada } from '../ui/MolduraOrnamentada'
import { IconeLampada } from './iconesDuelo'
import { rotuloTipo } from './textoCarta'

/** Painel DICA EDUCATIVA: texto educativo da carta selecionada/em foco (ou orientação inicial) e imagem do litoral. */
export function DicaEducativa({ carta }: { carta: Carta | undefined }) {
  return (
    <MolduraOrnamentada as="section" className="duelo-dica" aria-label="Dica educativa" classeMiolo="duelo-dica__miolo">
      <h2 className="duelo-dica__titulo">
        <IconeLivro className="duelo-dica__icone" />
        <span>Dica educativa</span>
        <IconeLampada className="duelo-dica__lampada" />
      </h2>
      <div className="duelo-dica__texto">
        {carta ? (
          <>
            <p className="duelo-dica__carta">
              {carta.nome} <small>({rotuloTipo(carta)})</small>
            </p>
            <p>{carta.educacao}</p>
          </>
        ) : (
          <p>Selecione uma carta ou observe as jogadas para ver uma dica sobre o litoral.</p>
        )}
      </div>
      <img className="duelo-dica__img" src={imagemDica} alt="" aria-hidden="true" />
    </MolduraOrnamentada>
  )
}
