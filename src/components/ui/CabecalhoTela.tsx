import topoEsquerda from '../../assets/login/topo-esquerda.png'
import topoDireita from '../../assets/login/topo-direita.png'
import { OrnamentoOnda, OrnamentoOndaGrande } from './Icones'

type VarianteCabecalho = 'padrao' | 'duelo-livre'

/** Logo Costa Clash + faixa de título da tela (h1). Reutilizável nas próximas telas. */
/** Sem `titulo`, só o logo é exibido (login: o h1 fica dentro do painel do formulário). */
export function CabecalhoTela({ titulo, inert, variante = 'padrao' }: { titulo?: string; inert?: boolean; variante?: VarianteCabecalho }) {
  const dueloLivre = variante === 'duelo-livre'
  return (
    <header className={`cabecalho${dueloLivre ? ' cabecalho--duelo-livre' : ''}`} inert={inert || undefined}>
      <div className="cabecalho__cena">
        <img className="cabecalho__imagem cabecalho__imagem--esq" src={topoEsquerda} alt="" aria-hidden="true" />
        <img className="cabecalho__imagem cabecalho__imagem--dir" src={topoDireita} alt="" aria-hidden="true" />
        <div className="cabecalho__logo">
          <div className="cabecalho__marca">
            {dueloLivre ? <OrnamentoOndaGrande className="cabecalho__onda-grande" /> : <OrnamentoOnda className="cabecalho__ornamento" />}
            <p className="cabecalho__nome">Costa Clash</p>
            {dueloLivre ? <OrnamentoOndaGrande className="cabecalho__onda-grande" espelhado /> : <OrnamentoOnda className="cabecalho__ornamento" espelhado />}
          </div>
          <p className="cabecalho__subtitulo">Batalha pelo Litoral</p>
        </div>
      </div>
      {titulo ? (
        <div className="cabecalho__faixa textura-pedra">
          <OrnamentoOnda className="cabecalho__ornamento" />
          <h1 className="cabecalho__titulo">{titulo}</h1>
          <OrnamentoOnda className="cabecalho__ornamento" espelhado />
        </div>
      ) : null}
    </header>
  )
}
