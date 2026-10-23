// QA independente (secções 2-9 e 12 do regulamento): cenários escritos a partir do TEXTO das regras, não dos testes do DEV.
import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { aplicarComando, ataquesLegais, jogadasLegais } from '../acoes'
import { atkEfetivo, defEfetiva } from '../combate'
import { criarDuelo } from '../duelo'
import { invariantes, mapaCatalogo } from '../estado'
import type { EstadoDuelo } from '../estado'
import { visaoParaJogador } from '../visao'
import { atacar, cenario, cenarioCombate, cmd, irParaCombate, jogar, ok, uidDe } from './util'

const cat = mapaCatalogo()
const novoDuelo = (seed = 1, a: readonly string[] = BARALHO_INICIAL, b: readonly string[] = BARALHOS_OPONENTES['ressaca']!): EstadoDuelo => {
  const r = criarDuelo({ baralhoJogador: a, baralhoOponente: b, seed })
  if (!r.ok) throw new Error(r.erros.join())
  return r.estado
}
const recusa = (e: EstadoDuelo, c: Parameters<typeof aplicarComando>[1]) => {
  const r = aplicarComando(e, c)
  expect(r.ok, `esperava recusa: ${JSON.stringify(c)}`).toBe(false)
  expect(r.estado).toBe(e) // jogada ilegal não altera nada: mesmo objeto
  return r
}

describe('QA 1 - compra e mão (§2, §3)', () => {
  it('abertura: 5 cartas para ambos, 35 no baralho, humano começa na fase principal sem compra extra', () => {
    const e = novoDuelo()
    for (const j of ['humano', 'oponente'] as const) {
      expect(e.jogadores[j].mao).toHaveLength(5)
      expect(e.jogadores[j].baralho).toHaveLength(35)
      expect(e.jogadores[j].lp).toBe(8000)
      expect(e.jogadores[j].campo).toHaveLength(5)
      expect(e.jogadores[j].suporte).toHaveLength(5)
    }
    expect(e.ativo).toBe('humano')
    expect(e.turno).toBe(1)
    expect(e.fase).toBe('PRINCIPAL')
    expect(e.log.filter((x) => x.tipo === 'compra')).toHaveLength(2) // só as duas mãos iniciais, nada no turno 1
    expect(invariantes(e)).toEqual([])
    const visao = visaoParaJogador(e, 'humano')
    expect(visao.eu.baralhoTamanho).toBe(35) // "cartas restantes" = 40 - 5
    expect(visao.oponente.baralhoTamanho).toBe(35)
    expect(visao.oponente.maoTamanho).toBe(5)
  })

  it('repõe até 5 no início de cada turno; oponente no turno 2 não compra; humano compra 1 no turno 3', () => {
    let e = novoDuelo(3)
    const u = e.jogadores.humano.mao.find((c) => cat.get(c.cartaId)?.tipo === 'unidade')!
    e = ok(aplicarComando(e, { tipo: 'jogarCarta', jogador: 'humano', uid: u.uid }))
    expect(e.jogadores.humano.mao).toHaveLength(4)
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(e.turno).toBe(2)
    expect(e.ativo).toBe('oponente')
    expect(e.jogadores.oponente.mao).toHaveLength(5)
    expect(e.jogadores.oponente.baralho).toHaveLength(35) // sem compra
    const o = jogadasLegais(e)[0]!
    e = ok(aplicarComando(e, o))
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.turno).toBe(3)
    expect(e.jogadores.humano.mao).toHaveLength(5)
    expect(e.jogadores.humano.baralho).toHaveLength(34)
    expect(invariantes(e)).toEqual([])
  })

  it('falta carta: derrota ANTES de comprar, sem compra parcial', () => {
    const e = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { mao: ['CC-001', 'CC-002', 'CC-003'], baralho: 1 } })
    const r = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(r.resultado).toEqual({ vencedor: 'oponente', motivo: 'compra' })
    expect(r.jogadores.humano.mao).toHaveLength(3) // nada comprado
    expect(r.jogadores.humano.baralho).toHaveLength(1)
  })

  it('exatamente a carta que falta: compra e continua; mão cheia com baralho vazio não perde', () => {
    const e1 = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { mao: ['CC-001', 'CC-002', 'CC-003', 'CC-004'], baralho: 1 } })
    const r1 = ok(cmd(e1, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(r1.resultado).toBeNull()
    expect(r1.jogadores.humano.mao).toHaveLength(5)
    expect(r1.jogadores.humano.baralho).toHaveLength(0)
    const e2 = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { mao: ['CC-001', 'CC-002', 'CC-003', 'CC-004', 'CC-005'], baralho: 0 } })
    expect(ok(cmd(e2, { tipo: 'encerrarTurno', jogador: 'oponente' })).resultado).toBeNull()
    const e3 = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { mao: ['CC-001', 'CC-002', 'CC-003', 'CC-004'], baralho: 0 } })
    expect(ok(cmd(e3, { tipo: 'encerrarTurno', jogador: 'oponente' })).resultado).toEqual({ vencedor: 'oponente', motivo: 'compra' })
    // mão vazia e baralho com 4: falta 5 -> perde sem comprar
    const e4 = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { mao: [], baralho: 4 } })
    const r4 = ok(cmd(e4, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(r4.resultado?.motivo).toBe('compra')
    expect(r4.jogadores.humano.baralho).toHaveLength(4)
  })

  it('o jogador ativo que fica sem cartas perde também quando é o humano que passa a vez ao oponente', () => {
    const e = cenarioCombate({ ativo: 'humano', turno: 3, oponente: { mao: ['CC-001'], baralho: 2 } })
    const r = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(r.resultado).toEqual({ vencedor: 'humano', motivo: 'compra' })
  })
})

describe('QA 2 - turnos, fases e comandos fora de hora (§4)', () => {
  it('turno 1: humano não ataca (mesmo com unidade e campo inimigo vazio); pode avançar e encerrar', () => {
    const e = cenario({ turno: 1, ativo: 'humano', fase: 'COMBATE', jogadaFeita: true, humano: { campo: ['CC-043'] } })
    recusa(e, { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 'direto' })
    expect(ataquesLegais(e)).toEqual([])
    const e2 = cenario({ turno: 1, ativo: 'humano', fase: 'PRINCIPAL', jogadaFeita: true })
    expect(ok(cmd(e2, { tipo: 'avancarFase', jogador: 'humano' })).fase).toBe('COMBATE')
  })

  it('turno 2: oponente ataca (inclusive unidade invocada no mesmo turno)', () => {
    let e = cenario({ turno: 2, ativo: 'oponente', fase: 'PRINCIPAL', oponente: { mao: ['CC-027'] } })
    e = ok(jogar(e, 'oponente', 'CC-027', { posicao: 'ATAQUE' }))
    e = irParaCombate(e)
    const r = ok(atacar(e, 0, 'direto'))
    expect(r.jogadores.humano.lp).toBe(6000)
  })

  it('uma jogada da mão por turno; avançar/encerrar exigem jogada; jogar fora da fase principal é recusado', () => {
    const e = cenario({ turno: 3, humano: { mao: ['CC-001', 'CC-002'] } })
    recusa(e, { tipo: 'avancarFase', jogador: 'humano' })
    recusa(e, { tipo: 'encerrarTurno', jogador: 'humano' })
    const e1 = ok(jogar(e, 'humano', 'CC-001'))
    const r = recusa(e1, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e1, 'humano', 'CC-002') })
    expect(r.ok).toBe(false)
    const ec = irParaCombate(e1)
    recusa(ec, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(ec, 'humano', 'CC-002') })
    recusa(ec, { tipo: 'descartar', jogador: 'humano', uid: uidDe(ec, 'humano', 'CC-002') })
  })

  it('fora de turno / fase errada / jogo encerrado', () => {
    const e = cenario({ turno: 3, humano: { mao: ['CC-001'], campo: ['CC-043'] }, oponente: { mao: ['CC-002'] } })
    recusa(e, { tipo: 'jogarCarta', jogador: 'oponente', uid: uidDe(e, 'oponente', 'CC-002') })
    recusa(e, { tipo: 'encerrarTurno', jogador: 'oponente' })
    recusa(e, { tipo: 'avancarFase', jogador: 'oponente' })
    recusa(e, { tipo: 'mudarPosicao', jogador: 'oponente', zona: 0, posicao: 'DEFESA' })
    recusa(e, { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 'direto' }) // fase principal
    const fim = ok(cmd(e, { tipo: 'desistir', jogador: 'humano' }))
    expect(fim.resultado).toEqual({ vencedor: 'oponente', motivo: 'desistencia' })
    for (const c of [
      { tipo: 'encerrarTurno', jogador: 'humano' },
      { tipo: 'avancarFase', jogador: 'humano' },
      { tipo: 'desistir', jogador: 'oponente' },
      { tipo: 'jogarCarta', jogador: 'humano', uid: 'x' },
      { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 'direto' },
    ] as const)
      recusa(fim, c)
    expect(jogadasLegais(fim)).toEqual([])
    expect(ataquesLegais(fim)).toEqual([])
  })

  it('ataque uma vez por unidade; unidade em defesa não ataca; atacou não muda posição; mudança livre antes', () => {
    let e = cenarioCombate({ turno: 3, humano: { campo: ['CC-043', { id: 'CC-033', pos: 'DEFESA' }] }, oponente: { campo: [{ id: 'CC-013', pos: 'DEFESA' }, { id: 'CC-001', pos: 'DEFESA' }] } })
    recusa(e, { tipo: 'atacar', jogador: 'humano', atacante: 1, alvo: 0 }) // em defesa
    e = ok(atacar(e, 0, 0)) // 2000 vs DEF 1800
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    recusa(e, { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 1 }) // já atacou
    recusa(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 0, posicao: 'DEFESA' }) // atacou: não muda
    e = ok(cmd(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 1, posicao: 'ATAQUE' })) // ainda pode
    e = ok(atacar(e, 1, 1)) // CC-033 1800 vs DEF 2000: repelido
    expect(e.jogadores.humano.lp).toBe(7800)
    expect(e.jogadores.oponente.campo[1]).not.toBeNull()
    recusa(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 1, posicao: 'DEFESA' })
  })

  it('flags de ataque são zeradas no início do turno seguinte do dono', () => {
    let e = cenarioCombate({ turno: 3, humano: { campo: ['CC-043'] }, oponente: { campo: [] } })
    e = ok(atacar(e, 0, 'direto'))
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
    e = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    e = ok(cmd(e, jogadasLegais(e)[0]!))
    e = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.turno).toBe(5)
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(false)
  })

  it('zona de unidade: ocupada/fora de faixa recusada; omitida usa a primeira livre; campo cheio sem jogada de unidade', () => {
    const e = cenario({ turno: 3, humano: { mao: ['CC-001'], campo: ['CC-002', null, 'CC-004'] } })
    recusa(e, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e, 'humano', 'CC-001'), zona: 0 })
    recusa(e, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e, 'humano', 'CC-001'), zona: 5 })
    recusa(e, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e, 'humano', 'CC-001'), zona: -1 })
    recusa(e, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e, 'humano', 'CC-001'), zona: 1.5 })
    expect(ok(jogar(e, 'humano', 'CC-001')).jogadores.humano.campo[1]?.cartaId).toBe('CC-001')
    const cheio = cenario({ turno: 3, humano: { mao: ['CC-001', 'CC-073'], campo: ['CC-002', 'CC-002', 'CC-002', 'CC-002', 'CC-002'] } })
    // CC-073 (debuff impacto) sem alvo + unidade sem zona: nenhuma jogada de carta; só descartes
    expect(jogadasLegais(cheio).every((c) => c.tipo === 'descartar')).toBe(true)
    const d = ok(cmd(cheio, jogadasLegais(cheio)[0]!))
    expect(d.jogadaFeita).toBe(true)
    expect(d.jogadores.humano.descarte).toHaveLength(1)
  })

  it('descarte só quando não há jogada legal', () => {
    const e = cenario({ turno: 3, humano: { mao: ['CC-001', 'CC-073'] } })
    recusa(e, { tipo: 'descartar', jogador: 'humano', uid: uidDe(e, 'humano', 'CC-073') })
    const sem = cenario({ turno: 3, humano: { mao: ['CC-073', 'CC-075', 'CC-079'] } }) // debuff/destruir sem alvo; cura com LP cheio
    const j = jogadasLegais(sem)
    expect(j).toHaveLength(3)
    expect(j.every((c) => c.tipo === 'descartar')).toBe(true)
    const r = ok(cmd(sem, j[1]!))
    expect(r.jogadores.humano.mao).toHaveLength(2)
    // depois do descarte pode avançar normalmente
    expect(ok(cmd(r, { tipo: 'avancarFase', jogador: 'humano' })).fase).toBe('COMBATE')
  })
})

describe('QA 3 - combate (§5)', () => {
  const duelo = (atk: string, pos: 'ATAQUE' | 'DEFESA', alvo: string, extra: Parameters<typeof cenarioCombate>[0] = {}) =>
    atacar(cenarioCombate({ turno: 3, humano: { campo: [atk] }, oponente: { campo: [{ id: alvo, pos }] }, ...extra }), 0, 0)

  it('ATK x ATK: maior destrói a menor e o perdedor perde a diferença; empate destrói ambas sem dano', () => {
    let e = ok(duelo('CC-043', 'ATAQUE', 'CC-033')) // 2000 x 1800
    expect(e.jogadores.oponente.lp).toBe(7800)
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
    e = ok(duelo('CC-033', 'ATAQUE', 'CC-043')) // 1800 x 2000
    expect(e.jogadores.humano.lp).toBe(7800)
    expect(e.jogadores.humano.campo[0]).toBeNull()
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
    e = ok(duelo('CC-043', 'ATAQUE', 'CC-027')) // 2000 x 2000
    expect([e.jogadores.humano.lp, e.jogadores.oponente.lp]).toEqual([8000, 8000])
    expect(e.jogadores.humano.campo[0]).toBeNull()
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.humano.descarte).toHaveLength(1)
    expect(e.jogadores.oponente.descarte).toHaveLength(1)
  })

  it('ATK x DEF: maior destrói sem dano; menor causa dano ao atacante sem destruir; empate nada', () => {
    let e = ok(duelo('CC-043', 'DEFESA', 'CC-033')) // 2000 > DEF 1600
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect([e.jogadores.humano.lp, e.jogadores.oponente.lp]).toEqual([8000, 8000])
    e = ok(duelo('CC-033', 'DEFESA', 'CC-001')) // 1800 < DEF 2000
    expect(e.jogadores.humano.lp).toBe(7800)
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
    e = ok(duelo('CC-033', 'DEFESA', 'CC-013')) // 1800 == DEF 1800
    expect([e.jogadores.humano.lp, e.jogadores.oponente.lp]).toEqual([8000, 8000])
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
  })

  it('ataque direto só sem unidade inimiga; alvo vazio/inválido recusado', () => {
    const com = cenarioCombate({ turno: 3, humano: { campo: ['CC-043'] }, oponente: { campo: [null, 'CC-001'] } })
    recusa(com, { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 'direto' })
    recusa(com, { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 0 }) // zona vazia
    recusa(com, { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 7 })
    recusa(com, { tipo: 'atacar', jogador: 'humano', atacante: 3, alvo: 1 }) // sem atacante
    const sem = cenarioCombate({ turno: 3, humano: { campo: ['CC-043'] } })
    expect(ok(atacar(sem, 0, 'direto')).jogadores.oponente.lp).toBe(6000)
    recusa(sem, { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 0 })
  })

  it('LP exatamente 0 e abaixo de 0 (clamp): derrota imediata, LP nunca negativo', () => {
    let e = ok(atacar(cenarioCombate({ turno: 3, humano: { campo: ['CC-043'] }, oponente: { lp: 2000 } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'humano', motivo: 'lp' })
    e = ok(atacar(cenarioCombate({ turno: 3, humano: { campo: ['CC-043'] }, oponente: { lp: 1 } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(0)
    // atacante morre no refluxo
    e = ok(duelo('CC-033', 'DEFESA', 'CC-001', { humano: { lp: 200, campo: ['CC-033'] } }))
    expect(e.jogadores.humano.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
    // LP 1 a mais que o dano: segue vivo
    e = ok(atacar(cenarioCombate({ turno: 3, humano: { campo: ['CC-043'] }, oponente: { lp: 2001 } }), 0, 'direto'))
    expect(e.resultado).toBeNull()
    expect(e.jogadores.oponente.lp).toBe(1)
  })

  it('atributos efetivos: buffs + terreno + equipamento, com clamp >= 0 só no resultado', () => {
    const e = cenario({
      terreno: { id: 'CC-092', dono: 'oponente' }, // +300 impacto, vale para os dois
      humano: { campo: [{ id: 'CC-056', buffAtk: -2300, buffDef: -1000 }, { id: 'CC-043', equip: 'CC-086' }] }, // 2200/700 impacto; 2000/1700 atividade +500 atk
      oponente: { campo: [{ id: 'CC-056' }] },
    })
    const h = e.jogadores.humano.campo
    expect(atkEfetivo(e, 'humano', h[0]!, cat)).toBe(200) // 2200-2300+300
    expect(defEfetiva(e, 'humano', h[0]!, cat)).toBe(0) // 700-1000+300 = 0
    expect(atkEfetivo(e, 'humano', h[1]!, cat)).toBe(2500) // atividade: terreno não afeta, equip +500
    expect(atkEfetivo(e, 'oponente', e.jogadores.oponente.campo[0]!, cat)).toBe(2500) // terreno afeta o dono do terreno e o outro
    const neg = cenario({ humano: { campo: [{ id: 'CC-056', buffAtk: -9000, buffDef: -9000 }] } })
    expect(atkEfetivo(neg, 'humano', neg.jogadores.humano.campo[0]!, cat)).toBe(0)
    expect(defEfetiva(neg, 'humano', neg.jogadores.humano.campo[0]!, cat)).toBe(0)
  })

  it('equipamento sai junto com a unidade destruída (para o descarte do dono da unidade)', () => {
    const e = ok(
      atacar(cenarioCombate({ turno: 3, humano: { campo: ['CC-043'] }, oponente: { campo: [{ id: 'CC-033', equip: 'CC-087' }] } }), 0, 0),
    )
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.oponente.suporte.every((s) => s === null)).toBe(true)
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId).sort()).toEqual(['CC-033', 'CC-087'])
    expect(invariantes(e)).toEqual([])
  })
})
