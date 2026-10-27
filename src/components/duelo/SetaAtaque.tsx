interface Ponto {
  x: number
  y: number
}

interface Props {
  origem: Ponto
  destino: Ponto
  lado: 'humano' | 'oponente'
}

/** Seta energética sobre o tabuleiro. É somente apresentação e nunca intercepta ponteiros. */
export function SetaAtaque({ origem, destino, lado }: Props) {
  const dx = destino.x - origem.x
  const dy = destino.y - origem.y
  const distancia = Math.max(1, Math.hypot(dx, dy))
  const curva = Math.min(90, distancia * 0.2)
  const normalX = -dy / distancia
  const normalY = dx / distancia
  const controle = {
    x: (origem.x + destino.x) / 2 + normalX * curva,
    y: (origem.y + destino.y) / 2 + normalY * curva,
  }
  const id = `seta-ataque-${lado}`
  return (
    <svg className={`duelo-seta-ataque duelo-seta-ataque--${lado}`} aria-hidden="true" focusable="false">
      <defs>
        <filter id={`${id}-brilho`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id={`${id}-ponta`} markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="strokeWidth">
          <path d="M 0 0 L 12 6 L 0 12 z" />
        </marker>
      </defs>
      <path
        className="duelo-seta-ataque__trilha"
        d={`M ${origem.x} ${origem.y} Q ${controle.x} ${controle.y} ${destino.x} ${destino.y}`}
        filter={`url(#${id}-brilho)`}
        markerEnd={`url(#${id}-ponta)`}
      />
    </svg>
  )
}
