import type { ReactNode } from 'react'
import { MolduraOrnamentada } from '../ui/MolduraOrnamentada'
import { IconeCoracaoVida, IconeMonitor, IconePessoa } from './iconesDuelo'

export type LadoPainel = 'oponente' | 'voce'

interface Props {
  lado: LadoPainel
  nome: string
  subtitulo: string
  vida: number
  /** Texto acessível da vida (ex.: "Sua vida: 8000"). */
  rotuloVida: string
  rotuloContagens: string
  baralho: number
  descarte: number
  rotuloZonas: string
  rotuloSuportes: string
  /** As 5 zonas de unidade (já renderizadas). */
  zonas: ReactNode
  /** As 5 zonas de suporte (já renderizadas). */
  suportes: ReactNode
  /** Versos da mão do oponente (nunca cartas reais). */
  maoOponente?: ReactNode
  /** Ação extra no cabeçalho (ex.: ATAQUE DIRETO). */
  acao?: ReactNode
  /** Efeitos temporários da vida (pulso de dano/cura com o valor). */
  vidaFx?: { dano?: number; cura?: number } | null
  /** Destino de arrasto "campo" (ações sem alvo): destaca o painel. */
  drop?: boolean
  dataDestino?: string
}

/**
 * Painel de um lado do tabuleiro: placa com avatar e identificação, VIDA com coração, contagens (baralho/descarte),
 * as 5 zonas de unidade e a faixa de 5 suportes. Só apresentação: zonas e suportes chegam prontos.
 */
export function PainelJogador({ lado, nome, subtitulo, vida, rotuloVida, rotuloContagens, baralho, descarte, rotuloZonas, rotuloSuportes, zonas, suportes, maoOponente, acao, vidaFx, drop, dataDestino }: Props) {
  const oponente = lado === 'oponente'
  const efeitoVida = vidaFx?.dano ? ' duelo-vida--dano' : vidaFx?.cura ? ' duelo-vida--cura' : ''
  return (
    <MolduraOrnamentada tom="ciano" className={`duelo-lado duelo-lado--${lado}${drop ? ' duelo-lado--drop' : ''}`} classeMiolo="duelo-lado__miolo" data-destino={dataDestino}>
      <div className="duelo-lado__topo">
        <div className={`duelo-placa duelo-placa--${lado}`}>
          <span className={`duelo-avatar duelo-avatar--${lado}`} aria-hidden="true">
            {oponente ? <IconeMonitor /> : <IconePessoa />}
          </span>
          <div className={`duelo-nome duelo-nome--${lado}`}>
            <h2>{nome}</h2>
            <p>{subtitulo}</p>
          </div>
        </div>
        <p className={`duelo-vida duelo-vida--${lado}${efeitoVida}`} aria-label={rotuloVida}>
          <IconeCoracaoVida className="duelo-coracao" cor={oponente ? '#ff5a4a' : '#3fdcf0'} />
          <span>Vida:</span> <strong>{vida}</strong>
          {vidaFx?.dano ? (
            <span className="duelo-vida__delta duelo-vida__delta--dano" aria-hidden="true">
              -{vidaFx.dano}
            </span>
          ) : vidaFx?.cura ? (
            <span className="duelo-vida__delta duelo-vida__delta--cura" aria-hidden="true">
              +{vidaFx.cura}
            </span>
          ) : null}
        </p>
        <ul className="duelo-contagens" aria-label={rotuloContagens}>
          <li>Baralho: {baralho}</li>
          <li>Descarte: {descarte}</li>
        </ul>
        {maoOponente}
        {acao}
      </div>
      <div className="duelo-lado__campo">
        <div className="duelo-zonas" role="group" aria-label={rotuloZonas}>
          {zonas}
        </div>
        <div className="duelo-suportes" role="group" aria-label={rotuloSuportes}>
          {suportes}
        </div>
      </div>
    </MolduraOrnamentada>
  )
}
