// Grades de pixel art (cada caractere = 1 pixel). Recriadas à mão/por código; não vêm da imagem de referência.
import type { Grade } from './PixelArt'

function matriz(n: number, m = n): string[][] {
  return Array.from({ length: m }, () => Array.from({ length: n }, () => '.'))
}

function juntar(m: string[][]): Grade {
  return m.map((l) => l.join(''))
}

/** Anel/disco pixelado. espessura 0 = disco cheio. */
export function circulo(n: number, espessura: number, cor = 'A', miolo = '.'): Grade {
  const m = matriz(n)
  const c = (n - 1) / 2
  const r = n / 2
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - c, y - c)
      if (d <= r) m[y][x] = espessura === 0 || d > r - espessura ? cor : miolo
    }
  return juntar(m)
}

export const GRADE_ESPADAS: Grade = (() => {
  const n = 16
  const m = matriz(n)
  for (let i = 0; i < n; i++) {
    const cor = i < 9 ? 'B' : i < 11 ? 'G' : 'H'
    for (const x of [i, n - 1 - i]) {
      m[i][x] = cor
      if (i < 9) {
        const lado = x === i ? 1 : -1
        if (m[i][x + lado] === '.') m[i][x + lado] = 'L'
      }
    }
  }
  // guardas: perpendiculares a cada lâmina, em i = 9
  for (const d of [-2, -1, 0, 1, 2]) {
    const cel: Array<[number, number]> = [[9 + d, 9 - d], [9 + d, 6 + d]]
    for (const [y, x] of cel) if (y >= 0 && y < n && x >= 0 && x < n) m[y][x] = 'G'
  }
  return juntar(m)
})()

export const GRADE_X: Grade = (() => {
  const n = 11
  const m = matriz(n)
  for (let i = 1; i < n - 1; i++) {
    m[i][i] = 'A'
    m[i][n - 1 - i] = 'A'
    if (i + 1 < n - 1) m[i][i + 1] = 'A'
    if (n - 2 - i > 0) m[i][n - 2 - i] = 'A'
  }
  return juntar(m)
})()

export const GRADE_DPAD: Grade = [
  '....XXXXX....',
  '....X...X....',
  '....X...X....',
  '....X...X....',
  'XXXXX...XXXXX',
  'X...........X',
  'X...........X',
  'X...........X',
  'XXXXX...XXXXX',
  '....X...X....',
  '....X...X....',
  '....X...X....',
  '....XXXXX....',
]

export const GRADE_CADEADO: Grade = [
  '...XXXXXX...',
  '..XX....XX..',
  '..X......X..',
  '..X......X..',
  '..X......X..',
  '.GGGGGGGGGG.',
  '.GLLLLLLLLG.',
  '.GLLLKKLLLG.',
  '.GLLLKKLLLG.',
  '.GLLLLKLLLG.',
  '.GLLLLLLLLG.',
  '.GGGGGGGGGG.',
]

export const GRADE_OLHO: Grade = [
  '................',
  '....XXXXXXXX....',
  '..XXWWWWWWWWXX..',
  '.XWWWWIIIIWWWWX.',
  'XWWWWIIKKIIWWWWX',
  '.XWWWWIIIIWWWWX.',
  '..XXWWWWWWWWXX..',
  '....XXXXXXXX....',
]

export const GRADE_OLHO_CORTADO: Grade = [
  '..............XX',
  '....XXXXXXXXXXXX',
  '..XXWWWWWWWWXXX.',
  '.XWWWWIIIIWWXWX.',
  'XWWWWIIKKIIXWWWX',
  '.XWWWWIXIIWWWWX.',
  '.XXXWWXWWWWWXX..',
  'XX..XXXXXXXX....',
]

export const GRADE_LIVRO: Grade = [
  '.BBBBBBBBBB..BBBBBBBBBB.',
  'BPPPPPPPPPPBBPPPPPPPPPPB',
  'BPLLLLLLLLPBBPLLLLLLLLPB',
  'BPPPPPPPPPPBBPPPPPPPPPPB',
  'BPLLLLLLLLPBBPLLLLLLLLPB',
  'BPPPPPPPPPPBBPPPPPPPPPPB',
  'BPLLLLLLLLPBBPLLLLLLLLPB',
  'BPPPPPPPPPPBBPPPPPPPPPPB',
  'BPLLLLLLPPPBBPPPLLLLLLPB',
  'BPPPPPPPPPPBBPPPPPPPPPPB',
  '.BBBBBBBBBBBBBBBBBBBBBB.',
  '..TTTTTTTTT..TTTTTTTTT..',
]

export const GRADE_PESSOA_MAIS: Grade = [
  '....XXXX..........',
  '...XXXXXX.........',
  '...XXXXXX.........',
  '...XXXXXX.........',
  '....XXXX..........',
  '..XXXXXXXX........',
  '.XXXXXXXXXX....P..',
  '.XXXXXXXXXX....P..',
  '.XXXXXXXXXX..PPPPP',
  '.XXXXXXXXXX....P..',
  '.XXXXXXXXXX....P..',
]

export const GRADE_GRUPO: Grade = (() => {
  const L = ['..XX..', '.XXXX.', '.XXXX.', '..XX..', 'XXXXXX', 'XXXXXX', 'XXXXXX']
  const C = ['..XXXX..', '.XXXXXX.', '.XXXXXX.', '.XXXXXX.', '..XXXX..', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX']
  const linhas: string[] = []
  for (let y = 0; y < C.length; y++) {
    const lado = y >= 2 ? L[y - 2] : '......'
    linhas.push(lado + C[y] + lado)
  }
  return linhas
})()

export const GRADE_TARTARUGA: Grade = [
  '...XXXXX....',
  '.XXXXXXXX.XX',
  'XXXXXXXXXXXX',
  'XXXXXXXXXXX.',
  '.XXXXXXXXX..',
  '.XX.XX.XX...',
]

export const GRADE_ONDA_EMBLEMA: Grade = [
  '......WWWW......',
  '....WWWWWWWW....',
  '...WWMMMMWWWW...',
  '..WWMM..MMWWWW..',
  '..WM......MWWW..',
  '.WWM..WW..MMWWW.',
  '.WM..WWWW..MWWW.',
  '.WM.WWMMWW..MWW.',
  '.WM.WM..MW..MWW.',
  '.WWM.WWWW..MMWW.',
  '..WWM......MWW..',
  '..MWWMMMMMMWWM..',
  '...MMWWWWWWMM...',
  '....MMMMMMMM....',
]

export const GRADE_ORNAMENTO_ONDA: Grade = [
  '..TTTTT...........TTTTTTTTT.',
  '.TWWWWWTTTTTTTTTTTTWWWWWWWWT',
  'TWWTTTWWWWWWWWWWWWWTTTTTTTT.',
  'TWTWWWTTTTTTTTTTTTTT.....TT.',
  'TWTWTWT...............TTT...',
  'TWWTWWT........TTTTTTT......',
  '.TWWWT.........T............',
  '..TTT.......................',
]

export const GRADE_VOLTAR: Grade = [
  '....X.......',
  '...XX.......',
  '..XXXXXXXX..',
  '.XXXXXXXXXX.',
  '..XX......XX',
  '...X.......X',
  '...........X',
  '..X.......XX',
  '..XXXXXXXX..',
]

export const GRADE_CONCHA: Grade = [
  '.....OOOO.....',
  '...OOXXXXOO...',
  '..OXXLXXLXXO..',
  '.OXLXXLLXXLXO.',
  '.OXLXXLLXXLXO.',
  'OXXLXXLLXXLXXO',
  'OXLXXLXXLXXLXO',
  '.OXXLXXXXLXXO.',
  '..OOXXXXXXOO..',
  '...OOOXXOOO...',
  '.....OOOO.....',
]
