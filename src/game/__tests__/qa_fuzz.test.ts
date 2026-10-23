// QA independente: fuzz de comandos MALFORMADOS (lixo, NaN, negativos, tipos errados) e de estados aleatórios.
// Garante: nunca lança, comando recusado devolve o MESMO objeto de estado, estado aceito mantém invariantes.
import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { aplicarComando, ataquesLegais, jogadasLegais } from '../acoes'
import type { Comando } from '../acoes'
import { criarDuelo, executarTurnoIA } from '../duelo'
import { invariantes } from '../estado'
import type { EstadoDuelo } from '../estado'
import { criarRng, embaralhar } from '../rng'
import type { Rng } from '../rng'
import { cenario } from './util'

function congelar<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) congelar(v)
  }
  return o
}

const LIXO: unknown[] = [
  undefined, null, NaN, Infinity, -Infinity, -1, 0, 1, 4, 5, 1e9, -0, 1.5, '0', '', 'direto', 'DIREITO', 'ATAQUE', 'ataque',
  true, false, {}, [], [0], { zona: 0 }, () => 0, Symbol.for('x'), 10n, new Date(0), 'toString', '__proto__', 'constructor',
]
const TIPOS = ['jogarCarta', 'mudarPosicao', 'descartar', 'avancarFase', 'encerrarTurno', 'atacar', 'desistir', 'xyz', '', 'toString']

function pick<T>(rng: Rng, l: readonly T[]): T {
  return l[Math.floor(rng() * l.length)] as T
}

function comandoLixo(e: EstadoDuelo, rng: Rng): unknown {
  const modo = rng()
  if (modo < 0.03) return pick(rng, LIXO)
  const j = rng() < 0.8 ? e.ativo : e.ativo === 'humano' ? 'oponente' : 'humano'
  const mao = e.jogadores[j === 'humano' || j === 'oponente' ? j : 'humano'].mao
  const c: Record<string, unknown> = { tipo: rng() < 0.9 ? pick(rng, TIPOS) : pick(rng, LIXO), jogador: rng() < 0.9 ? j : pick(rng, LIXO) }
  const campos = ['uid', 'zona', 'posicao', 'alvo', 'atacante']
  for (const k of campos) {
    if (rng() < 0.6) c[k] = rng() < 0.4 ? pick(rng, LIXO) : k === 'uid' ? (mao.length && rng() < 0.7 ? pick(rng, mao).uid : pick(rng, LIXO)) : k === 'posicao' ? pick(rng, ['ATAQUE', 'DEFESA']) : Math.floor(rng() * 7) - 1
  }
  return c
}

function baralhoAleatorio(rng: Rng): string[] {
  return embaralhar(
    CATALOGO.flatMap((c) => [c.id, c.id, c.id]),
    rng,
  ).slice(0, 40)
}

describe('QA fuzz: comandos malformados', () => {
  it('nunca lança; recusa devolve o mesmo objeto; aceito preserva invariantes (60 partidas)', () => {
    let aceitos = 0
    let recusados = 0
    for (let seed = 1; seed <= 60; seed++) {
      const rng = criarRng(seed * 104729)
      const r = criarDuelo({ baralhoJogador: baralhoAleatorio(rng), baralhoOponente: baralhoAleatorio(rng), seed })
      if (!r.ok) throw new Error('baralho')
      let e = congelar(r.estado)
      for (let passo = 0; passo < 500 && !e.resultado; passo++) {
        let cmd: unknown
        if (rng() < 0.5) {
          const bons: Comando[] = [...jogadasLegais(e), ...ataquesLegais(e), { tipo: 'avancarFase', jogador: e.ativo }, { tipo: 'encerrarTurno', jogador: e.ativo }]
          cmd = pick(rng, bons)
        } else cmd = comandoLixo(e, rng)
        const antes = JSON.stringify(e)
        let res
        try {
          res = aplicarComando(e, cmd as Comando)
        } catch (x) {
          throw new Error(`lançou com ${String(JSON.stringify(cmd, (_, v) => (typeof v === 'bigint' ? 'bigint' : typeof v === 'symbol' ? 'symbol' : v)))}: ${String(x)}`)
        }
        expect(JSON.stringify(e)).toBe(antes)
        if (res.ok) {
          aceitos++
          expect(invariantes(res.estado)).toEqual([])
          e = congelar(res.estado)
        } else {
          recusados++
          expect(res.estado).toBe(e)
          expect(typeof res.erro).toBe('string')
        }
      }
    }
    expect(aceitos).toBeGreaterThan(500)
    expect(recusados).toBeGreaterThan(500)
  })

  // ACHADO QA-1: comando nulo/indefinido/primitivo lança TypeError em vez de { ok: false }.
  it('QA-1: aplicarComando(estado, null) deve recusar sem lançar', () => {
    const e = cenario()
    for (const c of [null, undefined, 0, 'x', true]) {
      const r = aplicarComando(e, c as unknown as Comando)
      expect(r.ok).toBe(false)
    }
  })
})

describe('QA fuzz: estados aleatórios e turno completo da IA', () => {
  const IDS = CATALOGO.map((c) => c.id)
  it('300 cenários aleatórios: executarTurnoIA sempre avança/termina, sem fallback e com invariantes', () => {
    for (let s = 1; s <= 300; s++) {
      const rng = criarRng(s * 31337)
      const ativo = rng() < 0.5 ? 'humano' : 'oponente'
      const cartas = (n: number) => Array.from({ length: n }, () => pick(rng, IDS))
      const unidades = IDS.filter((i) => CATALOGO.find((c) => c.id === i)?.tipo === 'unidade')
      const campo = () => Array.from({ length: 5 }, () => (rng() < 0.5 ? { id: pick(rng, unidades), pos: rng() < 0.5 ? ('ATAQUE' as const) : ('DEFESA' as const), buffAtk: Math.floor(rng() * 9 - 4) * 300 } : null))
      const armadilhas = IDS.filter((i) => CATALOGO.find((c) => c.id === i)?.tipo === 'armadilha')
      const e = cenario({
        ativo,
        turno: (ativo === 'humano' ? 3 : 2) + 2 * Math.floor(rng() * 5),
        humano: { lp: 100 + Math.floor(rng() * 80) * 100, mao: cartas(5 - Math.floor(rng() * 3)), campo: campo(), suporte: [rng() < 0.5 ? { id: pick(rng, armadilhas), turno: 1 } : null], baralho: 12 },
        oponente: { lp: 100 + Math.floor(rng() * 80) * 100, mao: cartas(5 - Math.floor(rng() * 3)), campo: campo(), suporte: [rng() < 0.5 ? { id: pick(rng, armadilhas), turno: 1 } : null], baralho: 12 },
      })
      const turno0 = e.turno
      const r = executarTurnoIA(e)
      expect(r.ok, `cenário ${s}`).toBe(true)
      if (!r.ok) continue
      expect(r.estado.resultado !== null || r.estado.turno === turno0 + 1, `cenário ${s}: turno avançou`).toBe(true)
      expect(r.eventos.some((x) => x.tipo === 'ia_fallback'), `cenário ${s}: fallback`).toBe(false)
      // invariantes estruturais (total de cartas varia por construção; checa só o resto)
      expect(invariantes(r.estado).filter((m) => !m.includes('total de cartas'))).toEqual([])
    }
  })
})

