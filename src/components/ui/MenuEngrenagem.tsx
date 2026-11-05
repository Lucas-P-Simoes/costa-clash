import { useState } from 'react'
import type { Oponente } from '../../data/oponentes'

interface Props {
  aberto: boolean
  onAlternar: () => void
  inert?: boolean
  oponentes: readonly Oponente[]
  /** Ids bloqueados agora (pela progressão, já considerando os liberados manuais). */
  bloqueados: ReadonlySet<string>
  /** Ids liberados manualmente (podem ser desmarcados). */
  liberados: readonly string[]
  /** Recebe a lista completa de liberados manuais escolhida. */
  onSalvar: (ids: string[]) => void
}

/** Engrenagem no canto: lista cada adversário com caixa de seleção; marcados são liberados ao salvar. */
export function MenuEngrenagem({ aberto, onAlternar, inert, oponentes, bloqueados, liberados, onSalvar }: Props) {
  return (
    <div className="engrenagem" inert={inert}>
      <button type="button" className="engrenagem__botao" aria-label="Configurações" aria-expanded={aberto} onClick={onAlternar}>
        ⚙
      </button>
      {aberto ? <Lista oponentes={oponentes} bloqueados={bloqueados} liberados={liberados} onSalvar={onSalvar} /> : null}
    </div>
  )
}

// Componente à parte: o estado das caixas nasce ao abrir o menu e some ao fechar.
function Lista({ oponentes, bloqueados, liberados, onSalvar }: Pick<Props, 'oponentes' | 'bloqueados' | 'liberados' | 'onSalvar'>) {
  const [marcados, setMarcados] = useState<ReadonlySet<string>>(() => new Set(liberados))
  const manuais = new Set(liberados)
  // Liberado só pela progressão (vitórias): marcado e fixo. Os demais podem ser marcados/desmarcados.
  const porProgressao = (id: string) => !bloqueados.has(id) && !manuais.has(id)

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual)
      if (!novo.delete(id)) novo.add(id)
      return novo
    })
  }

  const editaveis = oponentes.filter((o) => !porProgressao(o.id))
  const todosMarcados = editaveis.every((o) => marcados.has(o.id))

  return (
    <div className="engrenagem__menu" role="group" aria-label="Desbloquear adversários">
      <p className="engrenagem__titulo">Desbloquear adversários</p>
      <ul className="engrenagem__lista">
        {oponentes.map((o) => {
          const fixo = porProgressao(o.id)
          return (
            <li key={o.id}>
              <label className="engrenagem__linha">
                <input type="checkbox" checked={fixo || marcados.has(o.id)} disabled={fixo} onChange={() => alternar(o.id)} />
                <span>{o.nome}</span>
                {fixo ? <span className="engrenagem__nota">liberado</span> : null}
              </label>
            </li>
          )
        })}
      </ul>
      <div className="engrenagem__acoes">
        <button
          type="button"
          className="engrenagem__item"
          disabled={editaveis.length === 0}
          onClick={() => setMarcados(todosMarcados ? new Set() : new Set(editaveis.map((o) => o.id)))}
        >
          {todosMarcados ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
        <button type="button" className="engrenagem__item engrenagem__item--salvar" onClick={() => onSalvar(editaveis.filter((o) => marcados.has(o.id)).map((o) => o.id))}>
          Salvar
        </button>
      </div>
    </div>
  )
}
