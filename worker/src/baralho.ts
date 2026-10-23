import { IDS_CATALOGO } from './catalogo'

export const CARTAS_POR_BARALHO = 40
export const MAX_COPIAS = 3

export type ResultadoBaralho = { ok: true; cartas: string[] } | { ok: false; mensagem: string }

/** Conta ocorrências de cada ID. */
export function contar(ids: readonly string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1)
  return m
}

/**
 * Valida um baralho: exatamente 40 cartas, máx. 3 por ID, IDs do catálogo e
 * quantidades dentro da coleção do usuário. `colecao` mapeia ID -> quantidade possuída.
 */
export function validarBaralho(entrada: unknown, colecao: ReadonlyMap<string, number>, catalogo: ReadonlySet<string> = IDS_CATALOGO): ResultadoBaralho {
  if (!Array.isArray(entrada) || entrada.some((x) => typeof x !== 'string')) {
    return { ok: false, mensagem: 'O baralho deve ser uma lista de IDs de cartas.' }
  }
  const ids = entrada as string[]
  if (ids.length !== CARTAS_POR_BARALHO) {
    return { ok: false, mensagem: `O baralho precisa ter exatamente ${CARTAS_POR_BARALHO} cartas.` }
  }
  const contagem = contar(ids)
  for (const [id, n] of contagem) {
    if (!catalogo.has(id)) return { ok: false, mensagem: 'O baralho contém uma carta desconhecida.' }
    if (n > MAX_COPIAS) return { ok: false, mensagem: `Use no máximo ${MAX_COPIAS} cópias da mesma carta.` }
    if (n > (colecao.get(id) ?? 0)) return { ok: false, mensagem: 'O baralho usa mais cópias do que você possui na coleção.' }
  }
  return { ok: true, cartas: ids }
}
