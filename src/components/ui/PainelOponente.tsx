import { useState } from 'react'
import type { ReactNode } from 'react'
import { urlArquivoOponente } from '../../data/oponentes'
import type { Oponente } from '../../data/oponentes'
import { IconeAlvo } from './Icones'
import { MedidorDificuldade } from './MedidorDificuldade'
import { MolduraPedra } from './MolduraPedra'

interface Props {
  oponente: Oponente
  /** Mensagem de estado (ex.: "em breve"); aparece em região role="status". */
  aviso?: ReactNode
  /** Botões de ação (INICIAR DUELO, BARALHO, VOLTAR/SAIR). */
  children?: ReactNode
}

/** Painel de detalhe do adversário selecionado: nome, arte grande, dificuldade, descrição e ações. */
export function PainelOponente({ oponente, aviso, children }: Props) {
  // "Ler mais": só aparece no layout compacto (CSS); guarda de qual adversário é a expansão.
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const expandido = expandidoId === oponente.id
  const arte = urlArquivoOponente(oponente.retratoGrande ?? oponente.retrato)
  return (
    <MolduraPedra as="section" variante="interna" className="painel-oponente" data-aviso={aviso ? '' : undefined} data-expandido={expandido ? '' : undefined} aria-label="Detalhes do adversário">
      <div className="painel-oponente__arte">
        <img key={oponente.id} className="painel-oponente__imagem" src={arte} alt={`Arte do adversário ${oponente.nome}`} />
      </div>
      <div className="painel-oponente__nome">
        <IconeAlvo className="painel-oponente__icone" />
        <h2 className="painel-oponente__titulo">{oponente.nome}</h2>
      </div>
      <div className="painel-oponente__info">
        <h3 className="painel-oponente__rotulo">Dificuldade</h3>
        <MedidorDificuldade nivel={oponente.dificuldade} />
        <h3 className="painel-oponente__rotulo painel-oponente__rotulo--desc">Descrição</h3>
        <p id="descricao-oponente" className="painel-oponente__descricao">
          {oponente.descricao}
        </p>
        <button
          type="button"
          className="painel-oponente__mais"
          aria-expanded={expandido}
          aria-controls="descricao-oponente"
          onClick={() => setExpandidoId(expandido ? null : oponente.id)}
        >
          {expandido ? 'Ler menos' : 'Ler mais'}
        </button>
      </div>
      <section className="painel-oponente__recompensas" aria-labelledby="titulo-recompensas-oponente">
        <h3 id="titulo-recompensas-oponente" className="painel-oponente__recompensas-titulo">Cartas que podem ser obtidas</h3>
        <p className="painel-oponente__recompensas-vazio">Recompensas ainda não disponíveis.</p>
      </section>
      <div className="painel-oponente__aviso" role="status">
        {aviso}
      </div>
      <div className="painel-oponente__acoes">{children}</div>
    </MolduraPedra>
  )
}
