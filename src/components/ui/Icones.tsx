import type { ReactElement } from 'react'
import { PixelArt } from './PixelArt'
import {
  circulo,
  GRADE_CADEADO,
  GRADE_DPAD,
  GRADE_ESPADAS,
  GRADE_GRUPO,
  GRADE_LIVRO,
  GRADE_OLHO,
  GRADE_OLHO_CORTADO,
  GRADE_ONDA_EMBLEMA,
  GRADE_ORNAMENTO_ONDA,
  GRADE_PESSOA_MAIS,
  GRADE_TARTARUGA,
  GRADE_VOLTAR,
  GRADE_X,
} from './grades'

interface Props {
  className?: string
}

export function IconeLivro({ className }: Props) {
  return (
    <PixelArt
      className={className}
      grade={GRADE_LIVRO}
      paleta={{ B: '#2a4a6a', P: '#e8d8b0', L: '#8a7550', T: '#38d4e8' }}
    />
  )
}

export function IconeCartas({ className }: Props) {
  return (
    <svg className={`pixel-art ${className ?? ''}`} viewBox="0 0 30 24" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <rect x="0" y="5" width="11" height="17" fill="#3a1a14" />
      <rect x="1" y="6" width="9" height="15" fill="#d8643c" />
      <rect x="3" y="9" width="2" height="8" fill="#f0b070" />
      <rect x="6" y="11" width="2" height="6" fill="#f0b070" />
      <rect x="19" y="5" width="11" height="17" fill="#14301f" />
      <rect x="20" y="6" width="9" height="15" fill="#3f9a6a" />
      <rect x="23" y="9" width="4" height="3" fill="#e8d890" />
      <rect x="7" y="0" width="16" height="24" fill="#e8f4f8" />
      <rect x="8" y="1" width="14" height="22" fill="#0e3a78" />
      <rect x="9" y="2" width="12" height="9" fill="#2a78c8" />
      <rect x="11" y="3" width="6" height="2" fill="#bfeaf8" />
      <rect x="10" y="5" width="3" height="2" fill="#7fd4f0" />
      <rect x="13" y="8" width="8" height="8" fill="#1a5aa8" />
      <rect x="9" y="14" width="12" height="8" fill="#0a2a5a" />
      <rect x="14" y="10" width="2" height="2" fill="#f0fbff" />
    </svg>
  )
}

export function IconeEscudoTartaruga({ className }: Props) {
  const meiaDe = (y: number) => (y < 0 || y > 23 ? 0 : y < 14 ? 10 : Math.max(0, Math.round(10 - (y - 14) * 1.05)))
  const linhas: string[] = []
  for (let y = 0; y < 24; y++) {
    const ini = 10 - meiaDe(y)
    const fim = 10 + meiaDe(y)
    let l = ''
    for (let x = 0; x < 20; x++) {
      if (x < ini || x >= fim) l += '.'
      else if (y === 0 || x === ini || x === fim - 1 || x < 10 - meiaDe(y + 1) || x >= 10 + meiaDe(y + 1)) l += 'O'
      else if (x === ini + 1 || x === fim - 2 || y === 1) l += 'T'
      else l += 'I'
    }
    linhas.push(l)
  }
  return (
    <svg className={`pixel-art ${className ?? ''}`} viewBox="0 0 20 24" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <PixelArtRaw grade={linhas} paleta={{ O: '#082030', T: '#38d4e8', I: '#1668a0' }} />
      <g transform="translate(4 7)">
        <PixelArtRaw grade={GRADE_TARTARUGA} paleta={{ X: '#a8f4f8' }} />
      </g>
    </svg>
  )
}

// Versão sem <svg> externo para compor dentro de outro SVG.
function PixelArtRaw({ grade, paleta }: { grade: readonly string[]; paleta: Record<string, string> }) {
  const rects: ReactElement[] = []
  grade.forEach((linha, y) => {
    for (let x = 0; x < linha.length; x++) {
      const cor = paleta[linha[x]]
      if (cor) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={cor} />)
    }
  })
  return <>{rects}</>
}

export function IconeCadeado({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_CADEADO} paleta={{ X: '#9fb4c0', G: '#6a7a88', L: '#8a9aa8', K: '#1a2430' }} />
}

export function IconeOlho({ className, cortado = false }: Props & { cortado?: boolean }) {
  return (
    <PixelArt
      className={className}
      grade={cortado ? GRADE_OLHO_CORTADO : GRADE_OLHO}
      paleta={{ X: '#9fb4c0', W: '#dfeaf0', I: '#38d4e8', K: '#08121c' }}
    />
  )
}

export function IconeEspadas({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_ESPADAS} paleta={{ B: '#e8eef2', L: '#9fb0ba', G: '#f0c050', H: '#6a3a1a' }} />
}

export function IconePessoaMais({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_PESSOA_MAIS} paleta={{ X: '#7fc4e0', P: '#e8f8ff' }} />
}

export function IconeGrupo({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_GRUPO} paleta={{ X: '#7fc4e0' }} />
}

export function IconeDpad({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_DPAD} paleta={{ X: '#8aa4b4' }} />
}

export function IconeBotaoX({ className }: Props) {
  return (
    <svg className={`pixel-art ${className ?? ''}`} viewBox="0 0 15 15" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <PixelArtRaw grade={circulo(15, 1, 'A', 'M')} paleta={{ A: '#7fb4e0', M: '#102a48' }} />
      <g transform="translate(2 2)">
        <PixelArtRaw grade={GRADE_X} paleta={{ A: '#9fd0f0' }} />
      </g>
    </svg>
  )
}

export function IconeBotaoO({ className }: Props) {
  return (
    <svg className={`pixel-art ${className ?? ''}`} viewBox="0 0 15 15" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <PixelArtRaw grade={circulo(15, 1, 'A', 'M')} paleta={{ A: '#ff5a4a', M: '#2a0e12' }} />
      <g transform="translate(3 3)">
        <PixelArtRaw grade={circulo(9, 2, 'A', 'M')} paleta={{ A: '#ff6a5a', M: '#2a0e12' }} />
      </g>
    </svg>
  )
}

export function IconeVoltar({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_VOLTAR} paleta={{ X: '#9fc4d8' }} />
}

export function IconeOndaEmblema({ className }: Props) {
  return (
    <svg className={`pixel-art ${className ?? ''}`} viewBox="0 0 18 18" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <PixelArtRaw grade={circulo(18, 0, 'D')} paleta={{ D: '#061a2c' }} />
      <PixelArtRaw grade={circulo(18, 1, 'T')} paleta={{ T: '#38d4e8' }} />
      <g transform="translate(1 2)">
        <PixelArtRaw grade={GRADE_ONDA_EMBLEMA} paleta={{ W: '#e8fbff', M: '#1a6ac0' }} />
      </g>
    </svg>
  )
}

export function OrnamentoOnda({ className, espelhado = false }: Props & { espelhado?: boolean }) {
  return (
    <PixelArt
      className={`${className ?? ''} ${espelhado ? 'espelhado' : ''}`}
      grade={GRADE_ORNAMENTO_ONDA}
      paleta={{ T: '#1a8aa8', W: '#58d4ec' }}
    />
  )
}
