import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { aplicarComando } from '../acoes'
import { atkEfetivo, defEfetiva } from '../combate'
import { invariantes, mapaCatalogo } from '../estado'
import { atacar, cenario, cenarioCombate, jogar, ok } from './util'

const cat = mapaCatalogo(CATALOGO)

// Referências do catálogo: CC-003 1600/1500, CC-001 1200/2000, CC-004 900/2000, CC-009 1200/1700,
// CC-007 1700/2000, CC-047 1800/900, CC-013 700/1800.

describe('ATK x ATK', () => {
  it('maior ATK destrói a menor e o perdedor recebe a diferença em LP', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'] } }), 0, 0))
    expect(e.jogadores.oponente.lp).toBe(8000 - 400)
    expect(e.jogadores.humano.lp).toBe(8000)
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId)).toEqual(['CC-001'])
    expect(e.jogadores.humano.campo[0]?.cartaId).toBe('CC-003')
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
    expect(invariantes(e)).toEqual([])
  })

  it('atacante com ATK menor é destruído e perde a diferença', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-001'] }, oponente: { campo: ['CC-003'] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(8000 - 400)
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.campo[0]).toBeNull()
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId)).toEqual(['CC-001'])
    expect(e.jogadores.oponente.campo[0]?.cartaId).toBe('CC-003')
  })

  it('empate destrói as duas unidades sem dano', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-003'] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(8000)
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.campo[0]).toBeNull()
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.humano.descarte).toHaveLength(1)
    expect(e.jogadores.oponente.descarte).toHaveLength(1)
  })

  it('o atacante escolhe qualquer zona inimiga e a ordem do combate não depende da ordem de invocação', () => {
    const base = cenarioCombate({ humano: { campo: [null, 'CC-007', 'CC-003'] }, oponente: { campo: ['CC-001', null, 'CC-004', 'CC-047'] } })
    const a = ok(atacar(base, 2, 3)) // CC-003 (1600) x CC-047 (1800): perde
    expect(a.jogadores.humano.campo[2]).toBeNull()
    const b = ok(atacar(base, 1, 3)) // CC-007 (1700) x 1800: perde
    expect(b.jogadores.humano.campo[1]).toBeNull()
    const c = ok(atacar(ok(atacar(base, 2, 0)), 1, 2)) // dois ataques em sequência
    expect(c.jogadores.oponente.campo[0]).toBeNull()
    expect(c.jogadores.oponente.campo[2]).toBeNull()
  })
})

describe('ATK x DEF', () => {
  it('ATK maior que DEF destrói sem dano de LP (e sem transbordar)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: [{ id: 'CC-047', pos: 'DEFESA' }] } }), 0, 0))
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.oponente.lp).toBe(8000) // 1600 - 900 NÃO transborda
    expect(e.jogadores.humano.lp).toBe(8000)
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
  })

  it('ATK menor que DEF causa dano ao atacante igual à diferença e não destrói ninguém', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-001'] }, oponente: { campo: [{ id: 'CC-004', pos: 'DEFESA' }] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(8000 - 800)
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
  })

  it('empate de ATK e DEF: nada acontece (mas a unidade conta como tendo atacado)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-007'] }, oponente: { campo: [{ id: 'CC-009', pos: 'DEFESA' }] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(8000)
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
  })
})

describe('ataque direto, LP e vitória', () => {
  it('sem unidades adversárias, ataque direto subtrai o ATK efetivo dos LP', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(6400)
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
  })

  it('ataque direto é ilegal enquanto o adversário tiver qualquer unidade (mesmo em defesa)', () => {
    const e = cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: [null, null, { id: 'CC-004', pos: 'DEFESA' }] } })
    const r = atacar(e, 0, 'direto')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('unidades')
  })

  it('LP exatamente 0 é derrota imediata do defensor', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { lp: 1600 } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'humano', motivo: 'lp' })
  })

  it('dano maior que os LP restantes deixa LP em 0 (nunca negativo)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-056'] }, oponente: { lp: 500 } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(0)
    expect(e.resultado?.vencedor).toBe('humano')
  })

  it('o atacante também pode perder por dano de recuo (ATK x DEF) e o oponente vence', () => {
    const e = ok(atacar(cenarioCombate({ humano: { lp: 800, campo: ['CC-001'] }, oponente: { campo: [{ id: 'CC-004', pos: 'DEFESA' }] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('LP exato 0 do atacante em ATK x ATK perdido (diferença igual aos LP)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { lp: 400, campo: ['CC-001'] }, oponente: { campo: ['CC-003'] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('vitória por ataque vindo do oponente', () => {
    const e = ok(atacar(cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-003'] }, humano: { lp: 1600 } }), 0, 'direto'))
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('depois do fim da partida não há mais ataques', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003', 'CC-007'] }, oponente: { lp: 1600 } }), 0, 'direto'))
    expect(atacar(e, 1, 'direto').ok).toBe(false)
  })
})

describe('restrições do ataque', () => {
  it('cada unidade ataca uma vez por turno', () => {
    let e = cenarioCombate({ humano: { campo: ['CC-003'] } })
    e = ok(atacar(e, 0, 'direto'))
    const r = atacar(e, 0, 'direto')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('já atacou')
  })

  it('só ataca na fase de combate, no próprio turno, com unidade existente e alvo existente', () => {
    const principal = cenario({ humano: { campo: ['CC-003'] } })
    expect(atacar(principal, 0, 'direto').ok).toBe(false)
    const e = cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'] } })
    expect(aplicarComando(e, { tipo: 'atacar', jogador: 'oponente', atacante: 0, alvo: 0 }).ok).toBe(false)
    expect(atacar(e, 1, 0).ok).toBe(false) // zona vazia
    expect(atacar(e, 0, 3).ok).toBe(false) // alvo inexistente
    expect(atacar(e, 7, 0).ok).toBe(false)
    expect(atacar(e, 0, 7).ok).toBe(false)
  })

  it('unidade invocada neste turno pode atacar (fora do primeiro turno absoluto)', () => {
    let e = cenario({ turno: 3, humano: { mao: ['CC-003'], baralho: 34 }, oponente: { campo: ['CC-001'], baralho: 34 } })
    e = ok(jogar(e, 'humano', 'CC-003'))
    e = ok(aplicarComando(e, { tipo: 'avancarFase', jogador: 'humano' }))
    e = ok(atacar(e, 0, 0))
    expect(e.jogadores.oponente.campo[0]).toBeNull()
  })

  it('unidades do mesmo jogador atacam em qualquer ordem', () => {
    const base = cenarioCombate({ humano: { campo: ['CC-003', 'CC-007'] }, oponente: { campo: ['CC-001', 'CC-004'] } })
    const a = ok(atacar(ok(atacar(base, 1, 1)), 0, 0))
    const b = ok(atacar(ok(atacar(base, 0, 0)), 1, 1))
    expect(a.jogadores.oponente.campo).toEqual([null, null, null, null, null])
    expect(b.jogadores.oponente.campo).toEqual([null, null, null, null, null])
  })
})

describe('atributos efetivos e clamping', () => {
  it('ATK/DEF efetivos somam buffs e nunca ficam negativos', () => {
    const e = cenario({ humano: { campo: [{ id: 'CC-013', buffAtk: -1000, buffDef: -5000 }, { id: 'CC-003', buffAtk: 300, buffDef: -100 }] } })
    const [a, b] = e.jogadores.humano.campo
    expect(atkEfetivo(e, 'humano', a!, cat)).toBe(0)
    expect(defEfetiva(e, 'humano', a!, cat)).toBe(0)
    expect(atkEfetivo(e, 'humano', b!, cat)).toBe(1900)
    expect(defEfetiva(e, 'humano', b!, cat)).toBe(1400)
  })

  it('ataque com ATK efetivo 0 não causa dano', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: [{ id: 'CC-013', buffAtk: -1000 }] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(8000)
  })

  it('buffs que somam acima/abaixo são limitados só no cálculo (um buff posterior compensa o debuff)', () => {
    const e = cenario({ humano: { campo: [{ id: 'CC-013', buffAtk: -1000 }] } }) // base 700 -> -300 bruto
    expect(atkEfetivo(e, 'humano', e.jogadores.humano.campo[0]!, cat)).toBe(0)
    e.jogadores.humano.campo[0]!.buffAtk += 600
    expect(atkEfetivo(e, 'humano', e.jogadores.humano.campo[0]!, cat)).toBe(300)
  })

  it('terreno afeta os atributos usados no combate dos DOIS lados', () => {
    // Terreno: Manguezal (+300 ecossistema): CC-001 (1200) vira 1500; CC-005 (1500) vira 1800
    const e = ok(atacar(cenarioCombate({ terreno: { id: 'CC-089', dono: 'oponente' }, humano: { campo: ['CC-001'] }, oponente: { campo: ['CC-005'] } }), 0, 0))
    // 1500 x 1800: humano perde 300 e a unidade
    expect(e.jogadores.humano.lp).toBe(7700)
    expect(e.jogadores.humano.campo[0]).toBeNull()
  })
})
