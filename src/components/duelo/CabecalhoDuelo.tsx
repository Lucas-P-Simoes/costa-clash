import cenarioEsq from '../../assets/duelo/cenario-esq.jpg'
import cenarioDir from '../../assets/duelo/cenario-dir.jpg'
import emblema from '../../assets/duelo/emblema-logo.png'

/**
 * Cabeçalho do duelo: cenário noturno (lua, farol, mar e palmeiras, recortados de Motor-Duelo.png), logotipo com emblema,
 * subtítulo e a faixa-frase. O `h1` da tela fica fora (visualmente oculto), em Partida.
 */
export function CabecalhoDuelo() {
  return (
    <header className="duelo-topo">
      <img className="duelo-topo__cena duelo-topo__cena--esq" src={cenarioEsq} alt="" aria-hidden="true" />
      <img className="duelo-topo__cena duelo-topo__cena--dir" src={cenarioDir} alt="" aria-hidden="true" />
      <div className="duelo-topo__logo">
        <img className="duelo-topo__emblema" src={emblema} alt="" aria-hidden="true" />
        <div className="duelo-topo__textos">
          <p className="cabecalho__nome">Costa Clash</p>
          <p className="cabecalho__subtitulo">Batalha pelo Litoral</p>
        </div>
      </div>
      <p className="duelo-topo__frase">Conhecimento hoje, litorais vivos amanhã.</p>
    </header>
  )
}
