import cidadeNoite from '../../assets/login/cidade-noite.png'
import { IconeCartas, IconeEscudoTartaruga, IconeLivro } from '../../components/ui/Icones'
import { MolduraPedra } from '../../components/ui/MolduraPedra'

const BLOCOS = [
  { id: 'aprenda', titulo: 'Aprenda', texto: 'Descubra os ecossistemas costeiros e sua importância.', Icone: IconeLivro },
  { id: 'jogue', titulo: 'Jogue', texto: 'Participe de duelos estratégicos com cartas inspiradas no litoral brasileiro.', Icone: IconeCartas },
  { id: 'proteja', titulo: 'Proteja', texto: 'Amplie seu conhecimento e ajude a preservar o nosso litoral.', Icone: IconeEscudoTartaruga },
] as const

export function PainelInformativo() {
  return (
    <MolduraPedra as="aside" className="painel-info" aria-label="Sobre o Costa Clash">
      {BLOCOS.map(({ id, titulo, texto, Icone }) => (
        <section key={id} className={`painel-info__bloco painel-info__bloco--${id}`}>
          <div className="painel-info__icone">
            <Icone />
          </div>
          <div>
            <h2 className="painel-info__titulo">{titulo}</h2>
            <p className="painel-info__texto">{texto}</p>
          </div>
        </section>
      ))}
      <img className="painel-info__cidade" src={cidadeNoite} alt="" aria-hidden="true" />
    </MolduraPedra>
  )
}
