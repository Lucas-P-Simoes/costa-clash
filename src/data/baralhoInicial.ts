// BARALHO INICIAL PROVISÓRIO (decisão registrada em docs/CONTAS_E_NUVEM.md).
// 40 cartas, no máximo 3 por ID: 26 unidades (7 ecossistema, 7 fauna, 7 atividade, 5 impacto),
// 10 ações e 4 armadilhas. A coleção inicial é exatamente este baralho.

const CONTAGENS: ReadonlyArray<readonly [string, number]> = [
  // ecossistema
  ['CC-001', 2], ['CC-002', 1], ['CC-003', 2], ['CC-004', 1], ['CC-005', 1],
  // fauna
  ['CC-017', 2], ['CC-018', 1], ['CC-019', 2], ['CC-020', 1], ['CC-023', 1],
  // atividade
  ['CC-031', 1], ['CC-032', 2], ['CC-033', 2], ['CC-034', 1], ['CC-037', 1],
  // impacto
  ['CC-047', 2], ['CC-049', 1], ['CC-051', 1], ['CC-052', 1],
  // ações instantâneas, equipamentos e terrenos
  ['CC-073', 1], ['CC-074', 1], ['CC-075', 1], ['CC-076', 1], ['CC-077', 1], ['CC-078', 1],
  ['CC-085', 1], ['CC-086', 1], ['CC-089', 1], ['CC-090', 1],
  // armadilhas
  ['CC-093', 1], ['CC-094', 1], ['CC-095', 1], ['CC-096', 1],
]

export const BARALHO_INICIAL: readonly string[] = CONTAGENS.flatMap(([id, n]) => Array<string>(n).fill(id))

/** Coleção inicial = contagem de cada ID do baralho inicial. */
export function colecaoInicial(): Array<{ cartaId: string; quantidade: number }> {
  return CONTAGENS.map(([cartaId, quantidade]) => ({ cartaId, quantidade }))
}
