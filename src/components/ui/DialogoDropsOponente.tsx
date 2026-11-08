import { useEffect, useMemo, useRef, useState } from 'react'
import { arteDaCarta } from '../../arte/arteDisponivel'
import type { ItemColecao } from '../../auth/servicoAuth'
import { CATALOGO } from '../../data/catalogo'
import { chancesDrop, MAX_COPIAS_COLECAO, tabelaDropDoOponente } from '../../data/dropsOponentes'
import type { Oponente } from '../../data/oponentes'
import type { Carta } from '../../game/tipos'
import { ArteCarta } from '../duelo/ArteCarta'
import { rotuloTipo, tipoArte } from '../duelo/textoCarta'
import { useFocoDialogo } from '../duelo/useFocoDialogo'
import { IconeVoltar } from './Icones'
import { DialogoCarta } from './DialogoCarta'

interface Props {
  oponente: Oponente
  /** Coleção do usuário logado: mostra cópias e desconta do sorteio as cartas no teto. Ausente = chances base. */
  colecao?: ItemColecao[]
  onFechar: () => void
}

const FORMATO_CHANCE = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Pop-up com as cartas que o adversário pode dropar e a chance de cada uma (dados de src/data/dropsOponentes.ts). */
export function DialogoDropsOponente({ oponente, colecao, onFechar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref)
  const [cartaAberta, setCartaAberta] = useState<Carta | null>(null)
  const cartaAbertaRef = useRef(false)
  useEffect(() => {
    cartaAbertaRef.current = cartaAberta !== null
  }, [cartaAberta])
  // Esc fecha só o pop-up, mesmo com o foco no body (clique em texto): captura no document antes do atalho "voltar" da tela.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || cartaAbertaRef.current) return
      e.stopPropagation()
      e.preventDefault()
      onFechar()
    }
    document.addEventListener('keydown', aoTeclar, true)
    return () => document.removeEventListener('keydown', aoTeclar, true)
  }, [onFechar])

  const linhas = useMemo(() => {
    const qtd = new Map((colecao ?? []).map((i) => [i.cartaId, i.quantidade]))
    const efetivas = new Map(chancesDrop(oponente.id, qtd).map((c) => [c.cartaId, c.chance]))
    return (tabelaDropDoOponente(oponente.id) ?? [])
      .map(([id]) => ({ carta: CATALOGO.find((c) => c.id === id)!, chance: efetivas.get(id) ?? 0, copias: qtd.get(id) ?? 0 }))
      .sort((a, b) => b.chance - a.chance || a.carta.id.localeCompare(b.carta.id))
  }, [oponente.id, colecao])
  const temCompletas = !!colecao && linhas.some((l) => l.copias >= MAX_COPIAS_COLECAO)

  return (
    <>
      <div
        className="drops-overlay"
        inert={cartaAberta !== null}
        onClick={(e) => {
          if (e.target === e.currentTarget) onFechar()
        }}
      >
        <div ref={ref} className="drops-dialogo" role="dialog" aria-modal="true" aria-labelledby="drops-titulo" aria-describedby="drops-regra">
        <h2 id="drops-titulo" className="drops-dialogo__titulo">
          Cartas de {oponente.nome}
        </h2>
        <p id="drops-regra" className="drops-dialogo__regra">
          Cada vitória com conta rende 1 carta sorteada desta lista. Máximo de {MAX_COPIAS_COLECAO} cópias por carta.
          {temCompletas ? ' As chances já descontam as cartas que você completou.' : ''}
        </p>
        {/* Focável: quem usa só teclado consegue rolar a lista quando ela transborda. */}
        <ul className="drops-dialogo__lista" tabIndex={0} aria-label={`${linhas.length} cartas possíveis`}>
          {linhas.map(({ carta, chance, copias }) => {
            const arte = arteDaCarta(carta.id)
            const completa = !!colecao && copias >= MAX_COPIAS_COLECAO
            return (
              <li key={carta.id} className="drops-item" data-completa={completa ? '' : undefined}>
                <span className="drops-item__arte" aria-hidden="true">
                  {arte ? <img src={arte.url} alt="" loading="lazy" /> : <ArteCarta tipo={tipoArte(carta)} />}
                </span>
                <span className="drops-item__texto">
                  <span className="drops-item__nome">{carta.nome}</span>
                  <span className="drops-item__tipo">
                    {rotuloTipo(carta)}
                    {colecao ? ` · você tem ${copias}/${MAX_COPIAS_COLECAO}` : ''}
                  </span>
                </span>
                <button type="button" className="drops-item__info" aria-label={`Informações sobre ${carta.nome}`} onClick={() => setCartaAberta(carta)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="9" />
                    <circle className="drops-item__info-ponto" cx="12" cy="8" r="1.25" />
                    <path d="M12 11v6" />
                  </svg>
                </button>
                <span className="drops-item__chance">{completa ? 'Completa' : `${FORMATO_CHANCE.format(chance)}%`}</span>
              </li>
            )
          })}
        </ul>
        <button type="button" className="botao botao--secundario drops-dialogo__fechar" data-foco-inicial onClick={onFechar}>
          <span className="botao__icone">
            <IconeVoltar />
          </span>
          <span>Fechar</span>
        </button>
        </div>
      </div>
      {cartaAberta ? <DialogoCarta carta={cartaAberta} onFechar={() => setCartaAberta(null)} /> : null}
    </>
  )
}
