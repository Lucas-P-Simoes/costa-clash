// Categorias visuais das cartas (moldura colorida + selo circular com pictograma), seguindo
// Referencia-telas/Estilos-de-cartas.webp. É só apresentação: não altera regras nem o catálogo.
// Dados puros (sem React/DOM) para serem testáveis; o desenho dos pictogramas é uma grade de pixels.
import type { Carta } from '../game/tipos.ts'

export type CategoriaId = 'marinha' | 'verde' | 'fenomeno' | 'impacto' | 'protegida' | 'planejamento' | 'ondas'
export type SeloId = 'gota' | 'folha' | 'triangulo' | 'termometro' | 'diabinho' | 'caveira' | 'concha' | 'engrenagem' | 'estrela' | 'onda'

export interface Categoria {
  id: CategoriaId
  /** Nome para a legenda/documentação. */
  rotulo: string
  /** Cor da moldura (borda) da carta. */
  borda: string
  /** Cor de destaque do pictograma do selo. */
  selo: SeloId
  /** Exemplos da referência do dono. */
  temas: string
}

export const CATEGORIAS: Readonly<Record<CategoriaId, Categoria>> = {
  marinha: { id: 'marinha', rotulo: 'Vida marinha', borda: '#3b82d6', selo: 'gota', temas: 'Vida marinha, conservação de fauna aquática' },
  verde: { id: 'verde', rotulo: 'Ecossistemas e restauração', borda: '#2f9e54', selo: 'folha', temas: 'Ecossistemas, fauna costeira, restauração, turismo sustentável' },
  fenomeno: { id: 'fenomeno', rotulo: 'Fenômenos e clima', borda: '#c4402a', selo: 'triangulo', temas: 'Fenômenos naturais, recifes, mudanças climáticas' },
  impacto: { id: 'impacto', rotulo: 'Impactos ambientais', borda: '#8a4ac4', selo: 'diabinho', temas: 'Impactos ambientais, espécies exóticas' },
  protegida: { id: 'protegida', rotulo: 'Áreas protegidas e saneamento', borda: '#8e9aa6', selo: 'concha', temas: 'Restinga, áreas protegidas, saneamento' },
  planejamento: { id: 'planejamento', rotulo: 'Planejamento e pesquisa', borda: '#e0a82e', selo: 'estrela', temas: 'Planejamento, pesquisa, ações' },
  ondas: { id: 'ondas', rotulo: 'Comunidades e ressaca', borda: '#2ab4e8', selo: 'onda', temas: 'Comunidades tradicionais, ressaca, mobilização' },
}

export const ORDEM_CATEGORIAS: readonly CategoriaId[] = ['marinha', 'verde', 'fenomeno', 'impacto', 'protegida', 'planejamento', 'ondas']

export interface ClassificacaoVisual {
  categoria: CategoriaId
  selo: SeloId
}

type Ajuste = { categoria: CategoriaId; selo?: SeloId }

/** Ajustes por carta (tema), que sobrepõem o padrão derivado de tipo + grupo. */
const AJUSTES: Readonly<Record<string, Ajuste>> = {
  // Ecossistemas
  'CC-002': { categoria: 'protegida' }, // Restinga
  'CC-003': { categoria: 'fenomeno' }, // Recife de coral (como na referência)
  'CC-014': { categoria: 'protegida' }, // Ilha costeira (áreas protegidas)
  // Fauna costeira (referência: garça = verde)
  'CC-020': { categoria: 'verde' },
  'CC-021': { categoria: 'verde' },
  'CC-028': { categoria: 'verde' },
  // Atividades
  'CC-031': { categoria: 'ondas' }, // Pesca artesanal (comunidades tradicionais)
  'CC-039': { categoria: 'ondas' }, // Comunidade caiçara
  'CC-042': { categoria: 'ondas' }, // Gestão participativa
  'CC-032': { categoria: 'verde' }, // Turismo responsável
  'CC-040': { categoria: 'verde' }, // Restauração de dunas
  'CC-041': { categoria: 'verde' }, // Viveiro de mudas
  'CC-044': { categoria: 'verde' }, // Proteção de nascentes
  'CC-045': { categoria: 'verde' }, // Mata ciliar
  'CC-035': { categoria: 'protegida', selo: 'engrenagem' }, // Coleta seletiva (saneamento)
  'CC-037': { categoria: 'protegida', selo: 'engrenagem' }, // Monitoramento da água
  'CC-043': { categoria: 'protegida', selo: 'engrenagem' }, // Saneamento integrado
  // Impactos
  'CC-048': { categoria: 'fenomeno' }, // Erosão costeira (fenômeno natural)
  'CC-050': { categoria: 'fenomeno' }, // Chuva intensa
  'CC-057': { categoria: 'ondas' }, // Ressaca marinha (referência: azul-ondas)
  'CC-067': { categoria: 'impacto', selo: 'caveira' }, // Espécies exóticas
  'CC-070': { categoria: 'fenomeno', selo: 'termometro' }, // Branqueamento (clima)
  'CC-071': { categoria: 'fenomeno', selo: 'termometro' }, // Elevação do nível do mar
  // Ações
  'CC-073': { categoria: 'protegida', selo: 'engrenagem' }, // Tratamento de esgoto (saneamento)
  'CC-074': { categoria: 'verde' }, // Recuperação ambiental
  'CC-076': { categoria: 'ondas' }, // Limpeza de praia (mutirão)
  'CC-077': { categoria: 'ondas' }, // Alerta de ressaca
  'CC-080': { categoria: 'ondas' }, // Mutirão comunitário
  // Equipamentos e terrenos
  'CC-085': { categoria: 'verde' }, // Raízes protetoras
  'CC-089': { categoria: 'verde' }, // Terreno: Manguezal
  'CC-090': { categoria: 'planejamento' }, // Terreno: Zona Urbana
  'CC-091': { categoria: 'marinha' }, // Terreno: Mar Aberto
  'CC-092': { categoria: 'fenomeno', selo: 'termometro' }, // Terreno: Costa Pressionada
  // Armadilhas
  'CC-094': { categoria: 'verde' }, // Barreira natural
}

function padrao(c: Carta): Ajuste {
  if (c.tipo === 'unidade') {
    switch (c.grupo) {
      case 'fauna':
        return { categoria: 'marinha' }
      case 'atividade':
        return { categoria: 'planejamento' }
      case 'impacto':
        return { categoria: 'impacto' }
      default:
        return { categoria: 'verde' }
    }
  }
  if (c.tipo === 'armadilha') return { categoria: 'protegida' }
  if (c.subtipo === 'equipamento') return { categoria: 'protegida', selo: 'engrenagem' }
  if (c.subtipo === 'terreno') return { categoria: 'verde' }
  return { categoria: 'planejamento' } // ação instantânea
}

/** Categoria (moldura) e selo de uma carta: ajuste por carta, senão padrão por tipo + grupo. */
export function classificarCarta(c: Carta): ClassificacaoVisual {
  const a = AJUSTES[c.id] ?? padrao(c)
  return { categoria: a.categoria, selo: a.selo ?? CATEGORIAS[a.categoria].selo }
}

export const IDS_COM_AJUSTE: readonly string[] = Object.keys(AJUSTES)

// ----- Pictogramas dos selos (grade 12x12; '.' = transparente) -----
export const SELO_PALETAS: Readonly<Record<SeloId, Readonly<Record<string, string>>>> = {
  gota: { b: '#2d9bf0', B: '#bfe8ff' },
  folha: { g: '#3fcf6a', G: '#e6ffe0' },
  triangulo: { r: '#e0483a', R: '#ffb0a0' },
  termometro: { r: '#e0483a', w: '#ffe0d8', k: '#ffb0a0' },
  diabinho: { p: '#b070f0', k: '#1a0e2a' },
  caveira: { p: '#c890ff', k: '#1a0e2a' },
  concha: { w: '#f0f0f4', g: '#9aa4b0' },
  engrenagem: { w: '#e6eaf0', g: '#7c8794' },
  estrela: { y: '#ffc933', Y: '#fff0a0' },
  onda: { b: '#27c4f0', B: '#c6f6ff' },
}

export const SELO_GRADES: Readonly<Record<SeloId, readonly string[]>> = {
  gota: [
    '.....bb.....',
    '.....bb.....',
    '....bbbb....',
    '....bbbb....',
    '...bbBbbb...',
    '...bBbbbb...',
    '..bbBbbbbb..',
    '..bbBbbbbb..',
    '..bbbbbbbb..',
    '..bbbbbbbb..',
    '...bbbbbb...',
    '....bbbb....',
  ],
  folha: [
    '.........ggg',
    '......gggGgg',
    '....gggggGgg',
    '...ggggggGg.',
    '..gggggggGg.',
    '..ggggggGgg.',
    '.ggggggGggg.',
    '.gggggGgggg.',
    '.ggggGgggg..',
    '.gggGggg....',
    'gGgg........',
    'G...........',
  ],
  triangulo: [
    '.....rr.....',
    '....rrrr....',
    '....rRrr....',
    '...rrRrrr...',
    '...rRrrrr...',
    '..rrRrrrrr..',
    '..rRrrrrrr..',
    '.rrRrrrrrrr.',
    '.rrrrrrrrrr.',
    'rrrrrrrrrrrr',
    'rrrrrrrrrrrr',
    '............',
  ],
  termometro: [
    '....wwww....',
    '....wrrw....',
    '....wrrw....',
    '..k.wrrw.k..',
    '....wrrw....',
    '..k.wrrw.k..',
    '....wrrw....',
    '...wwrrww...',
    '..wrrrrrrw..',
    '..wrrrrrrw..',
    '...wrrrrw...',
    '....wwww....',
  ],
  diabinho: [
    'p..........p',
    'pp........pp',
    'pppppppppppp',
    '.pppppppppp.',
    '.ppkkppkkpp.',
    '.pkkkppkkkp.',
    '.pppppppppp.',
    '.pppppppppp.',
    '..pkppppkp..',
    '..ppkkkkpp..',
    '...pppppp...',
    '....pppp....',
  ],
  caveira: [
    '...pppppp...',
    '..pppppppp..',
    '.pppppppppp.',
    '.ppkkppkkpp.',
    '.ppkkppkkpp.',
    '.pppppppppp.',
    '..pppkkppp..',
    '...pppppp...',
    '...p.pp.p...',
    '...pppppp...',
    '...p.pp.p...',
    '............',
  ],
  concha: [
    '.....ww.....',
    '..w..ww..w..',
    '.ww.gww.gww.',
    '.wwg.ww.gww.',
    'wwwg.ww.gwww',
    'wwwg.ww.gwww',
    'wwwwgwwgwwww',
    '.wwwwwwwwww.',
    '..wwwwwwww..',
    '...wwwwww...',
    '....wwww....',
    '............',
  ],
  engrenagem: [
    '....w..w....',
    '..w.wwww.w..',
    '...wwwwww...',
    '.wwwwggwwww.',
    '.wwwg..gwww.',
    'wwww....wwww',
    'wwww....wwww',
    '.wwwg..gwww.',
    '.wwwwggwwww.',
    '...wwwwww...',
    '..w.wwww.w..',
    '....w..w....',
  ],
  estrela: [
    '.....yy.....',
    '.....yy.....',
    '....yyyy....',
    '....yYyy....',
    'yyyyyYyyyyyy',
    '.yyyyyyyyyy.',
    '..yyyyyyyy..',
    '...yyyyyy...',
    '...yyyyyy...',
    '..yyyyyyyy..',
    '..yyy..yyy..',
    '.yy......yy.',
  ],
  onda: [
    '....bbbbb...',
    '..bbbBBbbb..',
    '.bbBbbbbbbb.',
    '.bBbb...bbb.',
    'bbBb.....bb.',
    'bbb...bb.bb.',
    'bb...bBbbbb.',
    'bbb..bbbbb..',
    '.bbbbbbbb...',
    '..bbbbbb....',
    '...bbbb.....',
    '............',
  ],
}
