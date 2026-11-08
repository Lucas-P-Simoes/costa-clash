// Tutorial do Guardião do Mangue (oponente 1). PROVISÓRIO (aguarda revisão do responsável).
// O duelo do tutorial não embaralha: os dois baralhos já estão na ordem de compra (as 5 primeiras são a mão e as
// seguintes, as compras), para a lição sempre funcionar. Só as 30 primeiras de cada baralho entram no duelo.
// O Guardião usa unidades fracas e, no tutorial, não ataca (ver src/game/iaTutorial.ts).

/** Id do oponente que abre o tutorial (src/data/oponentes.ts). */
export const ID_OPONENTE_TUTORIAL = 'guardiao-manguezal'

/**
 * Vida inicial do Guardião no tutorial (o jogador mantém a vida normal). Reduzida para a lição ser curta;
 * decisão do coordenador a confirmar com o dono (ver docs/REGRAS_DO_JOGO.md). Para voltar à vida normal, use 5000.
 */
export const LP_GUARDIAO_TUTORIAL = 2000

type Pares = ReadonlyArray<readonly [string, number]>

const montar = (pares: Pares): string[] => pares.flatMap(([id, n]) => Array<string>(n).fill(id))

// Jogador: mão com uma unidade forte (CC-043) e outras; as compras seguintes são unidades fortes.
// 043 x3, 019 x3, 027 x3, 038 x3 (fortes) + complemento até 40.
export const BARALHO_JOGADOR_TUTORIAL: readonly string[] = [
  // mão inicial
  'CC-043', 'CC-032', 'CC-019', 'CC-001', 'CC-017',
  // compras
  'CC-027', 'CC-038', 'CC-043', 'CC-019', 'CC-027', 'CC-038', 'CC-043', 'CC-019', 'CC-027', 'CC-038',
  ...montar([['CC-032', 2], ['CC-001', 2], ['CC-017', 2], ['CC-002', 3], ['CC-003', 3], ['CC-004', 3], ['CC-005', 3], ['CC-006', 3], ['CC-018', 3], ['CC-020', 1]]),
]

// Guardião: unidades fracas (ATK <= 1500).
export const BARALHO_GUARDIAO_TUTORIAL: readonly string[] = [
  'CC-029', 'CC-035', 'CC-021', 'CC-028', 'CC-022',
  'CC-029', 'CC-035', 'CC-021', 'CC-028', 'CC-022',
  'CC-029', 'CC-035', 'CC-021', 'CC-028', 'CC-022',
  ...montar([['CC-006', 3], ['CC-015', 3], ['CC-013', 3], ['CC-030', 3], ['CC-025', 3], ['CC-009', 3], ['CC-012', 3], ['CC-002', 3], ['CC-004', 1]]),
]
