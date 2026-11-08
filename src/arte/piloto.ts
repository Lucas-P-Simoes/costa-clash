// Lote de quatro cartas representativas do catálogo atual e critérios de aprovação visual.

export interface ItemPiloto {
  id: string
  categoria: string
  criterios: readonly string[]
}

export const PILOTO: readonly ItemPiloto[] = [
  { id: 'CC-101', categoria: 'Manguezal', criterios: ['Chama-maré reconhecível e central', 'Vegetação e água do manguezal legíveis', 'Silhueta clara em pixel art'] },
  { id: 'CC-131', categoria: 'Infralitoral', criterios: ['Bolacha-do-mar reconhecível sobre o fundo', 'Cena subaquática coerente', 'Sem texto ou moldura embutidos'] },
  { id: 'CC-153', categoria: 'Costão rochoso', criterios: ['Cracas sésseis cimentadas à rocha', 'Sem pedúnculos ou hastes', 'Placas calcárias e maré legíveis'] },
  { id: 'CC-170', categoria: 'Costa brasileira', criterios: ['Baleia-de-Bryde reconhecível', 'Escala oceânica e movimento legíveis', 'Contraste adequado à moldura'] },
]

export const IDS_PILOTO: readonly string[] = PILOTO.map((p) => p.id)

export const CRITERIOS_GERAIS: readonly string[] = [
  'Pixel art retrô PS1 reconhecível, com pixels visíveis (não parece foto, 3D nem vetor suave)',
  'Mesma identidade visual do catálogo atual (paleta, luz e densidade)',
  'Cena completa preenchendo o quadro, elemento principal grande e centralizado',
  'Elemento principal legível dentro da faixa central após o recorte da janela de arte',
  'Nenhum texto, letra, número, logotipo, moldura, selo ou ATK/DEF desenhado na imagem',
  'Conteúdo ambientalmente defensável e respeitoso',
  'Vertical 3:4, preferencialmente 768x1024, PNG ou WebP, sem artefatos fortes',
]

export const VARIACOES_SUGERIDAS: readonly string[] = [
  'Variação A: igual ao prompt base (referência).',
  'Variação B: enquadramento um pouco mais fechado no elemento principal.',
  'Variação C: mesma cena com outra hora do dia, mantendo a paleta.',
]
