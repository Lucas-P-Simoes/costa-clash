import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { arteDaCarta } from '../../arte/arteDisponivel'
import { historiaDaCarta } from '../../data/historiasCartas'
import type { Carta } from '../../game/tipos'
import { ArteCarta } from '../duelo/ArteCarta'
import { efeitoCurto, rotuloTipo, tipoArte } from '../duelo/textoCarta'
import { useFocoDialogo } from '../duelo/useFocoDialogo'
import { IconeVoltar } from './Icones'

type Aba = 'carta' | 'historia'
const ABAS: ReadonlyArray<{ id: Aba; rotulo: string }> = [
  { id: 'carta', rotulo: 'Carta' },
  { id: 'historia', rotulo: 'História' },
]

interface Props {
  carta: Carta
  onFechar: () => void
}

/** Modal de uma carta: aba "Carta" (imagem grande e dados) e aba "História" (o verso: a lore da carta). */
export function DialogoCarta({ carta, onFechar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref)
  const [aba, setAba] = useState<Aba>('carta')
  useEffect(() => {
    const aoTeclar = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      onFechar()
    }
    document.addEventListener('keydown', aoTeclar, true)
    return () => document.removeEventListener('keydown', aoTeclar, true)
  }, [onFechar])

  function aoTeclarAbas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const i = ABAS.findIndex((a) => a.id === aba)
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? ABAS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ABAS.length) % ABAS.length
    setAba(ABAS[j].id)
    document.getElementById(`aba-carta-${ABAS[j].id}`)?.focus()
  }

  const arte = arteDaCarta(carta.id)
  const historia = historiaDaCarta(carta.id) ?? carta.educacao

  return (
    <div
      className="drops-overlay drops-overlay--carta"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div ref={ref} className="drops-dialogo carta-dialogo" role="dialog" aria-modal="true" aria-labelledby="carta-titulo">
        <h2 id="carta-titulo" className="drops-dialogo__titulo">
          {carta.nome}
        </h2>
        <div className="carta-dialogo__abas" role="tablist" aria-label="Detalhes da carta" onKeyDown={aoTeclarAbas}>
          {ABAS.map((a) => (
            <button
              key={a.id}
              id={`aba-carta-${a.id}`}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              aria-controls={`painel-carta-${a.id}`}
              tabIndex={aba === a.id ? 0 : -1}
              className="carta-dialogo__aba"
              onClick={() => setAba(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
        {aba === 'carta' ? (
          <div id="painel-carta-carta" role="tabpanel" aria-labelledby="aba-carta-carta" className="carta-dialogo__painel carta-dialogo__painel--frente">
            <div className="carta-dialogo__arte">{arte ? <img src={arte.url} alt={`Ilustração: ${carta.nome}`} /> : <ArteCarta tipo={tipoArte(carta)} />}</div>
            <div className="carta-dialogo__dados">
              <p className="carta-dialogo__tipo">{rotuloTipo(carta)}</p>
              {carta.tipo === 'unidade' ? (
                <p className="carta-dialogo__atributos">
                  <span>ATK {carta.atk}</span>
                  <span>DEF {carta.defesa}</span>
                </p>
              ) : null}
              <p className="carta-dialogo__efeito">{efeitoCurto(carta)}</p>
              <p className="carta-dialogo__educacao">{carta.educacao}</p>
            </div>
          </div>
        ) : (
          <div id="painel-carta-historia" role="tabpanel" aria-labelledby="aba-carta-historia" className="carta-dialogo__painel carta-dialogo__painel--verso" tabIndex={0}>
            <p className="carta-dialogo__lore">{historia}</p>
          </div>
        )}
        <button type="button" className="botao botao--secundario drops-dialogo__fechar" data-foco-inicial onClick={onFechar}>
          <span className="botao__icone">
            <IconeVoltar />
          </span>
          <span>Fechar</span>
        </button>
      </div>
    </div>
  )
}
