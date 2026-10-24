// Gerador determinístico de prompts de ilustração das cartas. Módulo puro (sem DOM/Node/rede):
// prefixo de estilo comum + assunto específico (sujeitos.ts) + paleta + composição + negativos.
// Importa com extensão .ts para poder ser carregado direto pelo Node (scripts/arte/*.mjs).
// ESTE MÓDULO SÓ GERA TEXTO. Nenhuma ilustração é gerada aqui (ver docs/ARTE_DAS_CARTAS.md).
import type { Carta } from '../game/tipos.ts'
import { SUJEITOS } from './sujeitos.ts'
import type { Forma, PaletaId } from './sujeitos.ts'

export type Idioma = 'pt' | 'en'

/** DNA visual comum (extraído de Referencia-telas/Estilos-de-cartas.webp e das telas do jogo). */
export const PREFIXO_ESTILO: Readonly<Record<Idioma, string>> = {
  pt: 'Ilustração de carta colecionável em pixel art retrô (estilo PlayStation 1 / 16-bit moderno), cena completa preenchendo todo o quadro com o elemento principal grande e centralizado, contornos escuros finos e definidos, cores vibrantes e saturadas harmonizadas (contraste de laranja quente com azul-turquesa), iluminação dramática com sombras profundas, texturas em pixels visíveis com dithering sutil, alta densidade de detalhes, acabamento polido de arte de carta colecionável, proporção vertical 3:4.',
  en: 'Collectible card illustration in retro pixel art (PlayStation 1 / modern 16-bit style), a complete scene filling the whole frame with a large, centered main subject, thin dark defined outlines, vibrant saturated harmonized colors (warm orange against turquoise blue), dramatic lighting with deep shadows, visible pixel textures with subtle dithering, high detail density, polished collectible card art finish, vertical 3:4 aspect ratio.',
}

export interface TextoPaleta {
  rotulo: string
  pt: string
  en: string
}

/** Paletas e iluminação por tipo/grupo (hex aproximados, extraídos da referência). */
export const PALETAS: Readonly<Record<PaletaId, TextoPaleta>> = {
  ecossistema: {
    rotulo: 'Ecossistemas: verdes, azuis e tons naturais',
    pt: 'verdes profundos e amarelados de folhagem (#1f6e3a, #37b05f, #b8d430), azul-turquesa da água (#1f6f9c, #3fdcf0), marrons de raízes e areia (#8a5a2c, #e8d49a), luz dourada filtrada e céu azul com nuvens brancas em pixels',
    en: 'deep and yellowish foliage greens (#1f6e3a, #37b05f, #b8d430), turquoise water (#1f6f9c, #3fdcf0), root and sand browns (#8a5a2c, #e8d49a), filtered golden light and blue sky with white pixel clouds',
  },
  vidaMarinha: {
    rotulo: 'Vida marinha: azuis e turquesas',
    pt: 'azuis e turquesas profundos (#0e3a5c, #1f6f9c, #3fdcf0, #8fe8f5), raios de luz solar dourada descendo da superfície, acentos quentes de coral em laranja, rosa e roxo (#f0a63a, #e0603a, #a050c0)',
    en: 'deep blues and turquoises (#0e3a5c, #1f6f9c, #3fdcf0, #8fe8f5), golden sunbeams descending from the surface, warm coral accents in orange, pink and purple (#f0a63a, #e0603a, #a050c0)',
  },
  impacto: {
    rotulo: 'Impactos: vermelhos, roxos e tons sombrios',
    pt: 'tons sombrios de roxo-escuro e preto-azulado (#2a1a40, #0a0a14, #8a5ac4), cinza-chumbo (#6a6a72), céu de tempestade com fumaça, acentos de brasa laranja-avermelhada nos olhos e rachaduras (#e0602a, #c4402a), objetos coloridos saturados em contraste com o fundo escuro',
    en: 'somber dark purple and blue-black tones (#2a1a40, #0a0a14, #8a5ac4), lead grey (#6a6a72), stormy sky with smoke, ember orange-red accents in eyes and cracks (#e0602a, #c4402a), saturated colorful objects contrasting with the dark background',
  },
  fenomeno: {
    rotulo: 'Fenômenos: azuis profundos, cinzas e energia',
    pt: 'azuis profundos (#0b1d33, #1f6f9c), cinzas de tempestade (#6a6a72, #9a9aa4), espuma branco-azulada (#e8f4ff), energia turquesa brilhante (#3fdcf0) e céu de pôr do sol laranja e roxo (#e8803a, #8a4a90) quando houver horizonte',
    en: 'deep blues (#0b1d33, #1f6f9c), storm greys (#6a6a72, #9a9aa4), blue-white foam (#e8f4ff), bright turquoise energy (#3fdcf0) and an orange and purple sunset sky (#e8803a, #8a4a90) when there is a horizon',
  },
  solucao: {
    rotulo: 'Planejamento e soluções: dourados, verdes e tecnológicos',
    pt: 'dourado (#e6b648, #f2cf6e), verdes vivos (#37b05f), turquesa tecnológico (#3fdcf0) e azul-céu limpo (#4aa8e8) com nuvens brancas, luz clara e organizada',
    en: 'gold (#e6b648, #f2cf6e), lively greens (#37b05f), technological turquoise (#3fdcf0) and clean sky blue (#4aa8e8) with white clouds, clear orderly light',
  },
  comunidade: {
    rotulo: 'Comunidades tradicionais: cores naturais',
    pt: 'cores naturais: madeira (#8a5a2c, #5a3a1a), palha e areia (#d8c690), azul-mar (#1f6f9c), vermelho e azul desbotados de casco de barco, pôr do sol dourado e laranja refletido no mar (#f2a03a, #e86a3a, #8a5aa0)',
    en: 'natural colors: wood (#8a5a2c, #5a3a1a), straw and sand (#d8c690), sea blue (#1f6f9c), faded red and blue of boat hulls, golden and orange sunset reflected on the sea (#f2a03a, #e86a3a, #8a5aa0)',
  },
  urbano: {
    rotulo: 'Orla urbana: azul-céu, concreto claro e verde',
    pt: 'azul-céu e turquesa do mar (#4aa8e8, #2fc4d8), concreto claro e janelas refletindo o sol (#d8e0e8, #f2cf6e), verdes de vegetação urbana (#37b05f), areia clara (#e8d49a)',
    en: 'sky blue and turquoise sea (#4aa8e8, #2fc4d8), light concrete and sun-reflecting windows (#d8e0e8, #f2cf6e), urban vegetation greens (#37b05f), pale sand (#e8d49a)',
  },
  equipamento: {
    rotulo: 'Equipamentos: metal escuro, turquesa e dourado',
    pt: 'metal escuro azulado (#143a52) com detalhes dourados (#e6b648) e brilho turquesa (#3fdcf0), fundo atmosférico simples',
    en: 'dark bluish metal (#143a52) with golden details (#e6b648) and turquoise glow (#3fdcf0), simple atmospheric background',
  },
  armadilha: {
    rotulo: 'Armadilhas: roxo místico, dourado de alerta e turquesa',
    pt: 'roxo escuro místico (#2a1a40, #8a5ac4), dourado de alerta (#f2cf6e), turquesa de energia (#3fdcf0), contraste forte de luz sobre fundo escuro',
    en: 'dark mystic purple (#2a1a40, #8a5ac4), warning gold (#f2cf6e), energy turquoise (#3fdcf0), strong light contrast on a dark background',
  },
}

/** Enquadramento por forma. A janela de arte do jogo é mais larga que 3:4: manter o essencial na faixa central. */
export const COMPOSICOES: Readonly<Record<Forma, Record<Idioma, string>>> = {
  criatura: {
    pt: 'criatura ou animal em plano médio, centralizado, ocupando cerca de 60% da altura do quadro, silhueta legível, olhos ou ponto focal iluminados, cenário completo ao fundo; elemento principal dentro da faixa central (25% a 75% da altura) com margem de segurança de 10% nas laterais',
    en: 'creature or animal in a medium shot, centered, filling about 60% of the frame height, readable silhouette, lit eyes or focal point, a complete setting behind it; main element within the central band (20% to 80% of the height) with a 10% safety margin on the sides',
  },
  cena: {
    pt: 'cena em plano médio com o elemento principal grande no centro, primeiro plano, plano médio e fundo bem definidos; elemento principal dentro da faixa central (25% a 75% da altura) com margem de segurança de 10% nas bordas',
    en: 'medium-shot scene with the main element large at the center, clearly defined foreground, midground and background; main element within the central band (20% to 80% of the height) with a 10% safety margin at the edges',
  },
  objeto: {
    pt: 'objeto ou equipamento em destaque ao centro, vista levemente inclinada, como item de coleção, em cenário atmosférico simples; elemento principal dentro da faixa central (25% a 75% da altura) com margem de segurança de 10% nas bordas',
    en: 'object or equipment featured at the center, slightly angled view, like a collectible item, in a simple atmospheric setting; main element within the central band (20% to 80% of the height) with a 10% safety margin at the edges',
  },
  paisagem: {
    pt: 'paisagem com profundidade e horizonte na altura central, ponto de interesse no centro, primeiro plano rico em detalhes; elemento principal dentro da faixa central (25% a 75% da altura) com margem de segurança de 10% nas bordas',
    en: 'landscape with depth and the horizon at mid-height, point of interest at the center, detail-rich foreground; main element within the central band (20% to 80% of the height) with a 10% safety margin at the edges',
  },
  personagem: {
    pt: 'personagem ou veículo em plano médio, de frente ou três quartos, digno e expressivo, ferramentas do ofício visíveis, centralizado; elemento principal dentro da faixa central (25% a 75% da altura) com margem de segurança de 10% nas laterais',
    en: 'character or vehicle in a medium shot, front or three-quarter view, dignified and expressive, tools of the trade visible, centered; main element within the central band (20% to 80% of the height) with a 10% safety margin on the sides',
  },
  simbolo: {
    pt: 'situação ou símbolo central iluminado com contraste forte, centralizado, fundo escuro simplificado mas completo; elemento principal dentro da faixa central (25% a 75% da altura) com margem de segurança de 10% nas bordas',
    en: 'central situation or symbol lit with strong contrast, centered, simplified but complete dark background; main element within the central band (20% to 80% of the height) with a 10% safety margin at the edges',
  },
}

/** Frase final obrigatória de todos os prompts (negativos). */
export const NEGATIVOS: Readonly<Record<Idioma, string>> = {
  pt: 'Evitar: fotografia, realismo, estilo infantil simplificado, ícones genéricos de biblioteca, emojis, mistura de estilos. Sem texto, sem moldura, sem ATK/DEF, sem logotipo.',
  en: 'Avoid: photography, realism, simplified childish style, generic library icons, emojis, mixed styles. No text, no frame, no ATK/DEF, no logo.',
}

/** Frases finais exatas (testadas): todo prompt termina com elas. */
export const FRASE_FINAL: Readonly<Record<Idioma, string>> = {
  pt: 'Sem texto, sem moldura, sem ATK/DEF, sem logotipo.',
  en: 'No text, no frame, no ATK/DEF, no logo.',
}

const ROTULOS: Readonly<Record<Idioma, { assunto: string; paleta: string; composicao: string }>> = {
  pt: { assunto: 'Assunto', paleta: 'Paleta e luz', composicao: 'Composição' },
  en: { assunto: 'Subject', paleta: 'Palette and light', composicao: 'Composition' },
}

export class SujeitoAusenteError extends Error {
  constructor(id: string) {
    super(`Sem sujeito de arte para a carta ${id}`)
    this.name = 'SujeitoAusenteError'
  }
}

/** Monta o prompt completo de uma carta (determinístico: mesma carta, mesmo texto). */
export function montarPrompt(carta: Pick<Carta, 'id'>, idioma: Idioma = 'pt'): string {
  const sujeito = SUJEITOS[carta.id]
  if (!sujeito) throw new SujeitoAusenteError(carta.id)
  const r = ROTULOS[idioma]
  return [
    PREFIXO_ESTILO[idioma],
    `${r.assunto}: ${sujeito[idioma]}.`,
    `${r.paleta}: ${PALETAS[sujeito.paleta][idioma]}.`,
    `${r.composicao}: ${COMPOSICOES[sujeito.forma][idioma]}.`,
    NEGATIVOS[idioma],
  ].join(' ')
}

export interface PromptDaCarta {
  id: string
  nome: string
  paleta: PaletaId
  paletaRotulo: string
  forma: Forma
  prompt: string
  promptEn: string
}

export function promptDaCarta(carta: Pick<Carta, 'id' | 'nome'>): PromptDaCarta {
  const s = SUJEITOS[carta.id]
  if (!s) throw new SujeitoAusenteError(carta.id)
  return {
    id: carta.id,
    nome: carta.nome,
    paleta: s.paleta,
    paletaRotulo: PALETAS[s.paleta].rotulo,
    forma: s.forma,
    prompt: montarPrompt(carta, 'pt'),
    promptEn: montarPrompt(carta, 'en'),
  }
}

export function promptsDoCatalogo(cartas: readonly Pick<Carta, 'id' | 'nome'>[]): PromptDaCarta[] {
  return cartas.map(promptDaCarta)
}

/** Número do ID ("CC-018" -> 18). */
export function numeroDoId(id: string): number {
  const m = /^CC-(\d{3})$/.exec(id)
  if (!m) throw new Error(`ID de carta inválido: ${id}`)
  return Number(m[1])
}

/** Nome de arquivo estável baseado no número do ID: "CC-018" -> "018". */
export function baseDoArquivo(id: string): string {
  return String(numeroDoId(id)).padStart(3, '0')
}

/** Seeds sugeridas (estáveis) para geradores que aceitam seed (Stable Diffusion, Midjourney --seed). */
export function seedsSugeridas(id: string): number[] {
  const n = numeroDoId(id)
  return [n * 1009 + 17, n * 2003 + 41, n * 3001 + 73]
}
