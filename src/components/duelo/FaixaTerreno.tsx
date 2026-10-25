import type { Carta } from '../../game/tipos'
import { OrnamentoOnda } from '../ui/Icones'
import { efeitoTerreno } from './textoCarta'

/** Faixa central do TERRENO global ativo: nome e efeito aplicável aos dois lados (ou "nenhum"). */
export function FaixaTerreno({ terreno, drop }: { terreno: Carta | undefined; drop?: 'valido' | 'sobre' | null }) {
  const efeito = terreno ? efeitoTerreno(terreno) : null
  return (
    <div className={`duelo-terreno${terreno ? ' duelo-terreno--ativo' : ''}${drop ? ' zona--drop' : ''}${drop === 'sobre' ? ' zona--sobre' : ''}`} data-destino="terreno" aria-dropeffect={drop ? 'move' : undefined} role="group" aria-label="Terreno global">
      <OrnamentoOnda className="duelo-terreno__orn" />
      <span className="duelo-terreno__texto">
        Terreno: <strong>{terreno ? terreno.nome.replace(/^Terreno: */, '') : 'nenhum'}</strong>
        {efeito ? <small className="duelo-terreno__efeito"> {efeito}</small> : null}
        {!terreno ? <small className="duelo-terreno__efeito"> sem bônus ativo</small> : null}
      </span>
      <OrnamentoOnda className="duelo-terreno__orn" espelhado />
    </div>
  )
}
