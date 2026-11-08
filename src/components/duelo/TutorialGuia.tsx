import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { EstadoDuelo } from '../../game'
import { urlArquivoOponente } from '../../data/oponentes'
import type { Arrasto, Balao, Passo } from '../../screens/duelo/tutorial/roteiro'

interface Props {
  passo: Passo
  /** Estado atual do duelo: os alvos do passo dependem dele (zona livre, carta do Guardião...). */
  estado: EstadoDuelo
  /** Posição do passo (1-based) e total, só para o rótulo "Passo x de y". */
  numero: number
  total: number
  onContinuar: () => void
  onPular: () => void
}

/** Marca (e desmarca) os elementos do passo com `data-tutorial-alvo`; o anel vermelho pulsante vem do CSS. */
function useDestaque(seletor: string) {
  // Sem lista de dependências de propósito: o campo muda a cada jogada (zonas surgem), então reaplica a cada render.
  useEffect(() => {
    if (!seletor) return
    const marcados = Array.from(document.querySelectorAll<HTMLElement>(seletor))
    for (const el of marcados) el.setAttribute('data-tutorial-alvo', '')
    return () => {
      for (const el of marcados) el.removeAttribute('data-tutorial-alvo')
    }
  })
}

const centro = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/**
 * "Dedo" que demonstra o arrasto: um círculo vermelho vai do ponto de partida até o destino, em laço
 * (aperta, arrasta, solta). É só desenho: nunca recebe cliques. Sem animação com `prefers-reduced-motion`
 * (as duas pontas continuam pulsando em vermelho).
 */
function DedoArrasto({ arrasto }: { arrasto: Arrasto }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [, forcar] = useState(0)
  useEffect(() => {
    const aoRedimensionar = () => forcar((n) => n + 1)
    window.addEventListener('resize', aoRedimensionar)
    return () => window.removeEventListener('resize', aoRedimensionar)
  }, [])
  // A cada render (o tabuleiro muda) recalcula onde estão as pontas.
  useLayoutEffect(() => {
    const dedo = ref.current
    if (!dedo) return
    const de = document.querySelector(arrasto.de)
    const para = document.querySelector(arrasto.para)
    if (!de || !para) {
      dedo.hidden = true
      return
    }
    const a = centro(de)
    const b = centro(para)
    dedo.hidden = false
    dedo.style.setProperty('--x0', `${a.x}px`)
    dedo.style.setProperty('--y0', `${a.y}px`)
    dedo.style.setProperty('--x1', `${b.x}px`)
    dedo.style.setProperty('--y1', `${b.y}px`)
  })
  return <span ref={ref} className="tutorial-dedo" data-carta={arrasto.carta || undefined} aria-hidden="true" style={{ '--x0': '0px', '--y0': '0px', '--x1': '0px', '--y1': '0px' } as CSSProperties} hidden />
}

/**
 * Balão de fala apontado para um elemento do tabuleiro, com uma setinha na direção dele. Posicionado por medidas
 * (refeitas a cada render e ao redimensionar), sempre dentro da tela. É só desenho: nunca recebe cliques.
 */
function BalaoApontado({ balao }: { balao: Balao }) {
  const ref = useRef<HTMLDivElement>(null)
  const [, forcar] = useState(0)
  useEffect(() => {
    const aoRedimensionar = () => forcar((n) => n + 1)
    window.addEventListener('resize', aoRedimensionar)
    return () => window.removeEventListener('resize', aoRedimensionar)
  }, [])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const alvo = document.querySelector(balao.alvo)
    if (!alvo) {
      el.hidden = true
      return
    }
    el.hidden = false
    const r = alvo.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    const margem = 8
    const folga = 12
    const vw = document.documentElement.clientWidth
    let lado = balao.lado ?? 'cima'
    if (lado === 'cima' && r.top - b.height - folga < margem) lado = 'baixo'
    if (lado === 'baixo' && r.bottom + b.height + folga > window.innerHeight - margem && r.top - b.height - folga >= margem) lado = 'cima'
    if (lado === 'esquerda' && r.left - b.width - folga < margem) lado = 'baixo'
    let left = r.left + r.width / 2 - b.width / 2
    let top = lado === 'cima' ? r.top - b.height - folga : r.bottom + folga
    if (lado === 'esquerda') {
      left = r.left - b.width - folga
      top = r.top + r.height / 2 - b.height / 2
    }
    left = Math.min(Math.max(left, margem), Math.max(margem, vw - b.width - margem))
    top = Math.min(Math.max(top, margem), Math.max(margem, window.innerHeight - b.height - margem))
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.dataset.lado = lado
    // A setinha aponta para o centro do elemento, mesmo quando o balão foi empurrado para dentro da tela.
    const setaX = Math.min(Math.max(r.left + r.width / 2 - left, 14), Math.max(14, b.width - 14))
    const setaY = Math.min(Math.max(r.top + r.height / 2 - top, 14), Math.max(14, b.height - 14))
    el.style.setProperty('--seta-x', `${setaX}px`)
    el.style.setProperty('--seta-y', `${setaY}px`)
  })
  return (
    <div ref={ref} className="tutorial-balao" data-lado={balao.lado ?? 'cima'} aria-hidden="true" hidden>
      {balao.numero ? <span className="tutorial-balao__numero">{balao.numero}</span> : null}
      <span>{balao.texto}</span>
    </div>
  )
}

/** Balão do tutorial: não modal (não bloqueia o jogo), anunciado como status. Só orienta; as jogadas continuam livres. */
export function TutorialGuia({ passo, estado, numero, total, onContinuar, onPular }: Props) {
  const alvo = typeof passo.alvo === 'function' ? passo.alvo(estado) : (passo.alvo ?? '')
  const arrasto = passo.arrasto?.(estado) ?? null
  const balaos = passo.balaos?.(estado) ?? []
  useDestaque(alvo)
  // O balão cobre parte da tela (sobretudo no celular): o jogador pode recolhê-lo para ver o campo todo.
  const [recolhido, setRecolhido] = useState(false)
  // Passo sem alvo no tabuleiro: o que deve ser clicado é o próprio "Continuar", que então pulsa em vermelho.
  const continuarEmDestaque = passo.manual && !alvo
  return (
    <>
      <aside className="tutorial-guia moldura textura-pedra" aria-label="Tutorial do Guardião do Mangue" data-passo={passo.id} data-recolhido={recolhido || undefined}>
        <div className="tutorial-guia__cabeca">
          <img className="tutorial-guia__avatar" src={urlArquivoOponente('guardiao-manguezal.png')} alt="" draggable={false} />
          <div>
            <p className="tutorial-guia__passo">
              Tutorial · passo {numero} de {total}
            </p>
            <h2 className="tutorial-guia__titulo">{passo.titulo}</h2>
          </div>
        </div>
        <p className="tutorial-guia__texto" role="status" aria-live="polite" hidden={recolhido}>
          {passo.texto}
        </p>
        <div className="tutorial-guia__botoes">
          <button type="button" className="botao botao--secundario" aria-expanded={!recolhido} onClick={() => setRecolhido((r) => !r)}>
            <span>{recolhido ? 'Mostrar dica' : 'Ocultar dica'}</span>
          </button>
          {passo.manual ? (
            <button type="button" className="botao botao--primario" data-tutorial-alvo={continuarEmDestaque ? '' : undefined} onClick={onContinuar}>
              <span>Continuar</span>
            </button>
          ) : null}
          <button type="button" className="botao botao--secundario" onClick={onPular}>
            <span>Pular tutorial</span>
          </button>
        </div>
      </aside>
      {balaos.map((b) => (
        <BalaoApontado key={`${passo.id}:${b.alvo}`} balao={b} />
      ))}
      {arrasto ? <DedoArrasto arrasto={arrasto} /> : null}
    </>
  )
}
