import { PixelArt } from '../ui/PixelArt'
import type { Grade, Paleta } from '../ui/PixelArt'

// Arte própria por GRUPO/TIPO (pixel art desenhada em grade, 16x12; não vem de arquivos de referência).
export type TipoArte = 'ecossistema' | 'fauna' | 'atividade' | 'impacto' | 'acao' | 'equipamento' | 'terreno' | 'armadilha'

const ARTES: Readonly<Record<TipoArte, { grade: Grade; paleta: Paleta }>> = {
  ecossistema: {
    paleta: { a: '#0e2a3d', g: '#37b05f', G: '#1f6e3a', m: '#8a5a2c', b: '#1f6f9c', B: '#3fdcf0' },
    grade: [
      'aaaaaaaaaaaaaaaa',
      'aaaaagggggaaaaaa',
      'aaagggGgggggaaaa',
      'aagggggGgggggaaa',
      'aaagggggggggaaaa',
      'aaaaagggggaaaaaa',
      'aaaaaammmaaaaaaa',
      'aaaaaammmaaaaaaa',
      'aaaammammamaaaaa',
      'bbbmmbbmmbbmbbbb',
      'bbbbbbbbbbbbbbbb',
      'bBbbbbbbBbbbbbBb',
    ],
  },
  fauna: {
    paleta: { b: '#1f6f9c', B: '#3fdcf0', o: '#f0a63a', O: '#c46a1a', K: '#0a1520' },
    grade: [
      'bbbbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbb',
      'bbbbbboooooobbbb',
      'bbbboooooooooobO',
      'bbboooKoooooooOO',
      'bbooooooooooOOOb',
      'bbbooooooooooOOO',
      'bbbboooooooooObO',
      'bbbbbboooooobbbb',
      'bbbbbbbbbbbbbbbb',
      'bBbbbbbBbbbbbBbb',
      'bbbbbbbbbbbbbbbb',
    ],
  },
  atividade: {
    paleta: { a: '#0e2a3d', w: '#e8e2c8', m: '#8a5a2c', M: '#5a3a1a', b: '#1f6f9c', B: '#3fdcf0' },
    grade: [
      'aaaaaaaaaaaaaaaa',
      'aaaaaaawaaaaaaaa',
      'aaaaaawwwaaaaaaa',
      'aaaaawwwwwaaaaaa',
      'aaaawwwwwwwaaaaa',
      'aaaaaaamaaaaaaaa',
      'aaaaaaamaaaaaaaa',
      'aammmmmmmmmmmmaa',
      'bbmMMMMMMMMMmbbb',
      'bbbmmmmmmmmmbbbb',
      'bBbbbbbBbbbbbBbb',
      'bbbbbbbbbbbbbbbb',
    ],
  },
  impacto: {
    paleta: { d: '#2a1218', s: '#6a6a72', S: '#9a9aa4', r: '#c4402a', k: '#1a1a20' },
    grade: [
      'dddddddddddddddd',
      'ddddddSSSddddddd',
      'dddddSSSSSdddddd',
      'ddddddsSSsddddSd',
      'dddddddsddddddSS',
      'ddkkddkkddkkdddd',
      'dkkkkkkkkkkkkddd',
      'dkrkkrkkrkkkkddd',
      'dkkkkkkkkkkkkddd',
      'dkkkkkkkkkkkkddd',
      'rrrrrrrrrrrrrrrr',
      'ddddddddddddddd d'.replace(' ', ''),
    ],
  },
  acao: {
    paleta: { c: '#143a52', Y: '#f2cf6e', y: '#c48a1a' },
    grade: [
      'cccccccccYYYcccc',
      'ccccccccYYYccccc',
      'cccccccYYYcccccc',
      'ccccccYYYYYYcccc',
      'ccccccyyYYYcccc c'.replace(' ', ''),
      'cccccccccYYcccccc'.slice(0, 16),
      'ccccccccYYccccccc'.slice(0, 16),
      'cccccccYYcccccccc'.slice(0, 16),
      'ccccccYYccccccccc'.slice(0, 16),
      'cccccYycccccccccc'.slice(0, 16),
      'ccccccccccccccc c'.replace(' ', ''),
      'cccccccccccccccc',
    ],
  },
  equipamento: {
    paleta: { c: '#143a52', T: '#3fdcf0', t: '#1fa0bc', u: '#145f78' },
    grade: [
      'cccccccccccccccc',
      'ccTTTTTTTTTTTTcc',
      'ccTttttttttttTcc',
      'ccTtttttTtttttTc',
      'ccTtttTTTTTtttTc',
      'cccTtttTTTtttTcc',
      'cccTtttTTTtttTcc',
      'ccccTttttttTcccc',
      'cccccTttttTccccc',
      'ccccccTttTcccccc',
      'cccccccTTccccccc',
      'cccccccccccccccc',
    ],
  },
  terreno: {
    paleta: { a: '#0e2a3d', m: '#2a5a4a', M: '#1a3a30', y: '#f2cf6e', b: '#1f6f9c', B: '#3fdcf0' },
    grade: [
      'aaaaaaaaaaaayyaa',
      'aaaaaaaaaaaayyaa',
      'aaaaaMaaaaaaaaaa',
      'aaaaMMMaaaaaaaaa',
      'aaaMMmmMaaaMaaaa',
      'aaMMmmmmMaMMMaaa',
      'aMMmmmmmmMMmmMaa',
      'MMmmmmmmmmmmmmMM',
      'bbbbbbbbbbbbbbbb',
      'bBbbbbBbbbbBbbbb',
      'bbbbbbbbbbbbbbbb',
      'bbbBbbbbbBbbbbbb',
    ],
  },
  armadilha: {
    paleta: { p: '#2a1a40', P: '#8a5ac4', W: '#e8e2c8', K: '#0a0a14' },
    grade: [
      'pppppppppppppppp',
      'pppppppppppppppp',
      'pppppPPPPPPpppp p'.replace(' ', ''),
      'ppppPPPPPPPPpppp',
      'pppPPPWWWWPPPppp',
      'ppPPPWWKKWWPPPpp',
      'pppPPPWWWWPPPppp',
      'ppppPPPPPPPPpppp',
      'pppppPPPPPPppppp',
      'pppppppppppppppp',
      'pppppppppppppppp',
      'pppppppppppppppp',
    ],
  },
}

export function ArteCarta({ tipo, className }: { tipo: TipoArte; className?: string }) {
  const a = ARTES[tipo]
  return <PixelArt grade={a.grade} paleta={a.paleta} className={className} />
}
