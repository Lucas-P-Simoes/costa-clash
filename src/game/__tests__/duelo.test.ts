import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { aplicarComando, listarJogadas, registrarRepeticao } from '../acoes'
import { criarDuelo } from '../duelo'
import { invariantes, totalCartas, verificarResultado, mapaCatalogo } from '../estado'
import type { EstadoDuelo } from '../estado'
import { atacar, cenario, cenarioCombate, jogar, ok } from './util'
import { CATALOGO } from '../../data/catalogo'

const OPP = BARALHOS_OPONENTES['ressaca'] as string[]

function novo(seed = 1): EstadoDuelo {
  const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: OPP, seed })
  if (!r.ok) throw new Error(r.erros.join('; '))
  return r.estado
}

describe('criarDuelo', () => {
  it('compra mão de 5 para ambos (baralho 35), humano começa em PRINCIPAL no turno 1 com 8000 LP', () => {
    const e = novo()
    for (const id of ['humano', 'oponente'] as const) {
      const j = e.jogadores[id]
      expect(j.mao).toHaveLength(5)
      expect(j.baralho).toHaveLength(35)
      expect(j.lp).toBe(8000)
      expect(j.campo).toHaveLength(5)
      expect(j.suporte).toHaveLength(5)
      expect(j.descarte).toHaveLength(0)
    }
    expect(e.ativo).toBe('humano')
    expect(e.turno).toBe(1)
    expect(e.fase).toBe('PRINCIPAL')
    expect(e.terreno).toBeNull()
    expect(e.resultado).toBeNull()
    expect(invariantes(e)).toEqual([])
  })

  it('o primeiro jogador não compra carta extra no turno 1', () => {
    const e = novo()
    expect(e.jogadores.humano.mao).toHaveLength(5)
    expect(e.jogadores.humano.baralho).toHaveLength(35)
    // eventos de compra do turno 1 são só as mãos iniciais
    const compras = e.log.filter((x) => x.tipo === 'compra')
    expect(compras).toHaveLength(2)
  })

  it('é determinístico por seed e o estado é serializável em JSON sem perdas', () => {
    expect(novo(5)).toEqual(novo(5))
    expect(novo(5)).not.toEqual(novo(6))
    const e = novo(9)
    expect(JSON.parse(JSON.stringify(e))).toEqual(e)
  })

  it('aceita RNG injetado e conserva o multiconjunto de cartas', () => {
    let i = 0
    const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: OPP, seed: 0, rng: () => ((i++ * 0.37) % 1) })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const ids = [...r.estado.jogadores.humano.mao, ...r.estado.jogadores.humano.baralho].map((c) => c.cartaId).sort()
      expect(ids).toEqual([...BARALHO_INICIAL].sort())
    }
  })

  it('rejeita baralhos inválidos antes de criar o duelo, indicando de quem é o baralho', () => {
    const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL.slice(0, 39), baralhoOponente: [...OPP.slice(0, 39), 'CC-999'], seed: 1 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erros.some((m) => m.startsWith('Baralho do jogador'))).toBe(true)
      expect(r.erros.some((m) => m.startsWith('Baralho do oponente') && m.includes('CC-999'))).toBe(true)
    }
  })

  it('uids são únicos entre os dois jogadores', () => {
    const e = novo()
    expect(invariantes(e)).toEqual([])
  })
})

describe('turnos, reposição da mão e derrota por compra incompleta', () => {
  it('repõe a mão até 5 no início do turno (compra 1 depois de jogar 1)', () => {
    let e = novo(3)
    const carta = e.jogadores.humano.mao.find((c) => CATALOGO.find((x) => x.id === c.cartaId)?.tipo === 'unidade')
    if (!carta) throw new Error('mão sem unidade nesta seed')
    e = ok(aplicarComando(e, { tipo: 'jogarCarta', jogador: 'humano', uid: carta.uid }))
    expect(e.jogadores.humano.mao).toHaveLength(4)
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(e.ativo).toBe('oponente')
    expect(e.turno).toBe(2)
    expect(e.jogadores.oponente.mao).toHaveLength(5) // não precisava comprar
    expect(e.jogadores.oponente.baralho).toHaveLength(35)
  })

  it('a compra aumenta a mão de 4 para 5 e reduz o baralho em 1', () => {
    let e = cenario({ humano: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-006'], baralho: 10 }, oponente: { mao: ['CC-001'], baralho: 10 }, ativo: 'oponente', turno: 2, jogadaFeita: true })
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.ativo).toBe('humano')
    expect(e.jogadores.humano.mao).toHaveLength(5)
    expect(e.jogadores.humano.baralho).toHaveLength(9)
    expect(e.fase).toBe('PRINCIPAL')
    expect(e.jogadaFeita).toBe(false)
  })

  it('perde imediatamente se o baralho não tem cartas suficientes para repor (sem compra parcial)', () => {
    const e0 = cenario({ humano: { mao: ['CC-001', 'CC-002', 'CC-004'], baralho: 1 }, oponente: { mao: ['CC-001'], baralho: 5 }, ativo: 'oponente', turno: 2, jogadaFeita: true })
    const e = ok(aplicarComando(e0, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'compra' })
    expect(e.jogadores.humano.mao).toHaveLength(3) // nada foi comprado
    expect(e.jogadores.humano.baralho).toHaveLength(1)
  })

  it('perde com baralho vazio e mão incompleta', () => {
    const e0 = cenario({ humano: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005'], baralho: 0 }, oponente: { mao: ['CC-001'], baralho: 5 }, ativo: 'oponente', turno: 2, jogadaFeita: true })
    const e = ok(aplicarComando(e0, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'compra' })
  })

  it('NÃO perde com baralho vazio se a mão já tem 5 (nenhuma compra exigida)', () => {
    const e0 = cenario({ humano: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 0 }, oponente: { mao: ['CC-001'], baralho: 5 }, ativo: 'oponente', turno: 2, jogadaFeita: true })
    const e = ok(aplicarComando(e0, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.resultado).toBeNull()
    expect(e.ativo).toBe('humano')
  })

  it('compra exatamente o necessário quando há cartas de sobra (baralho == falta)', () => {
    const e0 = cenario({ humano: { mao: ['CC-001', 'CC-002', 'CC-004'], baralho: 2 }, oponente: { mao: ['CC-001'], baralho: 5 }, ativo: 'oponente', turno: 2, jogadaFeita: true })
    const e = ok(aplicarComando(e0, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.resultado).toBeNull()
    expect(e.jogadores.humano.mao).toHaveLength(5)
    expect(e.jogadores.humano.baralho).toHaveLength(0)
  })

  it('cartas do baralho são compradas pelo topo, em ordem', () => {
    const e0 = cenario({ humano: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005'], baralho: 3 }, oponente: { mao: ['CC-001'], baralho: 5 }, ativo: 'oponente', turno: 2, jogadaFeita: true })
    const topo = e0.jogadores.humano.baralho[0]!.uid
    const e = ok(aplicarComando(e0, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.jogadores.humano.mao.at(-1)!.uid).toBe(topo)
  })
})

describe('primeiro turno absoluto', () => {
  it('ninguém ataca no turno 1, mesmo com unidade em campo', () => {
    const e = cenarioCombate({ turno: 1, humano: { campo: ['CC-001'] }, oponente: { campo: ['CC-004'] } })
    const r = atacar(e, 0, 0)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('primeiro turno')
    expect(atacar(cenarioCombate({ turno: 1, humano: { campo: ['CC-001'] } }), 0, 'direto').ok).toBe(false)
  })

  it('o oponente pode atacar no turno 2 e o humano a partir do turno 3', () => {
    const e2 = cenarioCombate({ turno: 2, ativo: 'oponente', oponente: { campo: ['CC-003'] }, humano: { campo: ['CC-004'] } })
    expect(atacar(e2, 0, 0).ok).toBe(true)
    const e3 = cenarioCombate({ turno: 3, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-004'] } })
    expect(atacar(e3, 0, 0).ok).toBe(true)
  })

  it('jogando de verdade: unidade invocada no turno 1 não ataca, e o fluxo avança para o turno 2', () => {
    let e = cenario({ turno: 1, humano: { mao: ['CC-003'], baralho: 34 }, oponente: { mao: ['CC-001'], baralho: 34 } })
    e = ok(jogar(e, 'humano', 'CC-003'))
    e = ok(aplicarComando(e, { tipo: 'avancarFase', jogador: 'humano' }))
    expect(atacar(e, 0, 'direto').ok).toBe(false)
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(e.turno).toBe(2)
    expect(e.ativo).toBe('oponente')
  })
})

describe('fim de partida', () => {
  it('jogo encerrado não aceita nenhum comando e devolve o mesmo estado', () => {
    const e0 = cenario({ humano: { mao: ['CC-001'] }, oponente: { mao: ['CC-001'] } })
    const e = ok(aplicarComando(e0, { tipo: 'desistir', jogador: 'humano' }))
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'desistencia' })
    for (const c of [
      { tipo: 'encerrarTurno', jogador: 'humano' },
      { tipo: 'avancarFase', jogador: 'humano' },
      { tipo: 'desistir', jogador: 'oponente' },
      { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 'direto' },
    ] as const) {
      const r = aplicarComando(e, c)
      expect(r.ok).toBe(false)
      expect(r.estado).toBe(e)
    }
  })

  it('o oponente também pode desistir (vitória do humano)', () => {
    const e = ok(aplicarComando(cenario({ ativo: 'oponente' }), { tipo: 'desistir', jogador: 'oponente' }))
    expect(e.resultado).toEqual({ vencedor: 'humano', motivo: 'desistencia' })
  })

  it('empate quando ambos os jogadores chegam a LP <= 0', () => {
    const e = cenario({ humano: { lp: 0 }, oponente: { lp: 0 } })
    const ctx = { e: structuredClone(e), ev: [], cat: mapaCatalogo(CATALOGO) }
    verificarResultado(ctx)
    expect(ctx.e.resultado).toEqual({ vencedor: null, motivo: 'empate_lp' })
  })

  it('LP <= 0 de um lado dá vitória ao outro', () => {
    const ctx = { e: structuredClone(cenario({ humano: { lp: 0 } })), ev: [], cat: mapaCatalogo(CATALOGO) }
    verificarResultado(ctx)
    expect(ctx.e.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('salvaguarda: a mesma assinatura 3 vezes encerra como empate técnico', () => {
    let e = cenario({ humano: { mao: ['CC-001'] }, oponente: { mao: ['CC-001'] } })
    let r = registrarRepeticao(e)
    expect(r.estado.resultado).toBeNull()
    e = r.estado
    r = registrarRepeticao(e)
    expect(r.estado.resultado).toBeNull()
    r = registrarRepeticao(r.estado)
    expect(r.estado.resultado).toEqual({ vencedor: null, motivo: 'repeticao' })
    expect(r.eventos.some((x) => x.tipo === 'fim_de_jogo')).toBe(true)
  })

  it('o baralho encolhe a cada turno completo, então o estado nunca se repete em partidas normais', () => {
    let e = novo(11)
    const tamanhos: number[] = []
    for (let i = 0; i < 6 && !e.resultado; i++) {
      const j = e.ativo
      const legal = listarJogadas(e, mapaCatalogo(CATALOGO))[0]
      if (legal) e = ok(aplicarComando(e, legal))
      e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: j }))
      tamanhos.push(e.jogadores[j].baralho.length)
    }
    expect(e.resultado).toBeNull()
    expect(totalCartas(e, 'humano')).toBe(40)
    expect(Math.max(...Object.values(e.repeticoes))).toBe(1)
  })
})
