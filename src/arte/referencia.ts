// Mapa da referência de estilo do dono (Referencia-telas/Estilos-de-cartas.webp, 2000x1327, grade 6x3)
// para as cartas do catálogo. Só dados. As 18 ilustrações da referência NÃO foram geradas por nós.

export const ARQUIVO_REFERENCIA = 'Referencia-telas/Estilos-de-cartas.webp'
export const ORIGEM_RECORTE = `recorte de ${ARQUIVO_REFERENCIA}`

export type Correspondencia = 'forte' | 'aproximacao'

export interface CartaDaReferencia {
  /** Rótulo impresso na placa da carta da referência. */
  rotulo: string
  /** Posição na grade (1-based). */
  linha: number
  coluna: number
  /** Carta do catálogo correspondente. */
  id: string
  correspondencia: Correspondencia
  nota: string
  /** Já recortada como arte provisória? */
  recortada: boolean
}

export const CARTAS_DA_REFERENCIA: readonly CartaDaReferencia[] = [
  { rotulo: 'Vida marinha', linha: 1, coluna: 1, id: 'CC-018', correspondencia: 'forte', nota: 'Tartaruga marinha sobre recife com raios de luz.', recortada: true },
  { rotulo: 'Ecossistemas', linha: 1, coluna: 2, id: 'CC-001', correspondencia: 'forte', nota: 'Manguezal com raízes escora.', recortada: true },
  { rotulo: 'Fenômenos naturais', linha: 1, coluna: 3, id: 'CC-048', correspondencia: 'forte', nota: 'Falésia desmoronando com ondas: erosão costeira.', recortada: false },
  { rotulo: 'Impactos ambientais', linha: 1, coluna: 4, id: 'CC-047', correspondencia: 'forte', nota: 'Monstro de lixo plástico: poluição do mar.', recortada: true },
  { rotulo: 'Restinga', linha: 1, coluna: 5, id: 'CC-002', correspondencia: 'forte', nota: 'Duna com vegetação e flores brancas.', recortada: false },
  { rotulo: 'Ressaca marinha', linha: 1, coluna: 6, id: 'CC-057', correspondencia: 'forte', nota: 'Onda em forma de criatura.', recortada: false },
  { rotulo: 'Planejamento urbano', linha: 2, coluna: 1, id: 'CC-033', correspondencia: 'forte', nota: 'Orla com prédios, calçadão e praia.', recortada: false },
  { rotulo: 'Saneamento', linha: 2, coluna: 2, id: 'CC-073', correspondencia: 'forte', nota: 'Estação de tratamento com tanques circulares.', recortada: true },
  { rotulo: 'Fauna costeira', linha: 2, coluna: 3, id: 'CC-021', correspondencia: 'forte', nota: 'Garça-branca no manguezal.', recortada: false },
  { rotulo: 'Comunidades tradicionais', linha: 2, coluna: 4, id: 'CC-031', correspondencia: 'forte', nota: 'Barco de pesca artesanal com rede ao pôr do sol.', recortada: true },
  { rotulo: 'Recife de coral', linha: 2, coluna: 5, id: 'CC-003', correspondencia: 'forte', nota: 'Corais ramificados coloridos.', recortada: false },
  { rotulo: 'Espécies exóticas', linha: 2, coluna: 6, id: 'CC-067', correspondencia: 'forte', nota: 'Peixe-leão.', recortada: false },
  { rotulo: 'Restauração costeira', linha: 3, coluna: 1, id: 'CC-074', correspondencia: 'aproximacao', nota: 'Mudas de mangue na água ao pôr do sol; a carta é "Recuperação Ambiental" (genérica).', recortada: false },
  { rotulo: 'Mudanças climáticas', linha: 3, coluna: 2, id: 'CC-071', correspondencia: 'aproximacao', nota: 'Terra rachada e árvores secas ao pôr do sol; a carta é "Elevação do Nível do Mar" (outra cena). Melhor encaixe alternativo: CC-092 Terreno: Costa Pressionada.', recortada: false },
  { rotulo: 'Conservação', linha: 3, coluna: 3, id: 'CC-027', correspondencia: 'forte', nota: 'Golfinhos sob a superfície.', recortada: false },
  { rotulo: 'Pesquisa científica', linha: 3, coluna: 4, id: 'CC-034', correspondencia: 'forte', nota: 'Navio de pesquisa com pesquisadores.', recortada: false },
  { rotulo: 'Áreas protegidas', linha: 3, coluna: 5, id: 'CC-014', correspondencia: 'aproximacao', nota: 'Ilha rochosa com ondas; encaixa em "Ilha Costeira", sem ser exatamente uma ilha costeira vegetada.', recortada: false },
  { rotulo: 'Turismo sustentável', linha: 3, coluna: 6, id: 'CC-032', correspondencia: 'forte', nota: 'Passarela de madeira até a praia.', recortada: false },
]

/**
 * Recortes nativos (px da referência) das 5 provisórias. Só a janela de arte, abaixo do selo
 * circular do canto superior esquerdo (que se sobrepõe ao quadro), sem moldura nem placa de nome.
 */
export const RECORTES_PROVISORIOS: Readonly<Record<string, { x: number; y: number; largura: number; altura: number }>> = {
  'CC-018': { x: 37, y: 233, largura: 267, altura: 225 },
  'CC-001': { x: 369, y: 233, largura: 269, altura: 225 },
  'CC-047': { x: 1027, y: 233, largura: 269, altura: 225 },
  'CC-031': { x: 1027, y: 633, largura: 269, altura: 193 },
  'CC-073': { x: 369, y: 633, largura: 269, altura: 195 },
}
