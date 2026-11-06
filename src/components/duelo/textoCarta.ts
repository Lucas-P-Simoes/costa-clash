import type { Carta, Grupo } from '../../game/tipos'
import type { TipoArte } from './ArteCarta'

export const ROTULO_GRUPO: Readonly<Record<Grupo, string>> = {
  ecossistema: 'Ecossistema',
  fauna: 'Fauna',
  atividade: 'Atividade',
  impacto: 'Impacto',
}

export function tipoArte(c: Carta): TipoArte {
  if (c.tipo === 'unidade') return c.grupo ?? 'ecossistema'
  return 'ecossistema'
}

/** Rótulo curto do tipo: "Fauna", "Ecossistema". */
export function rotuloTipo(c: Carta): string {
  if (c.tipo === 'unidade') return ROTULO_GRUPO[c.grupo ?? 'ecossistema']
  return 'Carta'
}

/** Texto acessível de uma carta (sem posição/zona). */
export function descricaoCarta(c: Carta, atk?: number | null, def?: number | null): string {
  return `${c.nome}, unidade ${rotuloTipo(c).toLowerCase()}, ATK ${atk ?? c.atk}, DEF ${def ?? c.defesa}`
}

const ABREVIACOES: Readonly<Record<string, string>> = {
  Microplásticos: 'Micropl.',
  Oceanográfica: 'Oceanogr.',
  Monitoramento: 'Monitor.',
  Participativa: 'Particip.',
  Branqueamento: 'Branquea.',
}

/**
 * Nome abreviado POR PALAVRA para cartas de campo estreitas (nunca corta no meio da palavra sem marcar): palavras (ou trechos
 * separados por hífen) com 10+ letras viram 8 letras + ponto, ou a abreviação curada. O nome completo continua no DOM,
 * no title e no rótulo acessível; a escolha entre completo/curto é feita por CSS (container query pela largura da carta).
 */
export function nomeCurto(nome: string): string {
  return nome
    .split(/(\s+|-)/)
    .map((seg) => (seg.length >= 10 ? (ABREVIACOES[seg] ?? seg.slice(0, 8) + '.') : seg))
    .join('')
}
