// BARALHO INICIAL PROVISÓRIO (decisão registrada em docs/CONTAS_E_NUVEM.md).
// 40 cartas, no máximo 3 por ID: 32 unidades (12 ecossistema, 8 fauna, 7 atividade, 5 impacto)
// e 8 ações (6 instantâneas e 2 terrenos). A coleção inicial é exatamente este baralho.
// As 6 cópias de equipamentos/armadilhas removidas do jogo foram repostas por cópias extras das primeiras unidades.

const CONTAGENS: ReadonlyArray<readonly [string, number]> = [
  // ecossistema
  ['CC-001', 3], ['CC-002', 2], ['CC-003', 3], ['CC-004', 2], ['CC-005', 2],
  // fauna
  ['CC-017', 3], ['CC-018', 1], ['CC-019', 2], ['CC-020', 1], ['CC-023', 1],
  // atividade
  ['CC-031', 1], ['CC-032', 2], ['CC-033', 2], ['CC-034', 1], ['CC-037', 1],
  // impacto
  ['CC-047', 2], ['CC-049', 1], ['CC-051', 1], ['CC-052', 1],
  // ações instantâneas e terrenos
  ['CC-073', 1], ['CC-074', 1], ['CC-075', 1], ['CC-076', 1], ['CC-077', 1], ['CC-078', 1],
  ['CC-089', 1], ['CC-090', 1],
]

export const BARALHO_INICIAL: readonly string[] = CONTAGENS.flatMap(([id, n]) => Array<string>(n).fill(id))

/** Coleção inicial = contagem de cada ID do baralho inicial. */
export function colecaoInicial(): Array<{ cartaId: string; quantidade: number }> {
  return CONTAGENS.map(([cartaId, quantidade]) => ({ cartaId, quantidade }))
}
