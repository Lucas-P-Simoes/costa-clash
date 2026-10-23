// RNG determinístico com seed (mulberry32) e embaralhamento Fisher-Yates.
// O motor nunca usa Math.random: toda aleatoriedade vem de um Rng injetado.

export type Rng = () => number

/** Gera números em [0, 1) de forma determinística a partir de uma seed inteira. */
export function criarRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates: devolve uma NOVA lista embaralhada; não altera a entrada. */
export function embaralhar<T>(lista: readonly T[], rng: Rng): T[] {
  const r = [...lista]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1))) // clamp: um rng injetado que devolva 1.0 não gera índice fora da faixa
    const t = r[i] as T
    r[i] = r[j] as T
    r[j] = t
  }
  return r
}
