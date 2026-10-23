import { CATALOGO } from '../data/catalogo'
import { CARTAS_POR_BARALHO, MAX_COPIAS } from './tipos'
import type { Carta } from './tipos'

export type ResultadoValidacaoBaralho = { ok: true } | { ok: false; erros: string[] }

/** Valida um baralho de duelo: exatamente 40 cartas, no máximo 3 por ID, só IDs existentes. */
export function validarBaralhoDuelo(ids: readonly string[], catalogo: readonly Carta[] = CATALOGO): ResultadoValidacaoBaralho {
  const erros: string[] = []
  if (!Array.isArray(ids)) return { ok: false, erros: ['O baralho deve ser uma lista de IDs de cartas.'] }
  if (ids.length !== CARTAS_POR_BARALHO) {
    erros.push(`O baralho deve ter exatamente ${CARTAS_POR_BARALHO} cartas (tem ${ids.length}).`)
  }
  const conhecidos = new Set(catalogo.map((c) => c.id))
  const contagem = new Map<string, number>()
  const desconhecidos = new Set<string>()
  for (const id of ids) {
    if (typeof id !== 'string' || !conhecidos.has(id)) {
      desconhecidos.add(String(id))
      continue
    }
    contagem.set(id, (contagem.get(id) ?? 0) + 1)
  }
  for (const id of [...desconhecidos].sort()) erros.push(`ID de carta desconhecido: ${id}.`)
  for (const [id, n] of [...contagem].sort(([a], [b]) => a.localeCompare(b))) {
    if (n > MAX_COPIAS) erros.push(`A carta ${id} aparece ${n} vezes (máximo ${MAX_COPIAS}).`)
  }
  return erros.length === 0 ? { ok: true } : { ok: false, erros }
}
