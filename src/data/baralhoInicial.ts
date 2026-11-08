// BARALHO INICIAL PROVISÓRIO (decisão registrada em docs/CONTAS_E_NUVEM.md).
// 40 cartas, no máximo 3 por ID, usando exclusivamente o catálogo atual CC-101…CC-170.
// A coleção inicial é exatamente este baralho.

const CONTAGENS: ReadonlyArray<readonly [string, number]> = [
  ['CC-101', 3], ['CC-102', 3], ['CC-103', 3], ['CC-104', 3], ['CC-105', 3],
  ['CC-106', 3], ['CC-107', 3], ['CC-108', 3], ['CC-109', 3], ['CC-110', 3],
  ['CC-111', 3], ['CC-112', 3], ['CC-113', 3], ['CC-114', 1],
]

export const BARALHO_INICIAL: readonly string[] = CONTAGENS.flatMap(([id, n]) => Array<string>(n).fill(id))

/** Coleção inicial = contagem de cada ID do baralho inicial. */
export function colecaoInicial(): Array<{ cartaId: string; quantidade: number }> {
  return CONTAGENS.map(([cartaId, quantidade]) => ({ cartaId, quantidade }))
}
