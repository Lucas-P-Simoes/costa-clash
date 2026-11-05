import { useEffect, useMemo, useRef } from 'react'
import { arteDaCarta } from '../../arte/arteDisponivel'
import type { ItemColecao } from '../../auth/servicoAuth'
import { CATALOGO } from '../../data/catalogo'
import { MAX_COPIAS_COLECAO } from '../../data/dropsOponentes'
import { ArteCarta } from '../duelo/ArteCarta'
import { rotuloTipo, tipoArte } from '../duelo/textoCarta'
import { useFocoDialogo } from '../duelo/useFocoDialogo'
import { IconeVoltar } from './Icones'

interface Props {
  /** Sem usuário (sem conta): mostra o convite para entrar. */
  logado: boolean
  colecao?: readonly ItemColecao[]
  /** Quantidade de cartas do baralho atual (quando o perfil informa). */
  tamanhoBaralho?: number
  onFechar: () => void
}

/** Modal "Baralho": as cartas que o jogador já ganhou (coleção do servidor), com a quantidade de cópias. */
export function DialogoColecao({ logado, colecao, tamanhoBaralho, onFechar }: Props) {
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

  const itens = useMemo(() => {
    const qtd = new Map((colecao ?? []).map((i) => [i.cartaId, i.quantidade]))
    return CATALOGO.filter((c) => (qtd.get(c.id) ?? 0) > 0).map((carta) => ({ carta, copias: qtd.get(carta.id) ?? 0 }))
  }, [colecao])
  const copias = itens.reduce((t, i) => t + i.copias, 0)

  return (
    <div
      className="drops-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div ref={ref} className="drops-dialogo colecao-dialogo" role="dialog" aria-modal="true" aria-labelledby="colecao-titulo" aria-describedby="colecao-resumo">
        <h2 id="colecao-titulo" className="drops-dialogo__titulo">
          Baralho
        </h2>
        <p id="colecao-resumo" className="drops-dialogo__regra">
          {!logado
            ? 'Entre com uma conta para guardar as cartas que você ganhar nos duelos.'
            : itens.length === 0
              ? 'Você ainda não tem cartas. Vença duelos para ganhar cartas novas: elas aparecem aqui.'
              : `${itens.length} de ${CATALOGO.length} cartas diferentes · ${copias} cópias`}
        </p>
        {logado && tamanhoBaralho ? <p className="drops-dialogo__regra">Seu baralho atual tem {tamanhoBaralho} cartas.</p> : null}
        {itens.length > 0 ? (
          <ul className="colecao-dialogo__lista" tabIndex={0} aria-label={`${itens.length} cartas na coleção`}>
            {itens.map(({ carta, copias: n }) => {
              const arte = arteDaCarta(carta.id)
              return (
                <li key={carta.id} className="colecao-item">
                  <span className="colecao-item__arte" aria-hidden="true">
                    {arte ? <img src={arte.url} alt="" loading="lazy" /> : <ArteCarta tipo={tipoArte(carta)} />}
                    <span className="colecao-item__qtd">×{n}</span>
                  </span>
                  <span className="colecao-item__nome">{carta.nome}</span>
                  <span className="colecao-item__tipo">
                    {rotuloTipo(carta)}
                    {n >= MAX_COPIAS_COLECAO ? ' · completa' : ''}
                  </span>
                  <span className="sr-only">{`${n} ${n === 1 ? 'cópia' : 'cópias'}`}</span>
                </li>
              )
            })}
          </ul>
        ) : null}
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
