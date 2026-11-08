// Utilitários de teste: monta cenários arbitrários (estado válido e serializável) e atalhos de comando.
import { aplicarComando } from '../acoes'
import type { Comando, ResultadoComando } from '../acoes'
import { criarEstadoInicial } from '../estado'
import type { CartaInstancia, EstadoDuelo, Fase, IdJogador, Posicao, UnidadeEmCampo } from '../estado'
import { CARTAS_NO_DUELO } from '../tipos'
import { CATALOGO } from '../../data/catalogo'

export type CampoCfg = string | { id: string; pos?: Posicao; viradaParaBaixo?: boolean; atacou?: boolean; buffAtk?: number; buffDef?: number }

export interface ConfigJogador {
  lp?: number
  mao?: string[]
  /** Por zona (índice); `null` = vazia. */
  campo?: (CampoCfg | null)[]
  descarte?: string[]
  /** Tamanho do baralho; padrão = completa até 30 cartas no total (cartas de enchimento CC-113). */
  baralho?: number
}

export interface ConfigCenario {
  humano?: ConfigJogador
  oponente?: ConfigJogador
  ativo?: IdJogador
  turno?: number
  fase?: Fase
  jogadaFeita?: boolean
}

const ENCHIMENTO = 'CC-113'
const ATRIBUTOS_DE_CENARIO: Readonly<Record<string, readonly [atk: number, defesa: number]>> = {
  'CC-101': [1200, 2000],
  'CC-103': [1600, 1500],
  'CC-104': [900, 2000],
  'CC-107': [1700, 2000],
  'CC-109': [1200, 1700],
  'CC-113': [700, 1800],
  'CC-147': [1800, 900],
  'CC-156': [2200, 700],
}
const CARTAS_POR_ID = new Map(CATALOGO.map((carta) => [carta.id, carta]))

export function cenario(cfg: ConfigCenario = {}): EstadoDuelo {
  let n = 0
  const nova = (prefixo: string, cartaId: string): CartaInstancia => ({ uid: `${prefixo}${++n}`, cartaId })
  const base = criarEstadoInicial([], [])
  const montar = (id: IdJogador, c: ConfigJogador = {}) => {
    const p = id === 'humano' ? 'h' : 'o'
    const j = base.jogadores[id]
    j.lp = c.lp ?? 5000
    j.mao = (c.mao ?? []).map((cid) => nova(p, cid))
    j.campo = [null, null, null, null, null]
    ;(c.campo ?? []).forEach((cc, z) => {
      if (cc === null || cc === undefined) return
      const o = typeof cc === 'string' ? { id: cc } : cc
      const inst = nova(p, o.id)
      const alvo = ATRIBUTOS_DE_CENARIO[o.id]
      const carta = CARTAS_POR_ID.get(o.id)
      const u: UnidadeEmCampo = {
        ...inst,
        posicao: o.pos ?? 'ATAQUE',
        viradaParaBaixo: o.viradaParaBaixo ?? false,
        atacou: o.atacou ?? false,
        buffAtk: (alvo ? alvo[0] - (carta?.atk ?? 0) : 0) + (o.buffAtk ?? 0),
        buffDef: (alvo ? alvo[1] - (carta?.defesa ?? 0) : 0) + (o.buffDef ?? 0),
        invocadaNoTurno: 1,
      }
      j.campo[z] = u
    })
    j.descarte = (c.descarte ?? []).map((cid) => nova(p, cid))
    const usadas = j.mao.length + j.campo.filter(Boolean).length + j.descarte.length
    const tamanho = c.baralho ?? Math.max(0, CARTAS_NO_DUELO - usadas)
    j.baralho = Array.from({ length: tamanho }, () => nova(p, ENCHIMENTO))
  }
  montar('humano', cfg.humano)
  montar('oponente', cfg.oponente)
  base.ativo = cfg.ativo ?? 'humano'
  base.turno = cfg.turno ?? (base.ativo === 'humano' ? 3 : 4)
  base.fase = cfg.fase ?? 'PRINCIPAL'
  base.jogadaFeita = cfg.jogadaFeita ?? false
  return base
}

export function falha(r: ResultadoComando): never {
  throw new Error(r.ok ? 'esperava erro' : r.erro)
}

/** Aplica e exige sucesso; devolve o novo estado. */
export function ok(r: ResultadoComando): EstadoDuelo {
  if (!r.ok) throw new Error(`Comando rejeitado: ${r.erro}`)
  return r.estado
}

export function uidDe(e: EstadoDuelo, j: IdJogador, cartaId: string): string {
  const c = e.jogadores[j].mao.find((x) => x.cartaId === cartaId)
  if (!c) throw new Error(`${cartaId} não está na mão de ${j}`)
  return c.uid
}

export function jogar(e: EstadoDuelo, j: IdJogador, cartaId: string, extra: { zona?: number; posicao?: Posicao; viradaParaBaixo?: boolean; alvo?: number } = {}): ResultadoComando {
  return aplicarComando(e, { tipo: 'jogarCarta', jogador: j, uid: uidDe(e, j, cartaId), ...extra })
}

export function cmd(e: EstadoDuelo, c: Comando): ResultadoComando {
  return aplicarComando(e, c)
}

export function irParaCombate(e: EstadoDuelo): EstadoDuelo {
  return ok(aplicarComando(e, { tipo: 'avancarFase', jogador: e.ativo }))
}

export function atacar(e: EstadoDuelo, atacante: number, alvo: number | 'direto'): ResultadoComando {
  return aplicarComando(e, { tipo: 'atacar', jogador: e.ativo, atacante, alvo })
}

/** Cenário já na fase de combate, com a jogada da mão consumida. */
export function cenarioCombate(cfg: ConfigCenario = {}): EstadoDuelo {
  return cenario({ fase: 'COMBATE', jogadaFeita: true, ...cfg })
}
