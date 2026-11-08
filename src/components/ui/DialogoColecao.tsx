import { useEffect, useMemo, useRef, useState } from 'react'
import { arteDaCarta } from '../../arte/arteDisponivel'
import type { ItemColecao, ResultadoBaralho } from '../../auth/servicoAuth'
import { CATALOGO } from '../../data/catalogo'
import { MAX_COPIAS_COLECAO } from '../../data/dropsOponentes'
import { CARTAS_NO_DUELO, CARTAS_POR_BARALHO } from '../../game/tipos'
import type { Carta } from '../../game/tipos'
import { ArteCarta } from '../duelo/ArteCarta'
import { rotuloTipo, tipoArte } from '../duelo/textoCarta'
import { useFocoDialogo } from '../duelo/useFocoDialogo'
import { DialogoCarta } from './DialogoCarta'
import { IconeVoltar } from './Icones'

interface Props {
  /** Sem usuário (sem conta): mostra o convite para entrar. */
  logado: boolean
  colecao?: readonly ItemColecao[]
  /** Baralho atual do perfil (40 IDs); ausente: o baralho inicial padrão, escolhido pelo chamador. */
  baralho?: readonly string[]
  /** Salva o baralho no servidor. Ausente: o modal só mostra a coleção. */
  onSalvarBaralho?: (cartas: string[]) => Promise<ResultadoBaralho>
  onFechar: () => void
}

/** Conta as cópias por ID; IDs fora do catálogo atual (ex.: cartas removidas do jogo) são ignorados. */
function contar(ids: readonly string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const id of ids) if (CATALOGO.some((c) => c.id === id)) m.set(id, (m.get(id) ?? 0) + 1)
  return m
}

const assinatura = (m: ReadonlyMap<string, number>) => [...m].filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)).map(([id, n]) => `${id}x${n}`).join(',')

function Arte({ carta }: { carta: Carta }) {
  const arte = arteDaCarta(carta.id)
  return <>{arte ? <img src={arte.url} alt="" loading="lazy" /> : <ArteCarta tipo={tipoArte(carta)} />}</>
}

/**
 * Modal "Baralho": seção "Minhas cartas" (toda a coleção ganha) e seção "Meu baralho" (as 40 cartas montadas).
 * O jogador troca cartas entre as duas e salva; o servidor valida (40 cartas, até 3 cópias, só o que possui).
 */
export function DialogoColecao({ logado, colecao, baralho, onSalvarBaralho, onFechar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref)
  const [cartaAberta, setCartaAberta] = useState<Carta | null>(null)
  const cartaAbertaRef = useRef(false)
  useEffect(() => {
    cartaAbertaRef.current = cartaAberta !== null
  }, [cartaAberta])
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || cartaAbertaRef.current) return // com o modal da carta aberto, Esc fecha só ele
      e.stopPropagation()
      e.preventDefault()
      onFechar()
    }
    document.addEventListener('keydown', aoTeclar, true)
    return () => document.removeEventListener('keydown', aoTeclar, true)
  }, [onFechar])

  const posse = useMemo(() => new Map((colecao ?? []).map((i) => [i.cartaId, i.quantidade])), [colecao])
  const salvo = useMemo(() => contar(baralho ?? []), [baralho])
  const [deck, setDeck] = useState<ReadonlyMap<string, number>>(salvo)
  const [estado, setEstado] = useState<{ tipo: 'ocioso' | 'salvando' | 'ok' | 'erro'; texto?: string }>({ tipo: 'ocioso' })

  const minhas = useMemo(() => CATALOGO.filter((c) => (posse.get(c.id) ?? 0) > 0), [posse])
  const noDeck = useMemo(() => CATALOGO.filter((c) => (deck.get(c.id) ?? 0) > 0), [deck])
  const totalDeck = [...deck.values()].reduce((t, n) => t + n, 0)
  const copias = minhas.reduce((t, c) => t + (posse.get(c.id) ?? 0), 0)
  const alterado = assinatura(deck) !== assinatura(salvo)
  const podeEditar = logado && !!onSalvarBaralho
  const cheio = totalDeck >= CARTAS_POR_BARALHO

  function limite(id: string) {
    return Math.min(MAX_COPIAS_COLECAO, posse.get(id) ?? 0)
  }
  function motivoAdicionar(c: Carta): string | null {
    if (cheio) return `O baralho já tem ${CARTAS_POR_BARALHO} cartas: remova uma antes.`
    if ((deck.get(c.id) ?? 0) >= limite(c.id)) return (posse.get(c.id) ?? 0) < MAX_COPIAS_COLECAO ? 'Você já usa todas as cópias que possui.' : `Máximo de ${MAX_COPIAS_COLECAO} cópias no baralho.`
    return null
  }
  function mudar(id: string, delta: 1 | -1) {
    setEstado({ tipo: 'ocioso' })
    setDeck((atual) => {
      const novo = new Map(atual)
      const n = (novo.get(id) ?? 0) + delta
      if (n <= 0) novo.delete(id)
      else novo.set(id, n)
      return novo
    })
  }
  async function salvar() {
    if (!onSalvarBaralho || totalDeck !== CARTAS_POR_BARALHO || estado.tipo === 'salvando') return
    setEstado({ tipo: 'salvando' })
    const cartas = CATALOGO.flatMap((c) => Array<string>(deck.get(c.id) ?? 0).fill(c.id))
    try {
      const r = await onSalvarBaralho(cartas)
      setEstado(r.ok ? { tipo: 'ok', texto: 'Baralho salvo. Ele será usado nos próximos duelos.' } : { tipo: 'erro', texto: r.mensagem })
    } catch {
      setEstado({ tipo: 'erro', texto: 'Não foi possível salvar o baralho.' })
    }
  }

  const resumo = !logado
    ? 'Entre com uma conta para guardar as cartas que você ganhar nos duelos e montar o seu baralho.'
    : minhas.length === 0
      ? 'Você ainda não tem cartas. Vença duelos para ganhar cartas novas: elas aparecem aqui.'
      : `${minhas.length} de ${CATALOGO.length} cartas diferentes · ${copias} cópias`

  return (
    <>
    <div
      className="drops-overlay"
      inert={cartaAberta !== null}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar()
      }}
    >
      <div ref={ref} className="drops-dialogo colecao-dialogo" role="dialog" aria-modal="true" aria-labelledby="colecao-titulo" aria-describedby="colecao-resumo">
        <h2 id="colecao-titulo" className="drops-dialogo__titulo">
          Baralho
        </h2>
        <p id="colecao-resumo" className="drops-dialogo__regra">
          {resumo}
        </p>
        {minhas.length > 0 ? (
          <div className="colecao-dialogo__corpo" data-leitura={!podeEditar || undefined}>
            <section className="colecao-secao" aria-labelledby="colecao-minhas">
              <h3 id="colecao-minhas" className="colecao-secao__titulo">
                Minhas cartas <small>{minhas.length} diferentes</small>
              </h3>
              <ul className="colecao-dialogo__lista" tabIndex={0} aria-label={`${minhas.length} cartas na coleção`}>
                {minhas.map((carta) => {
                  const n = posse.get(carta.id) ?? 0
                  const uso = deck.get(carta.id) ?? 0
                  const motivo = motivoAdicionar(carta)
                  return (
                    <li key={carta.id} className="colecao-item">
                      <button type="button" className="colecao-item__abrir" aria-label={`Ver carta ${carta.nome}`} onClick={() => setCartaAberta(carta)}>
                        <span className="colecao-item__arte" aria-hidden="true">
                          <Arte carta={carta} />
                          <span className="colecao-item__qtd">×{n}</span>
                          <span className="colecao-carta__info">i</span>
                        </span>
                        <span className="colecao-item__nome">{carta.nome}</span>
                        <span className="colecao-item__tipo">
                          {rotuloTipo(carta)}
                          {podeEditar ? ` · no baralho ${uso}/${limite(carta.id)}` : n >= MAX_COPIAS_COLECAO ? ' · completa' : ''}
                        </span>
                      </button>
                      {podeEditar ? (
                        <button type="button" className="colecao-item__botao" aria-disabled={motivo !== null || undefined} title={motivo ?? undefined} aria-label={`Adicionar ${carta.nome} ao baralho`} onClick={() => motivo === null && mudar(carta.id, 1)}>
                          + Adicionar
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
            {podeEditar ? (
            <section className="colecao-secao" aria-labelledby="colecao-baralho">
              <h3 id="colecao-baralho" className="colecao-secao__titulo">
                Meu baralho{' '}
                <small data-completo={totalDeck === CARTAS_POR_BARALHO || undefined} aria-label={`${totalDeck} de ${CARTAS_POR_BARALHO} cartas no baralho`}>
                  {totalDeck}/{CARTAS_POR_BARALHO}
                </small>
              </h3>
              <p className="colecao-secao__nota">Cada duelo usa {CARTAS_NO_DUELO} cartas sorteadas do baralho.</p>
              <ul className="colecao-baralho__lista" tabIndex={0} aria-label={`${noDeck.length} cartas diferentes no baralho`}>
                {noDeck.map((carta) => {
                  const n = deck.get(carta.id) ?? 0
                  return (
                    <li key={carta.id} className="colecao-linha">
                      <button type="button" className="colecao-linha__abrir" aria-label={`Ver carta ${carta.nome}`} onClick={() => setCartaAberta(carta)}>
                        <span className="colecao-linha__arte" aria-hidden="true">
                          <Arte carta={carta} />
                          <span className="colecao-carta__info">i</span>
                        </span>
                        <span className="colecao-linha__texto">
                          <span className="colecao-item__nome">{carta.nome}</span>
                          <span className="colecao-item__tipo">{rotuloTipo(carta)}</span>
                        </span>
                      </button>
                      <strong className="colecao-linha__qtd" aria-label={`${n} no baralho`}>
                        ×{n}
                      </strong>
                      <button type="button" className="colecao-item__botao colecao-linha__remover" aria-label={`Remover ${carta.nome} do baralho`} onClick={() => mudar(carta.id, -1)}>
                        − Remover
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
            ) : null}
          </div>
        ) : null}
        {podeEditar ? (
          <div className="colecao-dialogo__rodape">
            <p className="colecao-dialogo__estado" role="status" data-tipo={estado.tipo}>
              {estado.tipo === 'salvando'
                ? 'Salvando…'
                : (estado.texto ??
                  (alterado ? (totalDeck === CARTAS_POR_BARALHO ? 'Alterações não salvas.' : `Complete o baralho: faltam ${Math.max(0, CARTAS_POR_BARALHO - totalDeck)} cartas.`) : ''))}
            </p>
            <button type="button" className="botao botao--secundario" disabled={!alterado || estado.tipo === 'salvando'} onClick={() => { setDeck(salvo); setEstado({ tipo: 'ocioso' }) }}>
              <span>Desfazer</span>
            </button>
            <button type="button" className="botao botao--primario" aria-disabled={!alterado || totalDeck !== CARTAS_POR_BARALHO || estado.tipo === 'salvando' || undefined} onClick={salvar}>
              <span>Salvar baralho</span>
            </button>
          </div>
        ) : null}
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
