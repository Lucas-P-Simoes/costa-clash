// Utilitários de teste: monta cenários arbitrários (estado válido e serializável) e atalhos de comando.
import { CATALOGO } from '../../data/catalogo'
import { aplicarComando } from '../acoes'
import type { Comando, ResultadoComando } from '../acoes'
import { criarEstadoInicial, mapaCatalogo } from '../estado'
import type { CartaInstancia, EstadoDuelo, Fase, IdJogador, Posicao, SuporteEmZona, UnidadeEmCampo } from '../estado'

const cat = mapaCatalogo(CATALOGO)

export type CampoCfg = string | { id: string; pos?: Posicao; viradaParaBaixo?: boolean; atacou?: boolean; buffAtk?: number; buffDef?: number; equip?: string }
export type SuporteCfg = string | { id: string; turno?: number; ordem?: number }

export interface ConfigJogador {
  lp?: number
  mao?: string[]
  /** Por zona (índice); `null` = vazia. */
  campo?: (CampoCfg | null)[]
  suporte?: (SuporteCfg | null)[]
  descarte?: string[]
  /** Tamanho do baralho; padrão = completa até 40 cartas no total (cartas de enchimento CC-013). */
  baralho?: number
}

export interface ConfigCenario {
  humano?: ConfigJogador
  oponente?: ConfigJogador
  ativo?: IdJogador
  turno?: number
  fase?: Fase
  jogadaFeita?: boolean
  terreno?: { id: string; dono: IdJogador }
  revelacao?: IdJogador | null
}

const ENCHIMENTO = 'CC-013'

export function cenario(cfg: ConfigCenario = {}): EstadoDuelo {
  let n = 0
  const nova = (prefixo: string, cartaId: string): CartaInstancia => ({ uid: `${prefixo}${++n}`, cartaId })
  const base = criarEstadoInicial([], [])
  let ordem = 1
  const montar = (id: IdJogador, c: ConfigJogador = {}) => {
    const p = id === 'humano' ? 'h' : 'o'
    const j = base.jogadores[id]
    j.lp = c.lp ?? 8000
    j.mao = (c.mao ?? []).map((cid) => nova(p, cid))
    j.campo = [null, null, null, null, null]
    j.suporte = [null, null, null, null, null]
    ;(c.campo ?? []).forEach((cc, z) => {
      if (cc === null || cc === undefined) return
      const o = typeof cc === 'string' ? { id: cc } : cc
      const inst = nova(p, o.id)
      const u: UnidadeEmCampo = {
        ...inst,
        posicao: o.pos ?? 'ATAQUE',
        viradaParaBaixo: o.viradaParaBaixo ?? false,
        atacou: o.atacou ?? false,
        buffAtk: o.buffAtk ?? 0,
        buffDef: o.buffDef ?? 0,
        equipamentoUid: null,
        invocadaNoTurno: 1,
      }
      if (o.equip) {
        const ei = nova(p, o.equip)
        const zs = j.suporte.findIndex((s) => s === null)
        j.suporte[zs] = { ...ei, tipo: 'equipamento', colocadaNoTurno: 1, ordem: ordem++, vinculadaA: u.uid }
        u.equipamentoUid = ei.uid
      }
      j.campo[z] = u
    })
    ;(c.suporte ?? []).forEach((ss, z) => {
      if (ss === null || ss === undefined) return
      const o = typeof ss === 'string' ? { id: ss } : ss
      const inst = nova(p, o.id)
      const tipo = cat.get(o.id)?.tipo === 'armadilha' ? 'armadilha' : 'equipamento'
      const s: SuporteEmZona = { ...inst, tipo, colocadaNoTurno: o.turno ?? 1, ordem: o.ordem ?? ordem++, vinculadaA: null }
      j.suporte[z] = s
    })
    j.descarte = (c.descarte ?? []).map((cid) => nova(p, cid))
    const usadas = j.mao.length + j.campo.filter(Boolean).length + j.suporte.filter(Boolean).length + j.descarte.length
    const tamanho = c.baralho ?? Math.max(0, 40 - usadas)
    j.baralho = Array.from({ length: tamanho }, () => nova(p, ENCHIMENTO))
  }
  montar('humano', cfg.humano)
  montar('oponente', cfg.oponente)
  base.ativo = cfg.ativo ?? 'humano'
  base.turno = cfg.turno ?? (base.ativo === 'humano' ? 3 : 4)
  base.fase = cfg.fase ?? 'PRINCIPAL'
  base.jogadaFeita = cfg.jogadaFeita ?? false
  base.revelacao = cfg.revelacao ?? null
  base.proximaOrdem = ordem
  if (cfg.terreno) {
    base.terreno = { ...nova(cfg.terreno.dono === 'humano' ? 'h' : 'o', cfg.terreno.id), dono: cfg.terreno.dono }
    // a carta de terreno conta no total do dono: tira uma de enchimento do baralho (se ele foi preenchido automaticamente)
    const cfgDono = cfg[cfg.terreno.dono]
    if (cfgDono?.baralho === undefined) base.jogadores[cfg.terreno.dono].baralho.pop()
  }
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
