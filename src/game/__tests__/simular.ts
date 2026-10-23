// Auxiliares de simulação IA x IA (usados pelos testes e por scripts de estatística).
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { criarDuelo, executarTurnoIA } from '../duelo'
import { invariantes } from '../estado'
import type { EstadoDuelo, MotivoFim } from '../estado'

export const BARALHOS_SIMULACAO: ReadonlyArray<{ nome: string; ids: readonly string[] }> = [
  { nome: 'inicial', ids: BARALHO_INICIAL },
  ...Object.entries(BARALHOS_OPONENTES).map(([nome, ids]) => ({ nome, ids })),
]

export interface PartidaSimulada {
  estado: EstadoDuelo
  turnos: number
  fallbacks: number
  violacoes: string[]
  vencedor: 'humano' | 'oponente' | null
  motivo: MotivoFim | null
}

/** Joga uma partida inteira com a IA nos dois lados. `limiteTurnos` evita laços infinitos (nunca deve ser atingido). */
export function simularIAxIA(baralhoA: readonly string[], baralhoB: readonly string[], seed: number, limiteTurnos = 200): PartidaSimulada {
  const r = criarDuelo({ baralhoJogador: baralhoA, baralhoOponente: baralhoB, seed })
  if (!r.ok) throw new Error(r.erros.join('; '))
  let estado = r.estado
  let fallbacks = 0
  const violacoes: string[] = []
  let iteracoes = 0
  while (!estado.resultado && iteracoes++ < limiteTurnos) {
    const t = executarTurnoIA(estado)
    if (!t.ok) throw new Error(`turno da IA rejeitado: ${t.erro}`)
    fallbacks += t.eventos.filter((e) => e.tipo === 'ia_fallback').length
    violacoes.push(...invariantes(t.estado).map((v) => `turno ${t.estado.turno}: ${v}`))
    estado = t.estado
  }
  return {
    estado,
    turnos: estado.turno,
    fallbacks,
    violacoes,
    vencedor: estado.resultado?.vencedor ?? null,
    motivo: estado.resultado?.motivo ?? null,
  }
}
