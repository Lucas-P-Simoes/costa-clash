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
  if (c.tipo === 'armadilha') return 'armadilha'
  if (c.subtipo === 'equipamento') return 'equipamento'
  if (c.subtipo === 'terreno') return 'terreno'
  return 'acao'
}

/** Rótulo curto do tipo: "Fauna", "Ação", "Equipamento", "Terreno", "Armadilha". */
export function rotuloTipo(c: Carta): string {
  if (c.tipo === 'unidade') return ROTULO_GRUPO[c.grupo ?? 'ecossistema']
  if (c.tipo === 'armadilha') return 'Armadilha'
  if (c.subtipo === 'equipamento') return 'Equipamento'
  if (c.subtipo === 'terreno') return 'Terreno'
  return 'Ação'
}

function grupoTxt(alvo?: string): string {
  return alvo && alvo in ROTULO_GRUPO ? ` ${ROTULO_GRUPO[alvo as Grupo]}` : ''
}

/** Efeito curto em português para ações e armadilhas (unidades não têm efeito). */
export function efeitoCurto(c: Carta): string {
  const e = c.efeito
  if (!e) return ''
  const v = Math.abs(e.valor)
  switch (e.operacao) {
    case 'debuff_grupo':
      return `Reduz ATK e DEF de 1 unidade inimiga${grupoTxt(e.alvo)} em ${v}.`
    case 'buff_grupo':
      return `Aumenta ATK e DEF de 1 unidade sua${grupoTxt(e.alvo)} em ${v}.`
    case 'buff_unidade':
      return `Aumenta ATK e DEF de 1 unidade sua em ${v}.`
    case 'destruir_grupo':
      return `Destrói 1 unidade inimiga${grupoTxt(e.alvo)}.`
    case 'cura':
      return `Recupera ${v} LP.`
    case 'revelar':
      return 'Revela as armadilhas inimigas até o fim do turno.'
    case 'equip_buff_atk':
      return `Equipamento: +${v} ATK (unidade${grupoTxt(e.alvo) || ' qualquer'}).`
    case 'equip_buff_def':
      return `Equipamento: +${v} DEF (unidade${grupoTxt(e.alvo) || ' qualquer'}).`
    case 'field_bonus':
      return `Terreno: +${v} ATK e DEF às unidades${grupoTxt(e.alvo)} dos dois lados.`
    case 'reduzir_dano':
      return e.gatilho === 'ataque_direto' ? `Reduz em ${v} o dano de um ataque direto recebido.` : `Reduz em ${v} o dano de um ataque recebido.`
    case 'anular_ataque':
      return e.gatilho === 'ataque_direto' ? 'Anula um ataque direto recebido.' : 'Anula um ataque recebido.'
    case 'debuff_invocada':
      return `Quando o adversário invoca uma unidade Impacto, reduz seu ATK e DEF em ${v}.`
    default:
      return c.educacao
  }
}

/** Texto acessível de uma carta (sem posição/zona). */
export function descricaoCarta(c: Carta, atk?: number | null, def?: number | null): string {
  if (c.tipo === 'unidade') return `${c.nome}, unidade ${rotuloTipo(c).toLowerCase()}, ATK ${atk ?? c.atk}, DEF ${def ?? c.defesa}`
  return `${c.nome}, ${rotuloTipo(c).toLowerCase()}. ${efeitoCurto(c)}`
}

/** Efeito do terreno ativo em uma frase: "+300 ATK e DEF para ecossistema, nos dois lados." (null se a carta não tem efeito de terreno). */
export function efeitoTerreno(c: Carta): string | null {
  const e = c.efeito
  if (!e || e.operacao !== 'field_bonus') return null
  const alvo = e.alvo && e.alvo in ROTULO_GRUPO ? ROTULO_GRUPO[e.alvo as Grupo].toLowerCase() : 'todas as unidades'
  const v = Math.abs(e.valor)
  return `${e.valor < 0 ? '-' : '+'}${v} ATK e DEF para ${alvo}, nos dois lados`
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
