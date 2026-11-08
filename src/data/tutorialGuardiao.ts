// Tutorial do Guardião do Mangue (oponente 1). PROVISÓRIO (aguarda revisão do responsável).
// Os dois baralhos usam exclusivamente CC-101…CC-170 e entram em ordem fixa; só as 30 primeiras
// cartas participam do duelo. O Guardião usa unidades fracas e não ataca (src/game/iaTutorial.ts).

/** Id do oponente que abre o tutorial (src/data/oponentes.ts). */
export const ID_OPONENTE_TUTORIAL = 'guardiao-manguezal'

/** Vida reduzida para a lição ser curta; decisão ainda provisória. */
export const LP_GUARDIAO_TUTORIAL = 2000

export const BARALHO_JOGADOR_TUTORIAL: readonly string[] = [
  'CC-110', 'CC-138', 'CC-164', 'CC-101', 'CC-117',
  'CC-170', 'CC-167', 'CC-126', 'CC-150', 'CC-115',
  'CC-110', 'CC-138', 'CC-164', 'CC-170', 'CC-167',
  'CC-126', 'CC-150', 'CC-115', 'CC-118', 'CC-132',
  'CC-101', 'CC-117', 'CC-118', 'CC-132', 'CC-105',
  'CC-110', 'CC-138', 'CC-164', 'CC-170', 'CC-167',
  'CC-126', 'CC-150', 'CC-115', 'CC-118', 'CC-132',
  'CC-101', 'CC-117', 'CC-105', 'CC-105', 'CC-103',
]

export const BARALHO_GUARDIAO_TUTORIAL: readonly string[] = [
  'CC-131', 'CC-107', 'CC-153', 'CC-128', 'CC-147',
  'CC-131', 'CC-107', 'CC-153', 'CC-128', 'CC-147',
  'CC-131', 'CC-107', 'CC-153', 'CC-128', 'CC-147',
  'CC-106', 'CC-152', 'CC-124', 'CC-129', 'CC-104',
  'CC-112', 'CC-113', 'CC-114', 'CC-106', 'CC-152',
  'CC-124', 'CC-129', 'CC-104', 'CC-112', 'CC-113',
  'CC-114', 'CC-106', 'CC-152', 'CC-124', 'CC-129',
  'CC-104', 'CC-112', 'CC-113', 'CC-114', 'CC-119',
]
