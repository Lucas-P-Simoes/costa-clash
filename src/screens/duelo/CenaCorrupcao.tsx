import { useRef } from 'react'
import { useFocoDialogo } from '../../components/duelo/useFocoDialogo'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { urlArquivoOponente } from '../../data/oponentes'

/**
 * Cena curta depois de vencer o tutorial: o Guardião ensinou o básico e a poluição começa a tomá-lo.
 * A arte é provisória (reaproveita o retrato do Guardião) até haver ilustração própria da corrupção.
 */
export function CenaCorrupcao({ onContinuar }: { onContinuar: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref, 'b-corrupcao-continuar')
  return (
    <div className="duelo-overlay">
      <div ref={ref} className="duelo-dialogo cena-corrupcao moldura textura-pedra" role="dialog" aria-modal="true" aria-labelledby="cena-corrupcao-titulo">
        <h2 id="cena-corrupcao-titulo" className="duelo-dialogo__titulo duelo-dialogo__titulo--pequeno">
          Algo está errado...
        </h2>
        <img className="cena-corrupcao__imagem" src={urlArquivoOponente('guardiao-manguezal-grande.png')} alt="" draggable={false} />
        <p className="duelo-dialogo__motivo">Você aprendeu o básico, e o Guardião sorri. Mas um lodo escuro escorre pelas raízes e a água ao redor começa a mudar de cor.</p>
        <p className="duelo-dialogo__motivo">A poluição está tomando o manguezal. Siga pelo litoral e descubra o que a causa.</p>
        <div className="duelo-dialogo__botoes">
          <BotaoRetro id="b-corrupcao-continuar" data-foco-inicial onClick={onContinuar}>
            Continuar
          </BotaoRetro>
        </div>
      </div>
    </div>
  )
}
