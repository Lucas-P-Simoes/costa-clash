import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { urlArquivoOponente } from '../../data/oponentes'
import type { Oponente } from '../../data/oponentes'
import { proximoIndice } from './navegacaoGrade'

interface CartaoProps {
  oponente: Oponente
  selecionado: boolean
  onSelecionar: () => void
  refBotao: (el: HTMLButtonElement | null) => void
}

/** Cartão de adversário: retrato pixel art + nome na faixa inferior. Radio com roving tabindex. */
export function CartaoOponente({ oponente, selecionado, onSelecionar, refBotao }: CartaoProps) {
  return (
    <button
      ref={refBotao}
      type="button"
      role="radio"
      aria-checked={selecionado}
      tabIndex={selecionado ? 0 : -1}
      className="cartao-oponente"
      data-selecionado={selecionado || undefined}
      onClick={onSelecionar}
    >
      <span className="cartao-oponente__arte">
        <img className="cartao-oponente__imagem" src={urlArquivoOponente(oponente.retrato)} alt="" draggable={false} />
      </span>
      <span className="cartao-oponente__nome">{oponente.nome}</span>
    </button>
  )
}

interface GradeProps {
  oponentes: readonly Oponente[]
  selecionadoId: string
  onSelecionar: (id: string) => void
  rotulo?: string
}

/** Grade de seleção (radiogroup). Setas movem foco e seleção; Home/End; Enter/Espaço selecionam via clique nativo. */
export function GradeOponentes({ oponentes, selecionadoId, onSelecionar, rotulo = 'Adversários' }: GradeProps) {
  const grade = useRef<HTMLDivElement>(null)
  const botoes = useRef<Array<HTMLButtonElement | null>>([])

  const colunas = () => {
    const modelo = grade.current ? getComputedStyle(grade.current).gridTemplateColumns : ''
    const trilhas = modelo.split(' ').filter(Boolean)
    // Só confia em trilhas calculadas (px); sem CSS (ex.: jsdom) usa as 4 colunas do desktop.
    return trilhas.length > 0 && trilhas.every((t) => t.endsWith('px')) ? trilhas.length : 4
  }

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const atual = oponentes.findIndex((o) => o.id === selecionadoId)
    const destino = proximoIndice(e.key, atual < 0 ? 0 : atual, oponentes.length, colunas())
    if (destino === null) return
    e.preventDefault()
    onSelecionar(oponentes[destino].id)
    botoes.current[destino]?.focus()
  }

  return (
    <div ref={grade} className="grade-oponentes" role="radiogroup" aria-label={rotulo} onKeyDown={aoTeclar}>
      {oponentes.map((o, i) => (
        <CartaoOponente
          key={o.id}
          oponente={o}
          selecionado={o.id === selecionadoId}
          onSelecionar={() => onSelecionar(o.id)}
          refBotao={(el) => {
            botoes.current[i] = el
          }}
        />
      ))}
    </div>
  )
}
