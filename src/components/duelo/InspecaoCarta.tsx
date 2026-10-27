import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CATEGORIAS, classificarCarta } from '../../arte/categorias'
import type { Carta } from '../../game/tipos'
import type { Posicao } from '../../game'
import { CartaVerso, CartaView } from './CartaView'
import { efeitoCurto, rotuloTipo } from './textoCarta'
import { calcularDimensoesInspecao, calcularPosicaoInspecao } from './geometriaCartas'

export type ConteudoInspecao =
  | { oculta: true; posicao?: Posicao }
  | { oculta: false; carta: Carta; atk?: number; def?: number; posicao?: Posicao }

export interface FonteInspecao {
  chave: string
  conteudo: ConteudoInspecao
  gatilho: 'ponteiro' | 'foco' | 'toque'
}

interface Props {
  fonte: FonteInspecao
  toque: boolean
  /** A chave ainda existe na visão pública atual. */
  valida?: boolean
  onInvalidar: () => void
}

function elementoDaFonte(chave: string): HTMLElement | null {
  const origem = [...document.querySelectorAll<HTMLElement>('[data-inspecionavel]')].find((elemento) => elemento.dataset.inspecionavel === chave)
  if (!origem) return null
  return origem.classList.contains('carta') ? origem : origem.querySelector<HTMLElement>('.carta')
}

function limitesDaInspecao() {
  const visual = window.visualViewport
  const leftViewport = visual?.offsetLeft ?? 0
  const topViewport = visual?.offsetTop ?? 0
  const rightViewport = leftViewport + (visual?.width ?? window.innerWidth)
  let bottomViewport = topViewport + (visual?.height ?? window.innerHeight)
  const tabuleiro = document.querySelector<HTMLElement>('.duelo-tabuleiro')?.getBoundingClientRect()
  const barra = document.querySelector<HTMLElement>('.duelo-acoes')
  const barraRect = barra?.getBoundingClientRect()
  if (barra && barraRect && getComputedStyle(barra).position === 'fixed' && barraRect.height > 0) {
    bottomViewport = Math.min(bottomViewport, barraRect.top)
  }
  const limiteDireito = tabuleiro && tabuleiro.right > leftViewport ? Math.min(rightViewport, tabuleiro.right) : rightViewport
  const alturaViewport = visual?.height ?? window.innerHeight
  // Em paisagem baixa cada pixel vertical importa: 1 px ainda separa a prévia
  // da viewport/barra, sem reservar duas margens de 12 px além do padding.
  const margem = alturaViewport <= 559 ? 1 : 12
  return {
    limites: {
      left: Math.max(leftViewport, tabuleiro?.left ?? leftViewport),
      top: topViewport,
      right: limiteDireito,
      bottom: bottomViewport,
    },
    alturaViewport,
    margem,
  }
}

/**
 * Uma única camada visual, fora do fluxo e sem eventos. A carta original segue
 * sendo o único alvo de foco, clique e arrasto.
 */
export function InspecaoCarta({ fonte, toque, valida = true, onInvalidar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const invalidarRef = useRef(onInvalidar)
  const [, setRevisao] = useState(0)
  const conteudo = fonte.conteudo
  const origem = elementoDaFonte(fonte.chave)?.getBoundingClientRect() ?? null
  const geometria = limitesDaInspecao()
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const larguraOrigem = origem && origem.width > 0 ? origem.width : 100
  const dimensoes = calcularDimensoesInspecao({
    larguraOrigem,
    larguraDisponivel: Math.max(1, geometria.limites.right - geometria.limites.left - geometria.margem * 2),
    alturaDisponivel: Math.max(1, geometria.limites.bottom - geometria.limites.top - geometria.margem * 2),
    alturaViewport: geometria.alturaViewport,
    toque,
    comDetalhes: !conteudo.oculta,
    rem,
  })

  useLayoutEffect(() => {
    invalidarRef.current = onInvalidar
  }, [onInvalidar])

  useLayoutEffect(() => {
    let quadro = 0
    const reposicionar = () => {
      if (quadro) return
      quadro = window.requestAnimationFrame(() => {
        quadro = 0
        setRevisao((n) => n + 1)
      })
    }
    window.addEventListener('resize', reposicionar)
    window.addEventListener('scroll', reposicionar, true)
    window.visualViewport?.addEventListener('resize', reposicionar)
    window.visualViewport?.addEventListener('scroll', reposicionar)
    return () => {
      if (quadro) window.cancelAnimationFrame(quadro)
      window.removeEventListener('resize', reposicionar)
      window.removeEventListener('scroll', reposicionar, true)
      window.visualViewport?.removeEventListener('resize', reposicionar)
      window.visualViewport?.removeEventListener('scroll', reposicionar)
    }
  }, [])

  useLayoutEffect(() => {
    const painel = ref.current
    const elemento = elementoDaFonte(fonte.chave)
    if (!painel || !valida || !elemento) {
      if (painel) painel.style.visibility = 'hidden'
      invalidarRef.current()
      return
    }
    const o = elemento.getBoundingClientRect()
    const { limites, margem } = limitesDaInspecao()
    const p = calcularPosicaoInspecao(o, painel.offsetWidth, painel.offsetHeight, limites, margem)
    painel.style.left = `${p.left}px`
    painel.style.top = `${p.top}px`
    painel.style.visibility = 'visible'
  })

  const classificacao = conteudo.oculta ? null : classificarCarta(conteudo.carta)
  return (
    <div
      ref={ref}
      className={`duelo-inspecao ${conteudo.oculta ? 'duelo-inspecao--verso' : 'duelo-inspecao--carta'}${toque ? ' duelo-inspecao--toque' : ''}`}
      data-inspecao={conteudo.oculta ? 'verso' : 'carta'}
      aria-hidden="true"
      data-escala={dimensoes.escala.toFixed(3)}
      style={
        {
          '--inspecao-carta-largura': `${dimensoes.larguraCarta}px`,
          width: dimensoes.larguraPainel,
          left: -9999,
          top: -9999,
          visibility: 'hidden',
        } as CSSProperties
      }
    >
      <div className="duelo-inspecao__carta">
        {conteudo.oculta ? (
          <CartaVerso tamanho="mao" posicao={conteudo.posicao} rotulo="Carta virada para baixo" />
        ) : (
          <CartaView carta={conteudo.carta} atk={conteudo.atk} def={conteudo.def} posicao={conteudo.posicao} tamanho="mao" rotulo={conteudo.carta.nome} />
        )}
      </div>
      {conteudo.oculta ? (
        <p className="duelo-inspecao__oculta">Carta virada para baixo</p>
      ) : (
        <div className="duelo-inspecao__detalhes">
          <p className="duelo-inspecao__tipo">
            {rotuloTipo(conteudo.carta)} · {CATEGORIAS[classificacao!.categoria].rotulo}
          </p>
          {conteudo.carta.tipo === 'unidade' ? null : <p className="duelo-inspecao__efeito">{efeitoCurto(conteudo.carta)}</p>}
          <p className="duelo-inspecao__educacao">{conteudo.carta.educacao}</p>
        </div>
      )}
    </div>
  )
}
