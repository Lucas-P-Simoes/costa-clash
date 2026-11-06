// BARALHO INICIAL PROVISÓRIO (decisão registrada em docs/CONTAS_E_NUVEM.md).
// 40 cartas, no máximo 3 por ID, só unidades (as cartas de suporte e de ação foram removidas do jogo em 05/11/2026;
// as cópias removidas viraram cópias extras das primeiras unidades). A coleção inicial é exatamente este baralho.

const CONTAGENS: ReadonlyArray<readonly [string, number]> = [
  ['CC-001', 3], ['CC-002', 3], ['CC-003', 3], ['CC-004', 3], ['CC-005', 3],
  ['CC-017', 3], ['CC-018', 2], ['CC-019', 3], ['CC-020', 2], ['CC-023', 2],
  ['CC-031', 2], ['CC-032', 2], ['CC-033', 2], ['CC-034', 1], ['CC-037', 1],
  ['CC-047', 2], ['CC-049', 1], ['CC-051', 1], ['CC-052', 1],
]

export const BARALHO_INICIAL: readonly string[] = CONTAGENS.flatMap(([id, n]) => Array<string>(n).fill(id))

/** Coleção inicial = contagem de cada ID do baralho inicial. */
export function colecaoInicial(): Array<{ cartaId: string; quantidade: number }> {
  return CONTAGENS.map(([cartaId, quantidade]) => ({ cartaId, quantidade }))
}
