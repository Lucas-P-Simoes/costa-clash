// Drop de cartas por adversário do Duelo Livre. PROVISÓRIO (percentuais aguardam revisão/balanceamento).
// Cada adversário dropa exatamente os IDs distintos do próprio baralho. As tabelas somam 100%, e o conjunto
// cobre as 70 cartas CC-101…CC-170. O Worker reutiliza este módulo sem dependências do Vite.

import { BARALHOS_OPONENTES } from './baralhosOponentes'
import { CATALOGO } from './catalogo'

/** Teto de cópias de uma carta na coleção (igual ao máximo por ID no baralho). */
export const MAX_COPIAS_COLECAO = 3

type Tabela = ReadonlyArray<readonly [cartaId: string, chancePercentual: number]>

const CATALOGO_POR_ID = new Map(CATALOGO.map((carta) => [carta.id, carta]))

function peso(cartaId: string): number {
  const carta = CATALOGO_POR_ID.get(cartaId)
  const soma = (carta?.atk ?? 0) + (carta?.defesa ?? 0)
  return soma >= 4500 ? 1 : soma >= 3000 ? 2 : 4
}

function normalizarTabela(ids: readonly string[]): Tabela {
  const pesos = ids.map(peso)
  const restante = 100 - ids.length
  if (restante < 0) throw new Error('Tabela de drop tem mais de 100 cartas distintas')
  const somaPesos = pesos.reduce((soma, atual) => soma + atual, 0)
  const quotas = pesos.map((atual) => (atual * restante) / somaPesos)
  const chances = quotas.map((quota) => 1 + Math.floor(quota))
  const ordem = quotas
    .map((quota, indice) => ({ indice, resto: quota - Math.floor(quota) }))
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice)
  const faltam = 100 - chances.reduce((soma, chance) => soma + chance, 0)
  for (let i = 0; i < faltam; i += 1) chances[ordem[i].indice] += 1
  return ids.map((id, indice) => [id, chances[indice]] as const)
}

export const TABELAS_DROP: Readonly<Record<string, Tabela>> = Object.fromEntries(
  Object.entries(BARALHOS_OPONENTES).map(([oponenteId, baralho]) => [oponenteId, normalizarTabela([...new Set(baralho)])]),
)

export function tabelaDropDoOponente(oponenteId: string): Tabela | undefined {
  return Object.hasOwn(TABELAS_DROP, oponenteId) ? TABELAS_DROP[oponenteId] : undefined
}

function disponiveisParaDrop(oponenteId: string, colecao: ReadonlyMap<string, number>): Tabela {
  return (tabelaDropDoOponente(oponenteId) ?? []).filter(([id]) => (colecao.get(id) ?? 0) < MAX_COPIAS_COLECAO)
}

/** Chances efetivas (em %) do próximo drop, sem as cartas já no teto da coleção. */
export function chancesDrop(oponenteId: string, colecao: ReadonlyMap<string, number>): Array<{ cartaId: string; chance: number }> {
  const disponiveis = disponiveisParaDrop(oponenteId, colecao)
  const total = disponiveis.reduce((s, [, p]) => s + p, 0)
  return total > 0 ? disponiveis.map(([cartaId, p]) => ({ cartaId, chance: (p * 100) / total })) : []
}

/** Sorteia o drop de uma vitória; devolve null para adversário inválido ou coleção completa. */
export function sortearDrop(oponenteId: string, colecao: ReadonlyMap<string, number>, aleatorio: () => number): string | null {
  const disponiveis = disponiveisParaDrop(oponenteId, colecao)
  const total = disponiveis.reduce((s, [, p]) => s + p, 0)
  if (total <= 0) return null
  let alvo = Math.min(Math.max(aleatorio(), 0), 1 - Number.EPSILON) * total
  for (const [id, p] of disponiveis) {
    if (alvo < p) return id
    alvo -= p
  }
  return disponiveis[disponiveis.length - 1]![0]
}
