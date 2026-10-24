import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import '../../styles/moldura-ornamentada.css'

export type TomMoldura = 'ciano' | 'ouro' | 'vermelho' | 'azul'

interface Props extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** Cor da borda luminosa. */
  tom?: TomMoldura
  /** Rótulo da aba no canto superior esquerdo (ex.: "Sua mão"). Decorativo quando `abaOculta`. */
  aba?: ReactNode
  /** Esconde a aba dos leitores de tela (use quando o mesmo texto já existe como título do conteúdo). */
  abaOculta?: boolean
  /** Classe extra do miolo (área de conteúdo). */
  classeMiolo?: string
  children?: ReactNode
}

const CANTOS = ['tl', 'tr', 'bl', 'br'] as const

/**
 * Moldura de pedra ornamentada do tabuleiro: borda de pedra texturizada com linha ciano luminosa, quatro cantos
 * (recorte de `Referencia-telas/Motor-Duelo.png`, espelhado) e miolo escuro. Estilos em `styles/moldura-ornamentada.css`.
 * Só apresentação: os filhos ficam no miolo.
 */
export function MolduraOrnamentada({ as: Tag = 'div', tom = 'ciano', aba, abaOculta, classeMiolo, className, children, ...resto }: Props) {
  return (
    <Tag className={`moldura-orn moldura-orn--${tom} ${className ?? ''}`.trim()} data-moldura="ornamentada" {...resto}>
      {CANTOS.map((c) => (
        <span key={c} className={`moldura-orn__canto moldura-orn__canto--${c}`} aria-hidden="true" />
      ))}
      {aba ? (
        <span className="moldura-orn__aba" aria-hidden={abaOculta ? true : undefined}>
          {aba}
        </span>
      ) : null}
      <div className={`moldura-orn__miolo ${classeMiolo ?? ''}`.trim()}>{children}</div>
    </Tag>
  )
}
