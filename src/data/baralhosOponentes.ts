// Baralhos dos 17 adversários do Duelo Livre. PROVISÓRIOS (aguardam revisão/balanceamento do responsável).
// Cada baralho tem exatamente 40 cartas, no máximo 3 por ID, e é válido pelo validador do motor.
// Temática: segue o `grupo` do oponente (src/data/oponentes.ts). Dificuldade: SÓ pela composição
// (fácil = unidades mais fracas; difícil = unidades mais fortes). Desde 05/11/2026 os baralhos têm só unidades.
// A IA joga com as mesmas regras em todos os níveis (nada de vantagem ilegal).
//
// Remoção das cartas de suporte (equipamentos CC-085..088, armadilhas CC-093..100) e de CC-082 (revelava armadilhas):
// cada cópia removida foi reposta por uma cópia extra de unidade já presente no MESMO baralho, em rodadas pela ordem de
// listagem das unidades, até o teto de 3 por ID. Nenhuma carta nova entra e as demais quantidades não mudam.
//
// Remoção das cartas de ação (CC-073..092 restantes, 2ª remoção): cada cópia removida foi reposta por cópia extra de unidade do mesmo
// baralho, na ordem de listagem, até o teto de 3 por ID.
//
// Observação (histórica; não há mais ações): ações que exigem alvo de um grupo (ex.: CC-073/075/076/081 contra `impacto`) só são jogáveis se o
// adversário tiver unidade desse grupo; nos baralhos de grupo `impacto` priorizam-se cartas sem restrição de grupo.

type Pares = ReadonlyArray<readonly [string, number]>

function montar(pares: Pares): string[] {
  return pares.flatMap(([id, n]) => Array<string>(n).fill(id))
}

const BARALHOS: Readonly<Record<string, Pares>> = {
  // ---- fácil
  'guardiao-manguezal': [
    ['CC-001', 3], ['CC-002', 3], ['CC-004', 3], ['CC-006', 3], ['CC-009', 3], ['CC-011', 3], ['CC-012', 3], ['CC-013', 2],
    ['CC-015', 3], ['CC-010', 3], ['CC-014', 2], ['CC-020', 3], ['CC-025', 2], ['CC-030', 2], ['CC-041', 2],
  ],
  'fiscal-ambiental': [
    ['CC-031', 3], ['CC-032', 3], ['CC-035', 3], ['CC-036', 3], ['CC-037', 3], ['CC-038', 3], ['CC-041', 3], ['CC-042', 3],
    ['CC-045', 2], ['CC-046', 1], ['CC-034', 1], ['CC-033', 1], ['CC-001', 2], ['CC-004', 2], ['CC-006', 1], ['CC-017', 2],
    ['CC-021', 2], ['CC-009', 2],
  ],
  'pescador-tradicional': [
    ['CC-031', 3], ['CC-036', 3], ['CC-035', 3], ['CC-039', 3], ['CC-032', 3], ['CC-041', 3], ['CC-042', 2], ['CC-044', 2],
    ['CC-017', 3], ['CC-020', 3], ['CC-023', 3], ['CC-029', 3], ['CC-022', 3], ['CC-030', 1], ['CC-001', 2],
  ],
  'tartaruga-marinha': [
    ['CC-018', 3], ['CC-017', 3], ['CC-021', 3], ['CC-022', 3], ['CC-024', 3], ['CC-028', 3], ['CC-029', 3], ['CC-030', 3],
    ['CC-025', 3], ['CC-020', 3], ['CC-003', 3], ['CC-006', 2], ['CC-013', 1], ['CC-004', 2], ['CC-036', 2],
  ],
  restinga: [
    ['CC-002', 3], ['CC-004', 3], ['CC-006', 3], ['CC-012', 3], ['CC-013', 3], ['CC-001', 3], ['CC-009', 3], ['CC-011', 3],
    ['CC-015', 3], ['CC-016', 3], ['CC-025', 3], ['CC-030', 2], ['CC-022', 1], ['CC-041', 2], ['CC-044', 2],
  ],
  'comunidade-caicara': [
    ['CC-039', 3], ['CC-031', 3], ['CC-036', 3], ['CC-035', 3], ['CC-041', 3], ['CC-044', 3], ['CC-032', 3], ['CC-042', 3],
    ['CC-045', 3], ['CC-017', 3], ['CC-020', 3], ['CC-023', 1], ['CC-029', 2], ['CC-021', 2], ['CC-001', 2],
  ],
  // ---- médio
  'poluicao-mar': [
    ['CC-047', 3], ['CC-052', 3], ['CC-059', 3], ['CC-051', 3], ['CC-049', 3], ['CC-050', 3], ['CC-060', 3], ['CC-062', 3],
    ['CC-072', 3], ['CC-055', 3], ['CC-053', 3], ['CC-054', 3], ['CC-063', 3], ['CC-048', 1],
  ],
  'erosao-costeira': [
    ['CC-048', 3], ['CC-053', 3], ['CC-065', 3], ['CC-062', 3], ['CC-049', 3], ['CC-061', 3], ['CC-055', 3], ['CC-066', 3],
    ['CC-056', 3], ['CC-069', 3], ['CC-050', 3], ['CC-072', 3], ['CC-060', 3], ['CC-047', 1],
  ],
  ressaca: [
    ['CC-057', 3], ['CC-071', 3], ['CC-056', 3], ['CC-050', 3], ['CC-069', 3], ['CC-068', 3], ['CC-054', 3], ['CC-058', 3],
    ['CC-066', 3], ['CC-052', 3], ['CC-072', 3], ['CC-060', 3], ['CC-070', 3], ['CC-047', 1],
  ],
  coral: [
    ['CC-003', 3], ['CC-005', 3], ['CC-008', 3], ['CC-007', 3], ['CC-010', 3], ['CC-014', 3], ['CC-001', 3], ['CC-016', 3],
    ['CC-011', 2], ['CC-026', 3], ['CC-022', 3], ['CC-017', 3], ['CC-030', 3], ['CC-025', 2],
  ],
  'recuperacao-ambiental': [
    ['CC-010', 3], ['CC-007', 3], ['CC-014', 3], ['CC-005', 3], ['CC-001', 3], ['CC-008', 3], ['CC-003', 3], ['CC-016', 3],
    ['CC-002', 2], ['CC-040', 3], ['CC-041', 3], ['CC-045', 3], ['CC-044', 3], ['CC-036', 2],
  ],
  // ---- difícil
  urbanizacao: [
    ['CC-033', 3], ['CC-043', 3], ['CC-038', 3], ['CC-037', 3], ['CC-034', 3], ['CC-039', 3], ['CC-040', 3], ['CC-046', 3],
    ['CC-042', 3], ['CC-045', 3], ['CC-032', 3], ['CC-031', 3], ['CC-035', 3], ['CC-036', 1],
  ],
  'chuva-intensa': [
    ['CC-050', 3], ['CC-071', 3], ['CC-057', 3], ['CC-061', 3], ['CC-072', 3], ['CC-055', 3], ['CC-058', 3], ['CC-066', 3],
    ['CC-067', 3], ['CC-069', 3], ['CC-056', 3], ['CC-047', 3], ['CC-048', 3], ['CC-049', 1],
  ],
  porto: [
    ['CC-058', 3], ['CC-071', 3], ['CC-068', 3], ['CC-069', 3], ['CC-065', 3], ['CC-067', 3], ['CC-070', 3], ['CC-064', 3],
    ['CC-057', 3], ['CC-066', 3], ['CC-053', 3], ['CC-054', 3], ['CC-047', 3], ['CC-048', 1],
  ],
  'planejamento-costeiro': [
    ['CC-043', 3], ['CC-034', 3], ['CC-037', 3], ['CC-033', 3], ['CC-038', 3], ['CC-046', 3], ['CC-042', 3], ['CC-040', 3],
    ['CC-039', 3], ['CC-045', 3], ['CC-036', 3], ['CC-031', 3], ['CC-032', 3], ['CC-035', 1],
  ],
  'biodiversidade-costeira': [
    ['CC-027', 3], ['CC-019', 3], ['CC-024', 3], ['CC-018', 3], ['CC-023', 3], ['CC-026', 3], ['CC-017', 3], ['CC-020', 3],
    ['CC-028', 3], ['CC-005', 3], ['CC-010', 3], ['CC-021', 3], ['CC-022', 3], ['CC-025', 1],
  ],
  // Oceano Limpo reutiliza explicitamente a composição difícil de Biodiversidade Costeira.
  // A nova identidade visual não introduz balanceamento nem cartas novas nesta etapa.
  'oceano-limpo': [
    ['CC-027', 3], ['CC-019', 3], ['CC-024', 3], ['CC-018', 3], ['CC-023', 3], ['CC-026', 3], ['CC-017', 3], ['CC-020', 3],
    ['CC-028', 3], ['CC-005', 3], ['CC-010', 3], ['CC-021', 3], ['CC-022', 3], ['CC-025', 1],
  ],
}

/** id do oponente (src/data/oponentes.ts) -> 40 IDs de carta. */
export const BARALHOS_OPONENTES: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries(BARALHOS).map(([id, pares]) => [id, montar(pares)]),
)

export function baralhoDoOponente(id: string): readonly string[] | undefined {
  return BARALHOS_OPONENTES[id]
}
