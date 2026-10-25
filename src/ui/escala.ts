// Escala fluida da interface (espelho em TypeScript da fórmula de src/styles/responsivo.css; usado em testes e documentação).
// A interface é medida em rem; 1rem = base. A base acompanha a MENOR das dimensões relativas da viewport.
export const LARGURA_REF_REM = 90 // 1440px / 16
export const ALTURA_REF_REM = 56.25 // 900px / 16
export const BASE_MIN_PX = 14
export const BASE_MAX_PX = 26
export const BASE_CELULAR_PX = 16
export const LARGURA_CELULAR_MAX = 700

/** Tamanho do rem (px) para uma viewport CSS de `largura` x `altura`. */
export function baseRaiz(largura: number, altura: number): number {
  if (largura <= LARGURA_CELULAR_MAX) return largura < 360 ? 15 : BASE_CELULAR_PX
  const livre = Math.min(largura / LARGURA_REF_REM, altura / ALTURA_REF_REM)
  return Math.min(BASE_MAX_PX, Math.max(BASE_MIN_PX, livre))
}

/** Largura e altura úteis da viewport expressas em rem (o que o layout realmente enxerga). */
export function viewportEmRem(largura: number, altura: number): { largura: number; altura: number } {
  const base = baseRaiz(largura, altura)
  return { largura: largura / base, altura: altura / base }
}

/** Fator de escala em relação à tela de referência (1440x900 => 1). */
export function fatorEscala(largura: number, altura: number): number {
  return baseRaiz(largura, altura) / 16
}
