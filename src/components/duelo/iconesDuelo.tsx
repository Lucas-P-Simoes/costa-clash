import { PixelArt } from '../ui/PixelArt'
import type { Grade } from '../ui/PixelArt'

// Ícones pixel art do tabuleiro do duelo (grades de caracteres; '.' = transparente). Decorativos (aria-hidden).
interface Props {
  className?: string
}

const GRADE_ESCUDO: Grade = [
  '.WWWWWWWWWWWW.',
  'WHHHHHHBBBBBBW',
  'WHHBBBBBBBBBBW',
  'WHBBBBBBBBBBBW',
  'WHBBBBBBBBBBBW',
  'WHBBBBBBBBBBBW',
  'WHBBBBBBBBBBBW',
  '.WBBBBBBBBBBW.',
  '.WBBBBBBBBBBW.',
  '..WBBBBBBBBW..',
  '..WBBBBBBBBW..',
  '...WBBBBBBW...',
  '....WBBBBW....',
  '.....WBBW.....',
  '......WW......',
]

const GRADE_MONITOR: Grade = [
  '.LLLLLLLLLLLLLL.',
  'RRRRRRRRRRRRRRRR',
  'RRDDDDDDDDDDDDRR',
  'RRDDDDDDDDDDDDRR',
  'RRDDDDDDDDDDDDRR',
  'RRDDDDDDDDDDDDRR',
  'RRDDDDDDDDDDDDRR',
  'RRDDDDDDDDDDDDRR',
  'RRRRRRRRRRRRRRRR',
  '.RRRRRRRRRRRRRR.',
  '......RRRR......',
  '.....RRRRRR.....',
  '...RRRRRRRRRR...',
  '..RRRRRRRRRRRR..',
]

const GRADE_PESSOA: Grade = [
  '....CCCCCC....',
  '...CCCCCCCC...',
  '...CCLLCCCC...',
  '...CCCCCCCC...',
  '...CCCCCCCC...',
  '....CCCCCC....',
  '..............',
  '..CCCCCCCCCC..',
  '.CCLLCCCCCCCC.',
  'CCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCC',
]

const GRADE_LAMPADA: Grade = [
  '...YYYYYY...',
  '..YYYYYYYY..',
  '.YYWWYYYYYY.',
  '.YYWYYYYYYY.',
  '.YYYYYYYYYY.',
  '.YYYYYYYYYY.',
  '..YYYYYYYY..',
  '...YYYYYY...',
  '....GGGG....',
  '...GGGGGG...',
  '....GGGG....',
  '...GGGGGG...',
  '....GGGG....',
  '.....GG.....',
]

/** Duas setas ">>" douradas (banner SEU TURNO). */
const GRADE_SETAS: Grade = (() => {
  const linhas: string[] = []
  const w = 16
  for (let y = 0; y < 14; y++) {
    const d = y < 7 ? y : 13 - y
    const l = Array.from({ length: w }, () => '.')
    for (const base of [0, 6]) {
      for (const x of [base + d, base + d + 1, base + d + 2]) if (x < w) l[x] = 'G'
    }
    linhas.push(l.join(''))
  }
  return linhas
})()

const GRADE_CORACAO: Grade = [
  '.HH..HH.',
  'HHHHHHHH',
  'HHHHHHHH',
  'HHHHHHHH',
  '.HHHHHH.',
  '..HHHH..',
  '...HH...',
]

const GRADE_RELOGIO: Grade = [
  '.XXXXXXXX.',
  '..XXXXXX..',
  '...XXXX...',
  '....XX....',
  '...X..X...',
  '..XXXXXX..',
  '.XXXXXXXX.',
]

export function IconeEscudo({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_ESCUDO} paleta={{ W: '#cfeeff', H: '#8fd0ff', B: '#2a74c4' }} />
}

export function IconeMonitor({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_MONITOR} paleta={{ R: '#ff5a4a', L: '#ffa090', D: '#3a0e0e' }} />
}

export function IconePessoa({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_PESSOA} paleta={{ C: '#3fa8f0', L: '#a8e4ff' }} />
}

export function IconeLampada({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_LAMPADA} paleta={{ Y: '#ffcf4a', W: '#fff4c0', G: '#8a7a50' }} />
}

export function IconeSetas({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_SETAS} paleta={{ G: '#f2c24a' }} />
}

export function IconeCoracaoVida({ className, cor }: Props & { cor: string }) {
  return <PixelArt className={className} grade={GRADE_CORACAO} paleta={{ H: cor }} />
}

export function IconeRelogioPixel({ className }: Props) {
  return <PixelArt className={className} grade={GRADE_RELOGIO} paleta={{ X: '#8fd0ff' }} />
}
