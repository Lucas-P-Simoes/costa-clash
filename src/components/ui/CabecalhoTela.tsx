import topoEsquerda from '../../assets/login/topo-esquerda.png'
import topoDireita from '../../assets/login/topo-direita.png'
import { OrnamentoOnda } from './Icones'

/** Logo Costa Clash + faixa de título da tela (h1). Reutilizável nas próximas telas. */
/** `semOrnamentos` remove as ondas laterais do título (usado só no login); o título segue centralizado. */
export function CabecalhoTela({ titulo, semOrnamentos = false }: { titulo: string; semOrnamentos?: boolean }) {
  return (
    <header className="cabecalho">
      <div className="cabecalho__cena">
        <img className="cabecalho__imagem cabecalho__imagem--esq" src={topoEsquerda} alt="" aria-hidden="true" />
        <img className="cabecalho__imagem cabecalho__imagem--dir" src={topoDireita} alt="" aria-hidden="true" />
        <div className="cabecalho__logo">
          <div className="cabecalho__marca">
            <OrnamentoOnda className="cabecalho__ornamento" />
            <p className="cabecalho__nome">Costa Clash</p>
            <OrnamentoOnda className="cabecalho__ornamento" espelhado />
          </div>
          <p className="cabecalho__subtitulo">Batalha pelo Litoral</p>
        </div>
      </div>
      <div className="cabecalho__faixa textura-pedra">
        {semOrnamentos ? null : <OrnamentoOnda className="cabecalho__ornamento" />}
        <h1 className="cabecalho__titulo">{titulo}</h1>
        {semOrnamentos ? null : <OrnamentoOnda className="cabecalho__ornamento" espelhado />}
      </div>
    </header>
  )
}
