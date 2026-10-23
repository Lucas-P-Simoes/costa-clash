import type { CSSProperties } from 'react'

export type Grade = readonly string[]
export type Paleta = Readonly<Record<string, string>>

interface PixelArtProps {
  grade: Grade
  paleta: Paleta
  /** Se informado, vira role="img" com este rótulo; senão é decorativo (aria-hidden). */
  rotulo?: string
  className?: string
  style?: CSSProperties
}

interface Retangulo {
  x: number
  y: number
  w: number
  cor: string
}

// Junta pixels vizinhos da mesma cor em retângulos horizontais (menos nós no SVG).
function retangulos(grade: Grade, paleta: Paleta): Retangulo[] {
  const saida: Retangulo[] = []
  grade.forEach((linha, y) => {
    let x = 0
    while (x < linha.length) {
      const c = linha[x]
      const cor = paleta[c]
      if (!cor) {
        x++
        continue
      }
      let w = 1
      while (linha[x + w] === c) w++
      saida.push({ x, y, w, cor })
      x += w
    }
  })
  return saida
}

/** Renderiza pixel art a partir de uma grade de caracteres; cada caractere mapeia uma cor da paleta ('.' = transparente). */
export function PixelArt({ grade, paleta, rotulo, className, style }: PixelArtProps) {
  const largura = Math.max(...grade.map((l) => l.length))
  const altura = grade.length
  return (
    <svg
      className={`pixel-art ${className ?? ''}`}
      style={style}
      viewBox={`0 0 ${largura} ${altura}`}
      shapeRendering="crispEdges"
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      focusable="false"
    >
      {retangulos(grade, paleta).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.cor} />
      ))}
    </svg>
  )
}
