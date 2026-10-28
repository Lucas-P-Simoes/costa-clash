import type { ReactElement } from 'react'
import { PixelArt } from './PixelArt'
import {
  circulo,
  GRADE_CADEADO,
  GRADE_CONCHA,
  GRADE_ESPADAS,
  GRADE_LIVRO,
  GRADE_OLHO,
  GRADE_OLHO_CORTADO,
  GRADE_ONDA_EMBLEMA,
  GRADE_ORNAMENTO_ONDA,
  GRADE_PESSOA_MAIS,
  GRADE_TARTARUGA,
  GRADE_VOLTAR,
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

/** Onda larga decorativa do cabeçalho do Duelo Livre. SVG próprio para escalar sem raster borrado. */
export function OrnamentoOndaGrande({ className, espelhado = false }: Props & { espelhado?: boolean }) {
  return (
    <svg
      className={`pixel-art ${className ?? ''} ${espelhado ? 'espelhado' : ''}`}
      viewBox="0 0 160 76"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 69h28c18 0 27-8 34-21 6-11 7-25 18-35C91 4 108 1 123 7c15 6 24 19 21 33-2 11-10 19-21 23 6-12 1-23-9-27-9-4-19 0-23 8-5 10 0 20 12 25h56v7H1z" fill="#05283e" />
      <path d="M10 65h19c14 0 21-7 28-19 7-13 9-29 23-39 12-8 31-9 45-1 10 5 17 14 18 24-6-8-14-13-24-14-14-2-27 6-31 18-5 15 5 29 21 31h50v6H10z" fill="#08799f" />
      <path d="M28 62c12-2 17-10 22-21 5-13 9-27 21-35 10-7 25-8 37-4-19 4-31 15-34 31-4 17 7 31 25 35H28z" fill="#1ab9dc" />
      <path d="M70 11c10-8 28-11 42-5 8 3 16 9 20 16-11-7-24-9-35-4-10 4-17 13-19 24-3-11-7-20-18-24 2-3 5-5 10-7z" fill="#69e3f3" />
      <path d="M95 28c8-8 21-9 31-3 9 5 13 16 9 26-2 6-7 10-13 13 3-8 1-16-5-20-7-5-17-3-22 4-5-6-5-14 0-20z" fill="#0b6089" />
      <path d="M8 67h45l-7 5H8zm102 0h49v5h-56z" fill="#58d9ee" />
      <rect x="18" y="59" width="8" height="4" fill="#82eff8" />
      <rect x="34" y="52" width="6" height="5" fill="#48d4ea" />
      <rect x="52" y="34" width="5" height="8" fill="#82eff8" />
    </svg>
  )
}

/** Concha pixelada para o medidor de dificuldade. */
export function IconeConcha({ className, cheia = true }: Props & { cheia?: boolean }) {
  return (
    <PixelArt
      className={className}
      grade={GRADE_CONCHA}
      paleta={cheia ? { O: '#0a2a3a', X: '#7fe6f6', L: '#2aa4c4' } : { O: '#0a1a24', X: '#4a5862', L: '#2c3840' }}
    />
  )
}

/** Anel com ponto central (ícone ao lado do nome do adversário). */
export function IconeAlvo({ className }: Props) {
  return (
    <svg className={`pixel-art ${className ?? ''}`} viewBox="0 0 15 15" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <PixelArtRaw grade={circulo(15, 2, 'A', 'M')} paleta={{ A: '#58d4ec', M: '#07202e' }} />
      <g transform="translate(4 4)">
        <PixelArtRaw grade={circulo(7, 0, 'A')} paleta={{ A: '#58d4ec' }} />
      </g>
    </svg>
  )
}
