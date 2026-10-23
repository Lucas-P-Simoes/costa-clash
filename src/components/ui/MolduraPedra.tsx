import type { ElementType, HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** 'interna' = miolo escuro (painéis de conteúdo); padrão = pedra texturizada. */
  variante?: 'pedra' | 'interna'
  children?: ReactNode
}

/** Moldura de pedra com cantoneiras turquesa (estilos em styles/componentes.css). */
export function MolduraPedra({ as: Tag = 'div', variante = 'pedra', className, children, ...resto }: Props) {
  const base = variante === 'interna' ? 'moldura moldura--interna' : 'moldura textura-pedra'
  return (
    <Tag className={`${base} ${className ?? ''}`} {...resto}>
      {children}
    </Tag>
  )
}
