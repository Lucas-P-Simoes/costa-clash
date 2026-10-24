// Lote piloto (5 cartas representativas) e critérios de aprovação visual. Só dados.

export interface ItemPiloto {
  id: string
  /** Categoria temática da carta (para o dono). */
  categoria: string
  /** Critérios específicos além dos gerais. */
  criterios: readonly string[]
}

export const PILOTO: readonly ItemPiloto[] = [
  {
    id: 'CC-001',
    categoria: 'Ecossistema (manguezal)',
    criterios: ['Raízes escora aéreas grandes e legíveis ocupando o centro', 'Copa verde-amarelada densa e água azul-turquesa com reflexos', 'Árvore central clara, sem aparência de floresta genérica'],
  },
  {
    id: 'CC-018',
    categoria: 'Fauna / vida marinha (tartaruga)',
    criterios: ['Tartaruga majestosa em primeiro plano, casco com padrão detalhado e bordas douradas', 'Raios de luz subaquáticos e recife colorido sem poluir a silhueta', 'Sem lixo ou redes na cena (a carta fala de proteção da espécie)'],
  },
  {
    id: 'CC-047',
    categoria: 'Impacto ambiental (poluição do mar)',
    criterios: ['Criatura de resíduos legível, olhos de brasa e boca de dentes', 'Resíduos reconhecíveis (garrafas, pneu, latas) sem virar apologia', 'Fundo de tempestade roxo contrastando com objetos coloridos'],
  },
  {
    id: 'CC-031',
    categoria: 'Comunidade tradicional / atividade (pesca artesanal)',
    criterios: ['Barco de madeira artesanal e rede de pesca bem visíveis', 'Retrato digno e respeitoso, sem estereótipos ou caricatura', 'Pôr do sol com contraste laranja e azul coerente com a referência'],
  },
  {
    id: 'CC-073',
    categoria: 'Ação / solução (tratamento de esgoto)',
    criterios: ['Tanques circulares de tratamento reconhecíveis com água azul purificada', 'Instalação organizada e plausível (sem sugerir que elimina totalmente a poluição)', 'Céu azul claro e vegetação, estilo consistente com as demais'],
  },
]

export const IDS_PILOTO: readonly string[] = PILOTO.map((p) => p.id)

/** Critérios de aprovação válidos para todas as cartas. */
export const CRITERIOS_GERAIS: readonly string[] = [
  'Pixel art retrô PS1 reconhecível, com pixels visíveis (não parece foto, 3D nem vetor suave)',
  'Mesma identidade das 18 ilustrações de Referencia-telas/Estilos-de-cartas.webp (paleta, luz, densidade)',
  'Cena completa preenchendo o quadro, elemento principal grande e centralizado',
  'Elemento principal legível dentro da faixa central (25% a 75% da altura) após o recorte da janela de arte',
  'Nenhum texto, letra, número, logotipo, moldura, selo ou ATK/DEF desenhado na imagem',
  'Conteúdo ambientalmente defensável e respeitoso (sem estereótipos, sem apologia a impactos)',
  'Vertical 3:4, preferencialmente 768x1024, PNG ou WebP, sem artefatos de compressão fortes',
]

export const VARIACOES_SUGERIDAS: readonly string[] = [
  'Variação A: igual ao prompt base (referência).',
  'Variação B: enquadramento um pouco mais fechado no elemento principal.',
  'Variação C: mesma cena com outra hora do dia (pôr do sol dourado ou luz de meio-dia), mantendo a paleta.',
]
