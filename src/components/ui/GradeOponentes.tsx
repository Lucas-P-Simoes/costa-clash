import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { urlArquivoOponente } from '../../data/oponentes'
import type { Oponente } from '../../data/oponentes'
import { IconeCadeado } from './Icones'
import { proximoIndice } from './navegacaoGrade'

interface CartaoProps {
  oponente: Oponente
  selecionado: boolean
  onSelecionar: () => void
  refBotao: (el: HTMLButtonElement | null) => void
  bloqueado?: boolean
  /** Pulsa em vermelho (adversário que precisa ser enfrentado). */
  alerta?: boolean
  /** Texto do balão de fala sobre o cartão (ex.: "Vença-me primeiro…"). */
  balao?: string
  /** Posição horizontal do balão, para não sair da grade nas pontas. */
  ancora?: 'inicio' | 'centro' | 'fim'
  /** Lado do balão: 'baixo' na primeira linha, onde não há espaço acima (a tela corta o excesso). */
  lado?: 'cima' | 'baixo'
  onBloqueadoClick?: () => void
}

/** Cartão de adversário: retrato pixel art + nome na faixa inferior. Radio com roving tabindex. Bloqueado: cinza com cadeado. */
export function CartaoOponente({ oponente, selecionado, onSelecionar, refBotao, bloqueado = false, alerta = false, balao, ancora = 'centro', lado = 'cima', onBloqueadoClick }: CartaoProps) {
  return (
    <button
      ref={refBotao}
      type="button"
      role="radio"
      aria-checked={selecionado}
      aria-disabled={bloqueado || undefined}
      aria-label={bloqueado ? `${oponente.nome} (bloqueado: derrote o adversário anterior)` : undefined}
      tabIndex={selecionado ? 0 : -1}
      className="cartao-oponente"
      data-selecionado={selecionado || undefined}
      data-bloqueado={bloqueado || undefined}
      data-alerta={alerta || undefined}
      onClick={bloqueado ? onBloqueadoClick : onSelecionar}
    >
      <span className="cartao-oponente__arte">
        <img className="cartao-oponente__imagem" src={urlArquivoOponente(oponente.retrato)} alt="" draggable={false} />
        {bloqueado ? <IconeCadeado className="cartao-oponente__cadeado" /> : null}
      </span>
      <span className="cartao-oponente__nome">{oponente.nome}</span>
      {balao ? (
        <span className="cartao-oponente__balao" data-ancora={ancora} data-lado={lado} role="status">
          {balao}
        </span>
      ) : null}
    </button>
  )
}

/** Atalho que abre a coleção de cartas do jogador. */
export function CartaoBaralho({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" className="cartao-oponente cartao-oponente--baralho" aria-haspopup="dialog" aria-label="Coleção de cartas" onClick={onClick}>
      <span className="cartao-oponente__arte">
        <img className="cartao-oponente__imagem" src={urlArquivoOponente('baralho.png')} alt="" draggable={false} />
      </span>
      <span className="cartao-oponente__nome">Baralho</span>
    </button>
  )
}

interface GradeProps {
  oponentes: readonly Oponente[]
  selecionadoId: string
  onSelecionar: (id: string) => void
  rotulo?: string
  /** Ids bloqueados: não selecionáveis, exibidos em cinza com cadeado. */
  bloqueados?: ReadonlySet<string>
  /** Clique/Enter/Espaço num cartão liberado (setas só movem a seleção). */
  onAbrir?: (id: string) => void
  /** Clique num cartão bloqueado. */
  onBloqueadoClick?: (id: string) => void
  /** Id do cartão que pulsa em vermelho. */
  alertaId?: string
  /** Clique no cartão Baralho. */
  onBaralho?: () => void
  /** Texto do balão exibido sobre o cartão `alertaId`. */
  balao?: string
}

/** Grade de seleção (radiogroup). Setas movem foco e seleção; Home/End; Enter/Espaço selecionam via clique nativo. */
export function GradeOponentes({ oponentes, selecionadoId, onSelecionar, rotulo = 'Adversários', bloqueados, onAbrir, onBloqueadoClick, alertaId, balao, onBaralho }: GradeProps) {
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
    if (bloqueados?.has(oponentes[destino].id)) return
    onSelecionar(oponentes[destino].id)
    botoes.current[destino]?.focus()
  }

  return (
    <div ref={grade} className="grade-oponentes">
      <div className="grade-oponentes__radios" role="radiogroup" aria-label={rotulo} onKeyDown={aoTeclar}>
        {oponentes.map((o, i) => (
          <CartaoOponente
            key={o.id}
            oponente={o}
            selecionado={o.id === selecionadoId}
            bloqueado={bloqueados?.has(o.id)}
            alerta={o.id === alertaId}
            balao={o.id === alertaId ? balao : undefined}
            lado={i < 6 ? 'baixo' : 'cima'}
            ancora={i % 6 === 0 ? 'inicio' : i % 6 === 5 ? 'fim' : 'centro'}
            onBloqueadoClick={() => onBloqueadoClick?.(o.id)}
            onSelecionar={() => {
              onSelecionar(o.id)
              onAbrir?.(o.id)
            }}
            refBotao={(el) => {
              botoes.current[i] = el
            }}
          />
        ))}
      </div>
      <CartaoBaralho onClick={onBaralho} />
    </div>
  )
}
