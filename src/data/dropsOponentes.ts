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
  'mancha-de-oleo': [
    ['CC-006', 7], // Praia Natural (comum)
    ['CC-013', 7], // Banco de Areia (comum)
    ['CC-021', 7], // Garça-Branca (comum)
    ['CC-029', 7], // Sardinha Costeira (comum)
    ['CC-030', 7], // Estrela-do-Mar (comum)
    ['CC-035', 7], // Coleta Seletiva (comum)
    ['CC-036', 7], // Educação Ambiental (comum)
    ['CC-047', 7], // Poluição do Mar (comum)
    ['CC-050', 7], // Chuva Intensa (comum)
    ['CC-052', 7], // Lixo Plástico (comum)
    ['CC-056', 7], // Derramamento de Óleo (comum)
    ['CC-059', 7], // Microplásticos (comum)
    ['CC-060', 7], // Ilha de Calor Urbana (comum)
    ['CC-062', 6], // Supressão de Restinga (comum)
    ['CC-072', 3], // Descarga de Nutrientes (incomum)
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
  'poluicao-plastica': [
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
  'esgoto-clandestino': [
    ['CC-009', 9], // Lagoa Costeira (comum)
    ['CC-015', 9], // Rio de Maré (comum)
    ['CC-017', 5], // Berçário de Peixes (incomum)
    ['CC-020', 5], // Caranguejo-Uçá (incomum)
    ['CC-025', 9], // Ostra de Mangue (comum)
    ['CC-035', 9], // Coleta Seletiva (comum)
    ['CC-043', 2], // Saneamento Integrado (rara)
    ['CC-047', 9], // Poluição do Mar (comum)
    ['CC-050', 9], // Chuva Intensa (comum)
    ['CC-051', 9], // Esgoto Sem Tratamento (comum)
    ['CC-055', 2], // Assoreamento (rara)
    ['CC-060', 9], // Ilha de Calor Urbana (comum)
    ['CC-061', 5], // Drenagem Inadequada (incomum)
    ['CC-066', 5], // Canalização de Rio (incomum)
    ['CC-072', 4], // Descarga de Nutrientes (incomum)
  ],
  'pesca-predatoria': [
    ['CC-017', 4], // Berçário de Peixes (incomum)
    ['CC-019', 4], // Boto-Cinza (incomum)
    ['CC-023', 9], // Peixe-Robalo (comum)
    ['CC-024', 4], // Raia Costeira (incomum)
    ['CC-027', 4], // Golfinho Costeiro (incomum)
    ['CC-029', 9], // Sardinha Costeira (comum)
    ['CC-031', 9], // Pesca Artesanal (comum)
    ['CC-039', 2], // Comunidade Caiçara (rara)
    ['CC-042', 4], // Gestão Participativa (incomum)
    ['CC-047', 9], // Poluição do Mar (comum)
    ['CC-054', 4], // Pesca Predatória (incomum)
    ['CC-058', 4], // Expansão Portuária (incomum)
    ['CC-061', 4], // Drenagem Inadequada (incomum)
    ['CC-063', 4], // Turismo Predatório (incomum)
    ['CC-064', 9], // Sobrepesca (comum)
    ['CC-069', 4], // Dragagem Sem Controle (incomum)
    ['CC-070', 9], // Branqueamento de Corais (comum)
    ['CC-072', 4], // Descarga de Nutrientes (incomum)
  ],
  'especies-invasoras': [
    ['CC-001', 4], // Manguezal Protegido (incomum)
    ['CC-002', 7], // Restinga Preservada (comum)
    ['CC-011', 4], // Manguezal de Franja (incomum)
    ['CC-012', 7], // Marisma Costeira (comum)
    ['CC-013', 7], // Banco de Areia (comum)
    ['CC-020', 4], // Caranguejo-Uçá (incomum)
    ['CC-022', 7], // Cavalo-Marinho (comum)
    ['CC-025', 7], // Ostra de Mangue (comum)
    ['CC-041', 7], // Viveiro de Mudas Nativas (comum)
    ['CC-049', 7], // Desmatamento (comum)
    ['CC-053', 7], // Ocupação Irregular (comum)
    ['CC-058', 4], // Expansão Portuária (incomum)
    ['CC-060', 7], // Ilha de Calor Urbana (comum)
    ['CC-062', 7], // Supressão de Restinga (comum)
    ['CC-065', 4], // Obra Sobre a Duna (incomum)
    ['CC-067', 3], // Invasão de Espécies (incomum)
    ['CC-070', 7], // Branqueamento de Corais (comum)
  ],
  'mare-vermelha': [
    ['CC-003', 4], // Recife de Coral (incomum)
    ['CC-005', 2], // Estuário Vivo (rara)
    ['CC-008', 4], // Pradaria Marinha (incomum)
    ['CC-023', 7], // Peixe-Robalo (comum)
    ['CC-025', 7], // Ostra de Mangue (comum)
    ['CC-028', 7], // Ave Migratória (comum)
    ['CC-029', 7], // Sardinha Costeira (comum)
    ['CC-030', 7], // Estrela-do-Mar (comum)
    ['CC-047', 7], // Poluição do Mar (comum)
    ['CC-050', 7], // Chuva Intensa (comum)
    ['CC-051', 7], // Esgoto Sem Tratamento (comum)
    ['CC-052', 7], // Lixo Plástico (comum)
    ['CC-059', 7], // Microplásticos (comum)
    ['CC-060', 7], // Ilha de Calor Urbana (comum)
    ['CC-061', 3], // Drenagem Inadequada (incomum)
    ['CC-070', 7], // Branqueamento de Corais (comum)
    ['CC-072', 3], // Descarga de Nutrientes (incomum)
  ],
  'residuos-quimicos': [
    ['CC-025', 11], // Ostra de Mangue (comum)
    ['CC-034', 3], // Pesquisa Oceanográfica (rara)
    ['CC-035', 11], // Coleta Seletiva (comum)
    ['CC-037', 3], // Monitoramento da Água (rara)
    ['CC-038', 3], // Fiscalização Costeira (rara)
    ['CC-043', 3], // Saneamento Integrado (rara)
    ['CC-046', 5], // Observatório Costeiro (incomum)
    ['CC-055', 3], // Assoreamento (rara)
    ['CC-056', 11], // Derramamento de Óleo (comum)
    ['CC-057', 5], // Ressaca Marinha (incomum)
    ['CC-058', 5], // Expansão Portuária (incomum)
    ['CC-066', 5], // Canalização de Rio (incomum)
    ['CC-068', 11], // Contaminação Industrial (comum)
    ['CC-069', 5], // Dragagem Sem Controle (incomum)
    ['CC-070', 11], // Branqueamento de Corais (comum)
    ['CC-072', 5], // Descarga de Nutrientes (incomum)
  ],
  mineracao: [
    ['CC-004', 13], // Duna Costeira (comum)
    ['CC-007', 3], // Costão Rochoso (rara)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-016', 6], // Falésia Vegetada (incomum)
    ['CC-040', 3], // Restauração de Dunas (rara)
    ['CC-044', 6], // Proteção de Nascentes (incomum)
    ['CC-045', 3], // Recuperação de Mata Ciliar (rara)
    ['CC-049', 12], // Desmatamento (comum)
    ['CC-053', 12], // Ocupação Irregular (comum)
    ['CC-055', 3], // Assoreamento (rara)
    ['CC-058', 6], // Expansão Portuária (incomum)
    ['CC-062', 12], // Supressão de Restinga (comum)
    ['CC-065', 6], // Obra Sobre a Duna (incomum)
    ['CC-066', 6], // Canalização de Rio (incomum)
    ['CC-069', 6], // Dragagem Sem Controle (incomum)
  ],
  'bitucas-na-areia': [
    ['CC-004', 7], // Duna Costeira (comum)
    ['CC-006', 7], // Praia Natural (comum)
    ['CC-013', 7], // Banco de Areia (comum)
    ['CC-018', 4], // Tartaruga Marinha (incomum)
    ['CC-030', 7], // Estrela-do-Mar (comum)
    ['CC-032', 4], // Turismo Responsável (incomum)
    ['CC-036', 7], // Educação Ambiental (comum)
    ['CC-047', 7], // Poluição do Mar (comum)
    ['CC-050', 7], // Chuva Intensa (comum)
    ['CC-052', 7], // Lixo Plástico (comum)
    ['CC-053', 7], // Ocupação Irregular (comum)
    ['CC-059', 7], // Microplásticos (comum)
    ['CC-060', 7], // Ilha de Calor Urbana (comum)
    ['CC-062', 7], // Supressão de Restinga (comum)
    ['CC-063', 4], // Turismo Predatório (incomum)
    ['CC-072', 4], // Descarga de Nutrientes (incomum)
  ],
  'poluicao-farmacos': [
    ['CC-003', 5], // Recife de Coral (incomum)
    ['CC-019', 5], // Boto-Cinza (incomum)
    ['CC-022', 9], // Cavalo-Marinho (comum)
    ['CC-026', 3], // Coral-Cérebro (rara)
    ['CC-027', 5], // Golfinho Costeiro (incomum)
    ['CC-034', 2], // Pesquisa Oceanográfica (rara)
    ['CC-037', 2], // Monitoramento da Água (rara)
    ['CC-046', 5], // Observatório Costeiro (incomum)
    ['CC-047', 9], // Poluição do Mar (comum)
    ['CC-051', 9], // Esgoto Sem Tratamento (comum)
    ['CC-059', 9], // Microplásticos (comum)
    ['CC-060', 9], // Ilha de Calor Urbana (comum)
    ['CC-061', 5], // Drenagem Inadequada (incomum)
    ['CC-068', 9], // Contaminação Industrial (comum)
    ['CC-070', 9], // Branqueamento de Corais (comum)
    ['CC-072', 5], // Descarga de Nutrientes (incomum)
  ],
  'guardiao-corrompido': [
    ['CC-001', 7], // Manguezal Protegido (incomum)
    ['CC-005', 3], // Estuário Vivo (rara)
    ['CC-007', 3], // Costão Rochoso (rara)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-011', 7], // Manguezal de Franja (incomum)
    ['CC-014', 3], // Ilha Costeira (rara)
    ['CC-016', 7], // Falésia Vegetada (incomum)
    ['CC-048', 13], // Erosão Costeira (comum)
    ['CC-054', 7], // Pesca Predatória (incomum)
    ['CC-056', 13], // Derramamento de Óleo (comum)
    ['CC-057', 6], // Ressaca Marinha (incomum)
    ['CC-065', 6], // Obra Sobre a Duna (incomum)
    ['CC-067', 6], // Invasão de Espécies (incomum)
    ['CC-068', 13], // Contaminação Industrial (comum)
    ['CC-071', 3], // Elevação do Nível do Mar (rara)
  ],
  'ser-humano': [
    ['CC-031', 12], // Pesca Artesanal (comum)
    ['CC-032', 6], // Turismo Responsável (incomum)
    ['CC-033', 3], // Urbanização Planejada (rara)
    ['CC-034', 3], // Pesquisa Oceanográfica (rara)
    ['CC-038', 3], // Fiscalização Costeira (rara)
    ['CC-039', 3], // Comunidade Caiçara (rara)
    ['CC-043', 3], // Saneamento Integrado (rara)
    ['CC-053', 12], // Ocupação Irregular (comum)
    ['CC-054', 6], // Pesca Predatória (incomum)
    ['CC-058', 6], // Expansão Portuária (incomum)
    ['CC-063', 6], // Turismo Predatório (incomum)
    ['CC-064', 11], // Sobrepesca (comum)
    ['CC-065', 6], // Obra Sobre a Duna (incomum)
    ['CC-068', 11], // Contaminação Industrial (comum)
    ['CC-069', 6], // Dragagem Sem Controle (incomum)
    ['CC-071', 3], // Elevação do Nível do Mar (rara)
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
