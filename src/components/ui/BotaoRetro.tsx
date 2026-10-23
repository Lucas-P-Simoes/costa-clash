import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variante?: 'primario' | 'secundario' | 'link'
  icone?: ReactNode
  /** Processando: mantém o foco (aria-disabled), ignora cliques e mostra indicador. */
  ocupado?: boolean
}

export function BotaoRetro({ variante = 'secundario', icone, ocupado = false, className, onClick, children, type = 'button', ...resto }: Props) {
  return (
    <button
      type={type}
      className={`botao botao--${variante} ${className ?? ''}`}
      aria-disabled={ocupado || undefined}
      onClick={(e) => {
        if (ocupado) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
      {...resto}
    >
      {icone ? <span className="botao__icone">{icone}</span> : null}
      {ocupado && variante === 'primario' ? <span className="botao__ocupado" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  )
}
