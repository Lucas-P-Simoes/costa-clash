// Matriz de viewports CSS (largura x altura). A viewport efetiva do Chrome é menor que a tela (abas, barra de
// endereço, barra de tarefas): por isso o desktop também é testado com altura reduzida.
export interface Viewport {
  nome: string
  w: number
  h: number
  dpr?: number
  /** Emula celular/tablet de toque (pointer: coarse, meta viewport). */
  toque?: boolean
}

const vp = (w: number, h: number, extra: Partial<Viewport> = {}): Viewport => ({
  nome: `${w}x${h}${extra.dpr && extra.dpr !== 1 ? `@${extra.dpr}` : ''}`,
  w,
  h,
  ...extra,
})

/** Nominais pedidas. */
export const NOMINAIS: Viewport[] = [
  vp(3840, 2160),
  vp(2560, 1440),
  vp(1920, 1080),
  vp(1600, 900),
  vp(1536, 864),
  vp(1366, 768),
  vp(1280, 720),
  vp(1024, 768),
  vp(768, 1024, { toque: true }),
  vp(430, 932, { toque: true, dpr: 3 }),
  vp(390, 844, { toque: true, dpr: 3 }),
  vp(375, 667, { toque: true, dpr: 2 }),
  vp(320, 568, { toque: true, dpr: 2 }),
]

/** Desktop com altura efetiva menor (barras do navegador). */
export const EFETIVAS: Viewport[] = [vp(3840, 2030), vp(2560, 1310), vp(1920, 1000), vp(1600, 800), vp(1536, 740), vp(1366, 650), vp(1280, 600), vp(1280, 560)]

/** Zoom do navegador 125% e 150% (viewport CSS menor, dpr maior; altura já sem barras). */
export const ZOOM: Viewport[] = [vp(1536, 740, { dpr: 1.25 }), vp(1280, 610, { dpr: 1.5 }), vp(2560, 1310, { dpr: 1.5 })]

/** Casos extras da revisão de QA: tablets/celulares em retrato e paisagem baixa, janelas desktop de altura reduzida. */
export const EXTRAS_QA: Viewport[] = [
  vp(820, 1180, { toque: true }),
  vp(600, 900, { toque: true }),
  vp(375, 812, { toque: true, dpr: 3 }),
  vp(812, 375, { toque: true, dpr: 3 }),
  vp(667, 375, { toque: true, dpr: 2 }),
  vp(1100, 640),
  vp(1024, 600),
  vp(1250, 610),
  vp(1400, 590),
  vp(900, 500),
]

/** Subconjunto do e2e automatizado (rápido). */
export const SUBCONJUNTO_E2E: Viewport[] = [
  vp(3840, 2030),
  vp(1920, 1000),
  vp(1366, 650),
  vp(1280, 600),
  vp(768, 1024, { toque: true }),
  vp(390, 844, { toque: true, dpr: 3 }),
  vp(320, 568, { toque: true, dpr: 2 }),
  vp(820, 1180, { toque: true }),
  vp(375, 812, { toque: true, dpr: 3 }),
  vp(812, 375, { toque: true, dpr: 3 }),
  vp(1100, 640),
  vp(1024, 600),
  vp(1280, 610, { dpr: 1.5 }),
  vp(709, 506),
  vp(800, 500),
  vp(700, 450),
]

export const MATRIZ_COMPLETA: Viewport[] = [...NOMINAIS, ...EFETIVAS, ...ZOOM, ...EXTRAS_QA]

/** Viewports em que a página inteira DEVE caber sem rolagem (desktop e tablet paisagem com altura mínima de uso). */
export function exigeSemRolagem(v: Viewport): boolean {
  return !v.toque && v.w >= 1024 && v.h >= 560
}
