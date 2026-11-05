import { useEffect, useRef } from 'react'
import { historiaDoOponente } from '../../data/historiasOponentes'
import { urlArquivoOponente } from '../../data/oponentes'
import type { Oponente } from '../../data/oponentes'
import { useFocoDialogo } from '../duelo/useFocoDialogo'
import { IconeEspadas, IconeVoltar } from './Icones'

interface Props {
  oponente: Oponente
  onDuelar: () => void
  onFechar: () => void
}

/** Modal com a história do adversário; DUELAR (último botão) inicia a partida. Esc ou clique fora fecham. */
export function DialogoHistoriaOponente({ oponente, onDuelar, onFechar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref)
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      onFechar()
    }
    document.addEventListener('keydown', aoTeclar, true)
    return () => document.removeEventListener('keydown', aoTeclar, true)
  }, [onFechar])

  return (
    <div
      className="drops-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div ref={ref} className="drops-dialogo historia-dialogo" role="dialog" aria-modal="true" aria-labelledby="historia-titulo">
        <h2 id="historia-titulo" className="drops-dialogo__titulo">
          {oponente.nome}
        </h2>
        <div className="historia-dialogo__corpo" tabIndex={0} aria-label={`História de ${oponente.nome}`}>
          <img className="historia-dialogo__retrato" src={urlArquivoOponente(oponente.retrato)} alt="" draggable={false} />
          <div className="historia-dialogo__texto">
            {historiaDoOponente(oponente.id).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
        <div className="historia-dialogo__acoes">
          <button type="button" className="botao botao--secundario" onClick={onFechar}>
            <span className="botao__icone">
              <IconeVoltar />
            </span>
            <span>Fechar</span>
          </button>
          <button type="button" className="botao botao--primario" data-foco-inicial onClick={onDuelar}>
            <span className="botao__icone">
              <IconeEspadas />
            </span>
            <span>Duelar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
