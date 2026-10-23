import type { InputHTMLAttributes, ReactNode, Ref } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  rotulo: string
  erro?: string
  valido?: boolean
  icone?: ReactNode
  /** Ação à direita (ex.: botão mostrar/ocultar senha). */
  acao?: ReactNode
  inputRef?: Ref<HTMLInputElement>
}

export function CampoRetro({ id, rotulo, erro, valido, icone, acao, inputRef, className, ...resto }: Props) {
  const idErro = `${id}-erro`
  const estado = erro ? 'erro' : valido ? 'valido' : 'normal'
  return (
    <div className={`campo ${className ?? ''}`} data-estado={estado}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <div className="campo__caixa">
        {icone ? <span className="campo__icone">{icone}</span> : null}
        <input
          id={id}
          ref={inputRef}
          className="campo__entrada"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          {...resto}
        />
        {acao}
      </div>
      <div className="campo__reserva">
        {erro ? (
          <p id={idErro} role="alert" className="campo__erro">
            {erro}
          </p>
        ) : null}
      </div>
    </div>
  )
}
