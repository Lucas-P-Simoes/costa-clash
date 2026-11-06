// Drop de cartas por adversário do Duelo Livre. PROVISÓRIO (percentuais aguardam revisão/balanceamento do responsável).
// Regra (docs/REGRAS_DO_JOGO.md, "Coleção e drop de cartas"): cada vitória com conta sorteia, NO SERVIDOR, UMA carta da
// tabela do adversário vencido. Cada tabela soma 100%; cartas que o jogador já tem em MAX_COPIAS_COLECAO cópias saem do
// sorteio e as chances restantes são renormalizadas. Sem nenhuma carta disponível, não há drop.
//
// Cada adversário dropa exatamente as cartas distintas do próprio baralho (src/data/baralhosOponentes.ts); juntos cobrem
// as 87 cartas do catálogo. Percentuais gerados por faixa de raridade (peso comum 4, incomum 2, rara 1; arredondados
// para inteiros somando 100): unidades pela força (ATK + DEF; 15 mais fortes = rara, 25 seguintes = incomum, demais =
// comum), ações = incomum. (As cartas de suporte e CC-082 foram removidas do jogo; as tabelas foram
// recalculadas pela mesma regra sem elas, com arredondamento por maior resto.) Os números abaixo são a fonte da verdade e podem ser editados à mão.
// Este módulo não importa nada do Vite: o Worker o reutiliza por import relativo.

/** Teto de cópias de uma carta na coleção (igual ao máximo por ID no baralho). */
export const MAX_COPIAS_COLECAO = 3

type Tabela = ReadonlyArray<readonly [cartaId: string, chancePercentual: number]>

export const TABELAS_DROP: Readonly<Record<string, Tabela>> = {
  'guardiao-manguezal': [
    ['CC-001', 4], // Manguezal Protegido (incomum)
    ['CC-002', 7], // Restinga Preservada (comum)
    ['CC-004', 7], // Duna Costeira (comum)
    ['CC-006', 7], // Praia Natural (comum)
    ['CC-009', 7], // Lagoa Costeira (comum)
    ['CC-010', 2], // Mata Atlântica Litorânea (rara)
    ['CC-011', 4], // Manguezal de Franja (incomum)
    ['CC-012', 7], // Marisma Costeira (comum)
    ['CC-013', 7], // Banco de Areia (comum)
    ['CC-014', 2], // Ilha Costeira (rara)
    ['CC-015', 7], // Rio de Maré (comum)
    ['CC-020', 4], // Caranguejo-Uçá (incomum)
    ['CC-025', 7], // Ostra de Mangue (comum)
    ['CC-030', 7], // Estrela-do-Mar (comum)
    ['CC-041', 7], // Viveiro de Mudas Nativas (comum)
    ['CC-074', 4], // Recuperação Ambiental (incomum)
    ['CC-079', 4], // Campanha Educativa (incomum)
    ['CC-084', 3], // Manejo da Bacia (incomum)
    ['CC-089', 3], // Terreno: Manguezal (incomum)
  ],
  'fiscal-ambiental': [
    ['CC-001', 4], // Manguezal Protegido (incomum)
    ['CC-004', 7], // Duna Costeira (comum)
    ['CC-006', 7], // Praia Natural (comum)
    ['CC-009', 7], // Lagoa Costeira (comum)
    ['CC-017', 4], // Berçário de Peixes (incomum)
    ['CC-021', 7], // Garça-Branca (comum)
    ['CC-031', 7], // Pesca Artesanal (comum)
    ['CC-032', 4], // Turismo Responsável (incomum)
    ['CC-033', 2], // Urbanização Planejada (rara)
    ['CC-034', 2], // Pesquisa Oceanográfica (rara)
    ['CC-035', 7], // Coleta Seletiva (comum)
    ['CC-036', 7], // Educação Ambiental (comum)
    ['CC-037', 2], // Monitoramento da Água (rara)
    ['CC-038', 2], // Fiscalização Costeira (rara)
    ['CC-041', 7], // Viveiro de Mudas Nativas (comum)
    ['CC-042', 4], // Gestão Participativa (incomum)
    ['CC-045', 2], // Recuperação de Mata Ciliar (rara)
    ['CC-046', 4], // Observatório Costeiro (incomum)
    ['CC-073', 4], // Tratamento de Esgoto (incomum)
    ['CC-075', 4], // Fiscalização Ambiental (incomum)
    ['CC-076', 3], // Limpeza de Praia (incomum)
    ['CC-078', 3], // Plano Diretor Costeiro (incomum)
  ],
  'pescador-tradicional': [
    ['CC-001', 4], // Manguezal Protegido (incomum)
    ['CC-017', 4], // Berçário de Peixes (incomum)
    ['CC-020', 4], // Caranguejo-Uçá (incomum)
    ['CC-022', 7], // Cavalo-Marinho (comum)
    ['CC-023', 7], // Peixe-Robalo (comum)
    ['CC-029', 7], // Sardinha Costeira (comum)
    ['CC-030', 7], // Estrela-do-Mar (comum)
    ['CC-031', 7], // Pesca Artesanal (comum)
    ['CC-032', 4], // Turismo Responsável (incomum)
    ['CC-035', 7], // Coleta Seletiva (comum)
    ['CC-036', 7], // Educação Ambiental (comum)
    ['CC-039', 2], // Comunidade Caiçara (rara)
    ['CC-041', 7], // Viveiro de Mudas Nativas (comum)
    ['CC-042', 4], // Gestão Participativa (incomum)
    ['CC-044', 4], // Proteção de Nascentes (incomum)
    ['CC-077', 4], // Alerta de Ressaca (incomum)
    ['CC-078', 4], // Plano Diretor Costeiro (incomum)
    ['CC-079', 4], // Campanha Educativa (incomum)
    ['CC-080', 3], // Mutirão Comunitário (incomum)
    ['CC-083', 3], // Monitoramento Contínuo (incomum)
  ],
  'tartaruga-marinha': [
    ['CC-003', 3], // Recife de Coral (incomum)
    ['CC-004', 7], // Duna Costeira (comum)
    ['CC-006', 7], // Praia Natural (comum)
    ['CC-013', 7], // Banco de Areia (comum)
    ['CC-017', 3], // Berçário de Peixes (incomum)
    ['CC-018', 3], // Tartaruga Marinha (incomum)
    ['CC-020', 3], // Caranguejo-Uçá (incomum)
    ['CC-021', 7], // Garça-Branca (comum)
    ['CC-022', 7], // Cavalo-Marinho (comum)
    ['CC-024', 3], // Raia Costeira (incomum)
    ['CC-025', 7], // Ostra de Mangue (comum)
    ['CC-028', 7], // Ave Migratória (comum)
    ['CC-029', 7], // Sardinha Costeira (comum)
    ['CC-030', 7], // Estrela-do-Mar (comum)
    ['CC-036', 7], // Educação Ambiental (comum)
    ['CC-077', 3], // Alerta de Ressaca (incomum)
    ['CC-079', 3], // Campanha Educativa (incomum)
    ['CC-080', 3], // Mutirão Comunitário (incomum)
    ['CC-083', 3], // Monitoramento Contínuo (incomum)
    ['CC-091', 3], // Terreno: Mar Aberto (incomum)
  ],
  restinga: [
    ['CC-001', 3], // Manguezal Protegido (incomum)
    ['CC-002', 7], // Restinga Preservada (comum)
    ['CC-004', 7], // Duna Costeira (comum)
    ['CC-006', 7], // Praia Natural (comum)
    ['CC-009', 7], // Lagoa Costeira (comum)
    ['CC-011', 3], // Manguezal de Franja (incomum)
    ['CC-012', 7], // Marisma Costeira (comum)
    ['CC-013', 7], // Banco de Areia (comum)
    ['CC-015', 7], // Rio de Maré (comum)
    ['CC-016', 3], // Falésia Vegetada (incomum)
    ['CC-022', 6], // Cavalo-Marinho (comum)
    ['CC-025', 6], // Ostra de Mangue (comum)
    ['CC-030', 6], // Estrela-do-Mar (comum)
    ['CC-041', 6], // Viveiro de Mudas Nativas (comum)
    ['CC-044', 3], // Proteção de Nascentes (incomum)
    ['CC-074', 3], // Recuperação Ambiental (incomum)
    ['CC-077', 3], // Alerta de Ressaca (incomum)
    ['CC-079', 3], // Campanha Educativa (incomum)
    ['CC-084', 3], // Manejo da Bacia (incomum)
    ['CC-089', 3], // Terreno: Manguezal (incomum)
  ],
  'comunidade-caicara': [
    ['CC-001', 4], // Manguezal Protegido (incomum)
    ['CC-017', 4], // Berçário de Peixes (incomum)
    ['CC-020', 4], // Caranguejo-Uçá (incomum)
    ['CC-021', 8], // Garça-Branca (comum)
    ['CC-023', 8], // Peixe-Robalo (comum)
    ['CC-029', 8], // Sardinha Costeira (comum)
    ['CC-031', 8], // Pesca Artesanal (comum)
    ['CC-032', 4], // Turismo Responsável (incomum)
    ['CC-035', 8], // Coleta Seletiva (comum)
    ['CC-036', 8], // Educação Ambiental (comum)
    ['CC-039', 2], // Comunidade Caiçara (rara)
    ['CC-041', 8], // Viveiro de Mudas Nativas (comum)
    ['CC-042', 4], // Gestão Participativa (incomum)
    ['CC-044', 4], // Proteção de Nascentes (incomum)
    ['CC-045', 2], // Recuperação de Mata Ciliar (rara)
    ['CC-077', 4], // Alerta de Ressaca (incomum)
    ['CC-078', 4], // Plano Diretor Costeiro (incomum)
    ['CC-079', 4], // Campanha Educativa (incomum)
    ['CC-083', 4], // Monitoramento Contínuo (incomum)
  ],
  'poluicao-mar': [
    ['CC-047', 7], // Poluição do Mar (comum)
    ['CC-049', 7], // Desmatamento (comum)
    ['CC-050', 7], // Chuva Intensa (comum)
    ['CC-051', 7], // Esgoto Sem Tratamento (comum)
    ['CC-052', 7], // Lixo Plástico (comum)
    ['CC-053', 7], // Ocupação Irregular (comum)
    ['CC-054', 4], // Pesca Predatória (incomum)
    ['CC-055', 2], // Assoreamento (rara)
    ['CC-059', 7], // Microplásticos (comum)
    ['CC-060', 7], // Ilha de Calor Urbana (comum)
    ['CC-062', 7], // Supressão de Restinga (comum)
    ['CC-063', 4], // Turismo Predatório (incomum)
    ['CC-072', 4], // Descarga de Nutrientes (incomum)
    ['CC-077', 4], // Alerta de Ressaca (incomum)
    ['CC-079', 4], // Campanha Educativa (incomum)
    ['CC-080', 4], // Mutirão Comunitário (incomum)
    ['CC-081', 4], // Barreira de Contenção (incomum)
    ['CC-083', 4], // Monitoramento Contínuo (incomum)
    ['CC-092', 3], // Terreno: Costa Pressionada (incomum)
  ],
  'erosao-costeira': [
    ['CC-048', 8], // Erosão Costeira (comum)
    ['CC-049', 8], // Desmatamento (comum)
    ['CC-050', 8], // Chuva Intensa (comum)
    ['CC-053', 8], // Ocupação Irregular (comum)
    ['CC-055', 2], // Assoreamento (rara)
    ['CC-056', 8], // Derramamento de Óleo (comum)
    ['CC-060', 7], // Ilha de Calor Urbana (comum)
    ['CC-061', 4], // Drenagem Inadequada (incomum)
    ['CC-062', 7], // Supressão de Restinga (comum)
    ['CC-065', 4], // Obra Sobre a Duna (incomum)
    ['CC-066', 4], // Canalização de Rio (incomum)
    ['CC-069', 4], // Dragagem Sem Controle (incomum)
    ['CC-072', 4], // Descarga de Nutrientes (incomum)
    ['CC-077', 4], // Alerta de Ressaca (incomum)
    ['CC-079', 4], // Campanha Educativa (incomum)
    ['CC-080', 4], // Mutirão Comunitário (incomum)
    ['CC-081', 4], // Barreira de Contenção (incomum)
    ['CC-083', 4], // Monitoramento Contínuo (incomum)
    ['CC-092', 4], // Terreno: Costa Pressionada (incomum)
  ],
  ressaca: [
    ['CC-050', 9], // Chuva Intensa (comum)
    ['CC-052', 9], // Lixo Plástico (comum)
    ['CC-054', 4], // Pesca Predatória (incomum)
    ['CC-056', 8], // Derramamento de Óleo (comum)
    ['CC-057', 4], // Ressaca Marinha (incomum)
    ['CC-058', 4], // Expansão Portuária (incomum)
    ['CC-060', 8], // Ilha de Calor Urbana (comum)
    ['CC-066', 4], // Canalização de Rio (incomum)
    ['CC-068', 8], // Contaminação Industrial (comum)
    ['CC-069', 4], // Dragagem Sem Controle (incomum)
    ['CC-070', 8], // Branqueamento de Corais (comum)
    ['CC-071', 2], // Elevação do Nível do Mar (rara)
    ['CC-072', 4], // Descarga de Nutrientes (incomum)
    ['CC-077', 4], // Alerta de Ressaca (incomum)
    ['CC-079', 4], // Campanha Educativa (incomum)
    ['CC-080', 4], // Mutirão Comunitário (incomum)
    ['CC-081', 4], // Barreira de Contenção (incomum)
    ['CC-083', 4], // Monitoramento Contínuo (incomum)
    ['CC-092', 4], // Terreno: Costa Pressionada (incomum)
  ],
  coral: [
    ['CC-001', 5], // Manguezal Protegido (incomum)
    ['CC-003', 5], // Recife de Coral (incomum)
    ['CC-005', 3], // Estuário Vivo (rara)
    ['CC-007', 3], // Costão Rochoso (rara)
    ['CC-008', 5], // Pradaria Marinha (incomum)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-011', 5], // Manguezal de Franja (incomum)
    ['CC-014', 3], // Ilha Costeira (rara)
    ['CC-016', 5], // Falésia Vegetada (incomum)
    ['CC-017', 5], // Berçário de Peixes (incomum)
    ['CC-022', 10], // Cavalo-Marinho (comum)
    ['CC-025', 10], // Ostra de Mangue (comum)
    ['CC-026', 3], // Coral-Cérebro (rara)
    ['CC-030', 10], // Estrela-do-Mar (comum)
    ['CC-074', 5], // Recuperação Ambiental (incomum)
    ['CC-079', 5], // Campanha Educativa (incomum)
    ['CC-084', 5], // Manejo da Bacia (incomum)
    ['CC-089', 5], // Terreno: Manguezal (incomum)
    ['CC-091', 5], // Terreno: Mar Aberto (incomum)
  ],
  'recuperacao-ambiental': [
    ['CC-001', 5], // Manguezal Protegido (incomum)
    ['CC-002', 11], // Restinga Preservada (comum)
    ['CC-003', 5], // Recife de Coral (incomum)
    ['CC-005', 3], // Estuário Vivo (rara)
    ['CC-007', 3], // Costão Rochoso (rara)
    ['CC-008', 5], // Pradaria Marinha (incomum)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-014', 3], // Ilha Costeira (rara)
    ['CC-016', 5], // Falésia Vegetada (incomum)
    ['CC-036', 11], // Educação Ambiental (comum)
    ['CC-040', 3], // Restauração de Dunas (rara)
    ['CC-041', 10], // Viveiro de Mudas Nativas (comum)
    ['CC-044', 5], // Proteção de Nascentes (incomum)
    ['CC-045', 3], // Recuperação de Mata Ciliar (rara)
    ['CC-074', 5], // Recuperação Ambiental (incomum)
    ['CC-079', 5], // Campanha Educativa (incomum)
    ['CC-080', 5], // Mutirão Comunitário (incomum)
    ['CC-084', 5], // Manejo da Bacia (incomum)
    ['CC-089', 5], // Terreno: Manguezal (incomum)
  ],
  urbanizacao: [
    ['CC-032', 8], // Turismo Responsável (incomum)
    ['CC-033', 4], // Urbanização Planejada (rara)
    ['CC-034', 4], // Pesquisa Oceanográfica (rara)
    ['CC-037', 4], // Monitoramento da Água (rara)
    ['CC-038', 4], // Fiscalização Costeira (rara)
    ['CC-039', 4], // Comunidade Caiçara (rara)
    ['CC-040', 4], // Restauração de Dunas (rara)
    ['CC-042', 8], // Gestão Participativa (incomum)
    ['CC-043', 4], // Saneamento Integrado (rara)
    ['CC-045', 4], // Recuperação de Mata Ciliar (rara)
    ['CC-046', 8], // Observatório Costeiro (incomum)
    ['CC-077', 8], // Alerta de Ressaca (incomum)
    ['CC-078', 8], // Plano Diretor Costeiro (incomum)
    ['CC-079', 7], // Campanha Educativa (incomum)
    ['CC-080', 7], // Mutirão Comunitário (incomum)
    ['CC-083', 7], // Monitoramento Contínuo (incomum)
    ['CC-090', 7], // Terreno: Zona Urbana (incomum)
  ],
  'chuva-intensa': [
    ['CC-050', 11], // Chuva Intensa (comum)
    ['CC-055', 3], // Assoreamento (rara)
    ['CC-056', 11], // Derramamento de Óleo (comum)
    ['CC-057', 6], // Ressaca Marinha (incomum)
    ['CC-058', 6], // Expansão Portuária (incomum)
    ['CC-061', 6], // Drenagem Inadequada (incomum)
    ['CC-066', 6], // Canalização de Rio (incomum)
    ['CC-067', 6], // Invasão de Espécies (incomum)
    ['CC-069', 6], // Dragagem Sem Controle (incomum)
    ['CC-071', 3], // Elevação do Nível do Mar (rara)
    ['CC-072', 6], // Descarga de Nutrientes (incomum)
    ['CC-077', 6], // Alerta de Ressaca (incomum)
    ['CC-079', 6], // Campanha Educativa (incomum)
    ['CC-080', 6], // Mutirão Comunitário (incomum)
    ['CC-083', 6], // Monitoramento Contínuo (incomum)
    ['CC-092', 6], // Terreno: Costa Pressionada (incomum)
  ],
  porto: [
    ['CC-053', 10], // Ocupação Irregular (comum)
    ['CC-054', 5], // Pesca Predatória (incomum)
    ['CC-057', 5], // Ressaca Marinha (incomum)
    ['CC-058', 5], // Expansão Portuária (incomum)
    ['CC-064', 10], // Sobrepesca (comum)
    ['CC-065', 5], // Obra Sobre a Duna (incomum)
    ['CC-066', 5], // Canalização de Rio (incomum)
    ['CC-067', 5], // Invasão de Espécies (incomum)
    ['CC-068', 9], // Contaminação Industrial (comum)
    ['CC-069', 5], // Dragagem Sem Controle (incomum)
    ['CC-070', 9], // Branqueamento de Corais (comum)
    ['CC-071', 2], // Elevação do Nível do Mar (rara)
    ['CC-077', 5], // Alerta de Ressaca (incomum)
    ['CC-079', 5], // Campanha Educativa (incomum)
    ['CC-080', 5], // Mutirão Comunitário (incomum)
    ['CC-083', 5], // Monitoramento Contínuo (incomum)
    ['CC-092', 5], // Terreno: Costa Pressionada (incomum)
  ],
  'planejamento-costeiro': [
    ['CC-033', 4], // Urbanização Planejada (rara)
    ['CC-034', 4], // Pesquisa Oceanográfica (rara)
    ['CC-036', 15], // Educação Ambiental (comum)
    ['CC-037', 4], // Monitoramento da Água (rara)
    ['CC-038', 4], // Fiscalização Costeira (rara)
    ['CC-039', 4], // Comunidade Caiçara (rara)
    ['CC-040', 4], // Restauração de Dunas (rara)
    ['CC-042', 8], // Gestão Participativa (incomum)
    ['CC-043', 4], // Saneamento Integrado (rara)
    ['CC-045', 4], // Recuperação de Mata Ciliar (rara)
    ['CC-046', 8], // Observatório Costeiro (incomum)
    ['CC-077', 8], // Alerta de Ressaca (incomum)
    ['CC-078', 8], // Plano Diretor Costeiro (incomum)
    ['CC-080', 7], // Mutirão Comunitário (incomum)
    ['CC-083', 7], // Monitoramento Contínuo (incomum)
    ['CC-090', 7], // Terreno: Zona Urbana (incomum)
  ],
  'biodiversidade-costeira': [
    ['CC-005', 3], // Estuário Vivo (rara)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-017', 6], // Berçário de Peixes (incomum)
    ['CC-018', 6], // Tartaruga Marinha (incomum)
    ['CC-019', 6], // Boto-Cinza (incomum)
    ['CC-020', 6], // Caranguejo-Uçá (incomum)
    ['CC-023', 11], // Peixe-Robalo (comum)
    ['CC-024', 6], // Raia Costeira (incomum)
    ['CC-026', 3], // Coral-Cérebro (rara)
    ['CC-027', 6], // Golfinho Costeiro (incomum)
    ['CC-028', 11], // Ave Migratória (comum)
    ['CC-074', 6], // Recuperação Ambiental (incomum)
    ['CC-077', 6], // Alerta de Ressaca (incomum)
    ['CC-079', 6], // Campanha Educativa (incomum)
    ['CC-083', 5], // Monitoramento Contínuo (incomum)
    ['CC-084', 5], // Manejo da Bacia (incomum)
    ['CC-091', 5], // Terreno: Mar Aberto (incomum)
  ],
  'oceano-limpo': [
    ['CC-005', 3], // Estuário Vivo (rara)
    ['CC-010', 3], // Mata Atlântica Litorânea (rara)
    ['CC-017', 6], // Berçário de Peixes (incomum)
    ['CC-018', 6], // Tartaruga Marinha (incomum)
    ['CC-019', 6], // Boto-Cinza (incomum)
    ['CC-020', 6], // Caranguejo-Uçá (incomum)
    ['CC-023', 11], // Peixe-Robalo (comum)
    ['CC-024', 6], // Raia Costeira (incomum)
    ['CC-026', 3], // Coral-Cérebro (rara)
    ['CC-027', 6], // Golfinho Costeiro (incomum)
    ['CC-028', 11], // Ave Migratória (comum)
    ['CC-074', 6], // Recuperação Ambiental (incomum)
    ['CC-077', 6], // Alerta de Ressaca (incomum)
    ['CC-079', 6], // Campanha Educativa (incomum)
    ['CC-083', 5], // Monitoramento Contínuo (incomum)
    ['CC-084', 5], // Manejo da Bacia (incomum)
    ['CC-091', 5], // Terreno: Mar Aberto (incomum)
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
