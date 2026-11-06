// Drop de cartas por adversário do Duelo Livre. PROVISÓRIO (percentuais aguardam revisão/balanceamento do responsável).
// Regra (docs/REGRAS_DO_JOGO.md, "Coleção e drop de cartas"): cada vitória com conta sorteia, NO SERVIDOR, UMA carta da
// tabela do adversário vencido. Cada tabela soma 100%; cartas que o jogador já tem em MAX_COPIAS_COLECAO cópias saem do
// sorteio e as chances restantes são renormalizadas. Sem nenhuma carta disponível, não há drop.
//
// Cada adversário dropa exatamente as cartas distintas do próprio baralho (src/data/baralhosOponentes.ts); juntos cobrem
// as 72 cartas do catálogo. Percentuais gerados por faixa de raridade (peso comum 4, incomum 2, rara 1; arredondados
// para inteiros somando 100): unidades pela força (ATK + DEF; 15 mais fortes = rara, 25 seguintes = incomum, demais =
// comum). (As cartas de suporte, CC-082 e todas as ações foram removidas do jogo; as tabelas foram
// recalculadas pela mesma regra sem elas, com arredondamento por maior resto.) Os números abaixo são a fonte da verdade e podem ser editados à mão.
// Este módulo não importa nada do Vite: o Worker o reutiliza por import relativo.

/** Teto de cópias de uma carta na coleção (igual ao máximo por ID no baralho). */
export const MAX_COPIAS_COLECAO = 3

type Tabela = ReadonlyArray<readonly [cartaId: string, chancePercentual: number]>

export const TABELAS_DROP: Readonly<Record<string, Tabela>> = {
  'guardiao-manguezal': [
    ['CC-001', 4], // Manguezal Protegido (incomum)
    ['CC-002', 9], // Restinga Preservada (comum)
    ['CC-004', 9], // Duna Costeira (comum)
    ['CC-006', 9], // Praia Natural (comum)
    ['CC-009', 9], // Lagoa Costeira (comum)
    ['CC-010', 2], // Mata Atlântica Litorânea (rara)
    ['CC-011', 4], // Manguezal de Franja (incomum)
    ['CC-012', 8], // Marisma Costeira (comum)
    ['CC-013', 8], // Banco de Areia (comum)
    ['CC-014', 2], // Ilha Costeira (rara)
    ['CC-015', 8], // Rio de Maré (comum)
    ['CC-020', 4], // Caranguejo-Uçá (incomum)
    ['CC-025', 8], // Ostra de Mangue (comum)
    ['CC-030', 8], // Estrela-do-Mar (comum)
    ['CC-041', 8], // Viveiro de Mudas Nativas (comum)
  ],
  'fiscal-ambiental': [
    ['CC-001', 4], // Manguezal Protegido (incomum)
    ['CC-004', 9], // Duna Costeira (comum)
    ['CC-006', 9], // Praia Natural (comum)
    ['CC-009', 9], // Lagoa Costeira (comum)
    ['CC-017', 4], // Berçário de Peixes (incomum)
    ['CC-021', 9], // Garça-Branca (comum)
    ['CC-031', 9], // Pesca Artesanal (comum)
    ['CC-032', 4], // Turismo Responsável (incomum)
    ['CC-033', 2], // Urbanização Planejada (rara)
    ['CC-034', 2], // Pesquisa Oceanográfica (rara)
    ['CC-035', 9], // Coleta Seletiva (comum)
    ['CC-036', 8], // Educação Ambiental (comum)
    ['CC-037', 2], // Monitoramento da Água (rara)
    ['CC-038', 2], // Fiscalização Costeira (rara)
    ['CC-041', 8], // Viveiro de Mudas Nativas (comum)
    ['CC-042', 4], // Gestão Participativa (incomum)
    ['CC-045', 2], // Recuperação de Mata Ciliar (rara)
    ['CC-046', 4], // Observatório Costeiro (incomum)
  ],
  'pescador-tradicional': [
    ['CC-001', 5], // Manguezal Protegido (incomum)
    ['CC-017', 5], // Berçário de Peixes (incomum)
    ['CC-020', 4], // Caranguejo-Uçá (incomum)
    ['CC-022', 9], // Cavalo-Marinho (comum)
    ['CC-023', 9], // Peixe-Robalo (comum)
    ['CC-029', 9], // Sardinha Costeira (comum)
    ['CC-030', 9], // Estrela-do-Mar (comum)
    ['CC-031', 9], // Pesca Artesanal (comum)
    ['CC-032', 4], // Turismo Responsável (incomum)
    ['CC-035', 9], // Coleta Seletiva (comum)
    ['CC-036', 9], // Educação Ambiental (comum)
    ['CC-039', 2], // Comunidade Caiçara (rara)
    ['CC-041', 9], // Viveiro de Mudas Nativas (comum)
    ['CC-042', 4], // Gestão Participativa (incomum)
    ['CC-044', 4], // Proteção de Nascentes (incomum)
  ],
  'tartaruga-marinha': [
    ['CC-003', 4], // Recife de Coral (incomum)
    ['CC-004', 8], // Duna Costeira (comum)
    ['CC-006', 8], // Praia Natural (comum)
    ['CC-013', 8], // Banco de Areia (comum)
    ['CC-017', 4], // Berçário de Peixes (incomum)
    ['CC-018', 4], // Tartaruga Marinha (incomum)
    ['CC-020', 4], // Caranguejo-Uçá (incomum)
    ['CC-021', 8], // Garça-Branca (comum)
    ['CC-022', 8], // Cavalo-Marinho (comum)
    ['CC-024', 4], // Raia Costeira (incomum)
    ['CC-025', 8], // Ostra de Mangue (comum)
    ['CC-028', 8], // Ave Migratória (comum)
    ['CC-029', 8], // Sardinha Costeira (comum)
    ['CC-030', 8], // Estrela-do-Mar (comum)
    ['CC-036', 8], // Educação Ambiental (comum)
  ],
  restinga: [
    ['CC-001', 4], // Manguezal Protegido (incomum)
    ['CC-002', 8], // Restinga Preservada (comum)
    ['CC-004', 8], // Duna Costeira (comum)
    ['CC-006', 8], // Praia Natural (comum)
    ['CC-009', 8], // Lagoa Costeira (comum)
    ['CC-011', 4], // Manguezal de Franja (incomum)
    ['CC-012', 8], // Marisma Costeira (comum)
    ['CC-013', 8], // Banco de Areia (comum)
    ['CC-015', 8], // Rio de Maré (comum)
    ['CC-016', 4], // Falésia Vegetada (incomum)
    ['CC-022', 7], // Cavalo-Marinho (comum)
    ['CC-025', 7], // Ostra de Mangue (comum)
    ['CC-030', 7], // Estrela-do-Mar (comum)
    ['CC-041', 7], // Viveiro de Mudas Nativas (comum)
    ['CC-044', 4], // Proteção de Nascentes (incomum)
  ],
  'comunidade-caicara': [
    ['CC-001', 5], // Manguezal Protegido (incomum)
    ['CC-017', 5], // Berçário de Peixes (incomum)
    ['CC-020', 5], // Caranguejo-Uçá (incomum)
    ['CC-021', 10], // Garça-Branca (comum)
    ['CC-023', 10], // Peixe-Robalo (comum)
    ['CC-029', 10], // Sardinha Costeira (comum)
    ['CC-031', 9], // Pesca Artesanal (comum)
    ['CC-032', 5], // Turismo Responsável (incomum)
    ['CC-035', 9], // Coleta Seletiva (comum)
    ['CC-036', 9], // Educação Ambiental (comum)
    ['CC-039', 2], // Comunidade Caiçara (rara)
    ['CC-041', 9], // Viveiro de Mudas Nativas (comum)
    ['CC-042', 5], // Gestão Participativa (incomum)
    ['CC-044', 5], // Proteção de Nascentes (incomum)
    ['CC-045', 2], // Recuperação de Mata Ciliar (rara)
  ],
  'poluicao-mar': [
    ['CC-047', 9], // Poluição do Mar (comum)
    ['CC-048', 9], // Erosão Costeira (comum)
    ['CC-049', 9], // Desmatamento (comum)
    ['CC-050', 9], // Chuva Intensa (comum)
    ['CC-051', 9], // Esgoto Sem Tratamento (comum)
    ['CC-052', 9], // Lixo Plástico (comum)
    ['CC-053', 8], // Ocupação Irregular (comum)
    ['CC-054', 4], // Pesca Predatória (incomum)
    ['CC-055', 2], // Assoreamento (rara)
    ['CC-059', 8], // Microplásticos (comum)
    ['CC-060', 8], // Ilha de Calor Urbana (comum)
    ['CC-062', 8], // Supressão de Restinga (comum)
    ['CC-063', 4], // Turismo Predatório (incomum)
    ['CC-072', 4], // Descarga de Nutrientes (incomum)
  ],
  'erosao-costeira': [
    ['CC-047', 9], // Poluição do Mar (comum)
    ['CC-048', 9], // Erosão Costeira (comum)
    ['CC-049', 9], // Desmatamento (comum)
    ['CC-050', 9], // Chuva Intensa (comum)
    ['CC-053', 9], // Ocupação Irregular (comum)
    ['CC-055', 3], // Assoreamento (rara)
    ['CC-056', 9], // Derramamento de Óleo (comum)
    ['CC-060', 9], // Ilha de Calor Urbana (comum)
    ['CC-061', 5], // Drenagem Inadequada (incomum)
    ['CC-062', 9], // Supressão de Restinga (comum)
    ['CC-065', 5], // Obra Sobre a Duna (incomum)
    ['CC-066', 5], // Canalização de Rio (incomum)
    ['CC-069', 5], // Dragagem Sem Controle (incomum)
    ['CC-072', 5], // Descarga de Nutrientes (incomum)
  ],
  ressaca: [
    ['CC-047', 10], // Poluição do Mar (comum)
    ['CC-050', 10], // Chuva Intensa (comum)
    ['CC-052', 10], // Lixo Plástico (comum)
    ['CC-054', 5], // Pesca Predatória (incomum)
    ['CC-056', 10], // Derramamento de Óleo (comum)
    ['CC-057', 5], // Ressaca Marinha (incomum)
    ['CC-058', 5], // Expansão Portuária (incomum)
    ['CC-060', 10], // Ilha de Calor Urbana (comum)
    ['CC-066', 5], // Canalização de Rio (incomum)
    ['CC-068', 9], // Contaminação Industrial (comum)
    ['CC-069', 5], // Dragagem Sem Controle (incomum)
    ['CC-070', 9], // Branqueamento de Corais (comum)
    ['CC-071', 2], // Elevação do Nível do Mar (rara)
    ['CC-072', 5], // Descarga de Nutrientes (incomum)
  ],
  coral: [
    ['CC-001', 7], // Manguezal Protegido (incomum)
    ['CC-003', 7], // Recife de Coral (incomum)
    ['CC-005', 4], // Estuário Vivo (rara)
    ['CC-007', 3], // Costão Rochoso (rara)
    ['CC-008', 7], // Pradaria Marinha (incomum)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-011', 7], // Manguezal de Franja (incomum)
    ['CC-014', 3], // Ilha Costeira (rara)
    ['CC-016', 7], // Falésia Vegetada (incomum)
    ['CC-017', 7], // Berçário de Peixes (incomum)
    ['CC-022', 14], // Cavalo-Marinho (comum)
    ['CC-025', 14], // Ostra de Mangue (comum)
    ['CC-026', 3], // Coral-Cérebro (rara)
    ['CC-030', 14], // Estrela-do-Mar (comum)
  ],
  'recuperacao-ambiental': [
    ['CC-001', 7], // Manguezal Protegido (incomum)
    ['CC-002', 14], // Restinga Preservada (comum)
    ['CC-003', 7], // Recife de Coral (incomum)
    ['CC-005', 4], // Estuário Vivo (rara)
    ['CC-007', 4], // Costão Rochoso (rara)
    ['CC-008', 7], // Pradaria Marinha (incomum)
    ['CC-010', 4], // Mata Atlântica Litorânea (rara)
    ['CC-014', 4], // Ilha Costeira (rara)
    ['CC-016', 7], // Falésia Vegetada (incomum)
    ['CC-036', 14], // Educação Ambiental (comum)
    ['CC-040', 4], // Restauração de Dunas (rara)
    ['CC-041', 14], // Viveiro de Mudas Nativas (comum)
    ['CC-044', 7], // Proteção de Nascentes (incomum)
    ['CC-045', 3], // Recuperação de Mata Ciliar (rara)
  ],
  urbanizacao: [
    ['CC-031', 15], // Pesca Artesanal (comum)
    ['CC-032', 8], // Turismo Responsável (incomum)
    ['CC-033', 4], // Urbanização Planejada (rara)
    ['CC-034', 4], // Pesquisa Oceanográfica (rara)
    ['CC-035', 15], // Coleta Seletiva (comum)
    ['CC-036', 15], // Educação Ambiental (comum)
    ['CC-037', 4], // Monitoramento da Água (rara)
    ['CC-038', 4], // Fiscalização Costeira (rara)
    ['CC-039', 4], // Comunidade Caiçara (rara)
    ['CC-040', 4], // Restauração de Dunas (rara)
    ['CC-042', 8], // Gestão Participativa (incomum)
    ['CC-043', 4], // Saneamento Integrado (rara)
    ['CC-045', 4], // Recuperação de Mata Ciliar (rara)
    ['CC-046', 7], // Observatório Costeiro (incomum)
  ],
  'chuva-intensa': [
    ['CC-047', 11], // Poluição do Mar (comum)
    ['CC-048', 11], // Erosão Costeira (comum)
    ['CC-049', 11], // Desmatamento (comum)
    ['CC-050', 11], // Chuva Intensa (comum)
    ['CC-055', 3], // Assoreamento (rara)
    ['CC-056', 11], // Derramamento de Óleo (comum)
    ['CC-057', 6], // Ressaca Marinha (incomum)
    ['CC-058', 6], // Expansão Portuária (incomum)
    ['CC-061', 6], // Drenagem Inadequada (incomum)
    ['CC-066', 6], // Canalização de Rio (incomum)
    ['CC-067', 5], // Invasão de Espécies (incomum)
    ['CC-069', 5], // Dragagem Sem Controle (incomum)
    ['CC-071', 3], // Elevação do Nível do Mar (rara)
    ['CC-072', 5], // Descarga de Nutrientes (incomum)
  ],
  porto: [
    ['CC-047', 11], // Poluição do Mar (comum)
    ['CC-048', 11], // Erosão Costeira (comum)
    ['CC-053', 10], // Ocupação Irregular (comum)
    ['CC-054', 5], // Pesca Predatória (incomum)
    ['CC-057', 5], // Ressaca Marinha (incomum)
    ['CC-058', 5], // Expansão Portuária (incomum)
    ['CC-064', 10], // Sobrepesca (comum)
    ['CC-065', 5], // Obra Sobre a Duna (incomum)
    ['CC-066', 5], // Canalização de Rio (incomum)
    ['CC-067', 5], // Invasão de Espécies (incomum)
    ['CC-068', 10], // Contaminação Industrial (comum)
    ['CC-069', 5], // Dragagem Sem Controle (incomum)
    ['CC-070', 10], // Branqueamento de Corais (comum)
    ['CC-071', 3], // Elevação do Nível do Mar (rara)
  ],
  'planejamento-costeiro': [
    ['CC-031', 15], // Pesca Artesanal (comum)
    ['CC-032', 8], // Turismo Responsável (incomum)
    ['CC-033', 4], // Urbanização Planejada (rara)
    ['CC-034', 4], // Pesquisa Oceanográfica (rara)
    ['CC-035', 15], // Coleta Seletiva (comum)
    ['CC-036', 15], // Educação Ambiental (comum)
    ['CC-037', 4], // Monitoramento da Água (rara)
    ['CC-038', 4], // Fiscalização Costeira (rara)
    ['CC-039', 4], // Comunidade Caiçara (rara)
    ['CC-040', 4], // Restauração de Dunas (rara)
    ['CC-042', 8], // Gestão Participativa (incomum)
    ['CC-043', 4], // Saneamento Integrado (rara)
    ['CC-045', 4], // Recuperação de Mata Ciliar (rara)
    ['CC-046', 7], // Observatório Costeiro (incomum)
  ],
  'biodiversidade-costeira': [
    ['CC-005', 3], // Estuário Vivo (rara)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-017', 6], // Berçário de Peixes (incomum)
    ['CC-018', 6], // Tartaruga Marinha (incomum)
    ['CC-019', 6], // Boto-Cinza (incomum)
    ['CC-020', 6], // Caranguejo-Uçá (incomum)
    ['CC-021', 11], // Garça-Branca (comum)
    ['CC-022', 11], // Cavalo-Marinho (comum)
    ['CC-023', 11], // Peixe-Robalo (comum)
    ['CC-024', 6], // Raia Costeira (incomum)
    ['CC-025', 11], // Ostra de Mangue (comum)
    ['CC-026', 3], // Coral-Cérebro (rara)
    ['CC-027', 6], // Golfinho Costeiro (incomum)
    ['CC-028', 11], // Ave Migratória (comum)
  ],
  'oceano-limpo': [
    ['CC-005', 3], // Estuário Vivo (rara)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-017', 6], // Berçário de Peixes (incomum)
    ['CC-018', 6], // Tartaruga Marinha (incomum)
    ['CC-019', 6], // Boto-Cinza (incomum)
    ['CC-020', 6], // Caranguejo-Uçá (incomum)
    ['CC-021', 11], // Garça-Branca (comum)
    ['CC-022', 11], // Cavalo-Marinho (comum)
    ['CC-023', 11], // Peixe-Robalo (comum)
    ['CC-024', 6], // Raia Costeira (incomum)
    ['CC-025', 11], // Ostra de Mangue (comum)
    ['CC-026', 3], // Coral-Cérebro (rara)
    ['CC-027', 6], // Golfinho Costeiro (incomum)
    ['CC-028', 11], // Ave Migratória (comum)
  ],
}

export function tabelaDropDoOponente(oponenteId: string): Tabela | undefined {
  return Object.hasOwn(TABELAS_DROP, oponenteId) ? TABELAS_DROP[oponenteId] : undefined
}

function disponiveisParaDrop(oponenteId: string, colecao: ReadonlyMap<string, number>): Tabela {
  return (tabelaDropDoOponente(oponenteId) ?? []).filter(([id]) => (colecao.get(id) ?? 0) < MAX_COPIAS_COLECAO)
}

/** Chances efetivas (em %) do próximo drop, sem as cartas já no teto da coleção. Vazio = nada a dropar. */
export function chancesDrop(oponenteId: string, colecao: ReadonlyMap<string, number>): Array<{ cartaId: string; chance: number }> {
  const disponiveis = disponiveisParaDrop(oponenteId, colecao)
  const total = disponiveis.reduce((s, [, p]) => s + p, 0)
  return total > 0 ? disponiveis.map(([cartaId, p]) => ({ cartaId, chance: (p * 100) / total })) : []
}

/**
 * Sorteia o drop de uma vitória. `aleatorio` devolve um número em [0, 1) (no servidor: crypto). Função pura.
 * Devolve null quando o adversário não existe ou todas as cartas dele já estão no teto da coleção.
 */
export function sortearDrop(oponenteId: string, colecao: ReadonlyMap<string, number>, aleatorio: () => number): string | null {
  const disponiveis = disponiveisParaDrop(oponenteId, colecao)
  const total = disponiveis.reduce((s, [, p]) => s + p, 0)
  if (total <= 0) return null
  let alvo = Math.min(Math.max(aleatorio(), 0), 1 - Number.EPSILON) * total
  for (const [id, p] of disponiveis) {
    if (alvo < p) return id
    alvo -= p
  }
  return disponiveis[disponiveis.length - 1]![0]
}
