import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { aplicarComando } from '../acoes'
import { atkEfetivo, defEfetiva } from '../combate'
import { invariantes, mapaCatalogo } from '../estado'
import { atacar, cenario, cenarioCombate, jogar, ok } from './util'

const cat = mapaCatalogo(CATALOGO)

// Referências do catálogo: CC-103 1600/1500, CC-101 1200/2000, CC-104 900/2000, CC-109 1200/1700,
// CC-107 1700/2000, CC-147 1800/900, CC-113 700/1800.

describe('ATK x ATK', () => {
  it('maior ATK destrói a menor e o perdedor recebe a diferença em LP', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-103'] }, oponente: { campo: ['CC-101'] } }), 0, 0))
    expect(e.jogadores.oponente.lp).toBe(5000 - 400)
    expect(e.jogadores.humano.lp).toBe(5000)
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId)).toEqual(['CC-101'])
    expect(e.jogadores.humano.campo[0]?.cartaId).toBe('CC-103')
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
    expect(invariantes(e)).toEqual([])
  })

  it('atacante com ATK menor é destruído e perde a diferença', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-101'] }, oponente: { campo: ['CC-103'] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(5000 - 400)
    expect(e.jogadores.oponente.lp).toBe(5000)
    expect(e.jogadores.humano.campo[0]).toBeNull()
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId)).toEqual(['CC-101'])
    expect(e.jogadores.oponente.campo[0]?.cartaId).toBe('CC-103')
  })

  it('revela alvo oculto antes do cálculo; atacante mais fraco é destruído e perde a diferença', () => {
    const r = atacar(
      cenarioCombate({ humano: { campo: ['CC-101'] }, oponente: { campo: [{ id: 'CC-156', viradaParaBaixo: true }] } }),
      0,
      0,
    )
    if (!r.ok) throw new Error(r.erro)
    expect(r.estado.jogadores.humano.lp).toBe(4000) // 2200 - 1200
    expect(r.estado.jogadores.humano.campo[0]).toBeNull()
    expect(r.estado.jogadores.oponente.campo[0]).toMatchObject({ cartaId: 'CC-156', viradaParaBaixo: false })
    expect(r.eventos.map((e) => e.tipo)).toEqual([
      'ataque_declarado',
      'unidade_revelada',
      'dano',
      'unidade_destruida',
      'combate_resolvido',
    ])
    expect(r.eventos[0]?.texto).not.toContain('GORGÔNIA-ESCARLATE')
    expect(r.eventos[1]?.texto).toContain('GORGÔNIA-ESCARLATE')
  })

  it('revela também um atacante oculto antes do cálculo e o mantém revelado', () => {
    const r = atacar(cenarioCombate({ humano: { campo: [{ id: 'CC-103', viradaParaBaixo: true }] }, oponente: { campo: ['CC-101'] } }), 0, 0)
    if (!r.ok) throw new Error(r.erro)
    expect(r.estado.jogadores.humano.campo[0]?.viradaParaBaixo).toBe(false)
    expect(r.eventos[0]?.texto).not.toContain('CARANGUEJO-AZUL')
    expect(r.eventos.find((e) => e.tipo === 'unidade_revelada')).toMatchObject({ jogador: 'humano', zona: 0, carta: { cartaId: 'CC-103' } })
  })

  it('quando atacante e alvo estão ocultos, revela ambos antes de resolver o combate', () => {
    const r = atacar(
      cenarioCombate({
        humano: { campo: [{ id: 'CC-101', viradaParaBaixo: true }] },
        oponente: { campo: [{ id: 'CC-156', viradaParaBaixo: true }] },
      }),
      0,
      0,
    )
    if (!r.ok) throw new Error(r.erro)
    expect(r.estado.jogadores.humano.campo[0]).toBeNull()
    expect(r.estado.jogadores.oponente.campo[0]).toMatchObject({ viradaParaBaixo: false })
    expect(r.eventos.filter((e) => e.tipo === 'unidade_revelada')).toMatchObject([
      { jogador: 'humano', zona: 0, carta: { cartaId: 'CC-101' } },
      { jogador: 'oponente', zona: 0, carta: { cartaId: 'CC-156' } },
    ])
  })

  it('empate destrói as duas unidades sem dano', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-103'] }, oponente: { campo: ['CC-103'] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(5000)
    expect(e.jogadores.oponente.lp).toBe(5000)
    expect(e.jogadores.humano.campo[0]).toBeNull()
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.humano.descarte).toHaveLength(1)
    expect(e.jogadores.oponente.descarte).toHaveLength(1)
  })

  it('o atacante escolhe qualquer zona inimiga e a ordem do combate não depende da ordem de invocação', () => {
    const base = cenarioCombate({ humano: { campo: [null, 'CC-107', 'CC-103'] }, oponente: { campo: ['CC-101', null, 'CC-104', 'CC-147'] } })
    const a = ok(atacar(base, 2, 3)) // CC-103 (1600) x CC-147 (1800): perde
    expect(a.jogadores.humano.campo[2]).toBeNull()
    const b = ok(atacar(base, 1, 3)) // CC-107 (1700) x 1800: perde
    expect(b.jogadores.humano.campo[1]).toBeNull()
    const c = ok(atacar(ok(atacar(base, 2, 0)), 1, 2)) // dois ataques em sequência
    expect(c.jogadores.oponente.campo[0]).toBeNull()
    expect(c.jogadores.oponente.campo[2]).toBeNull()
  })
})

describe('ATK x DEF', () => {
  it('ATK maior que DEF destrói sem dano de LP (e sem transbordar)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-103'] }, oponente: { campo: [{ id: 'CC-147', pos: 'DEFESA' }] } }), 0, 0))
    expect(e.jogadores.oponente.campo[0]).toBeNull()
    expect(e.jogadores.oponente.lp).toBe(5000) // 1600 - 900 NÃO transborda
    expect(e.jogadores.humano.lp).toBe(5000)
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
  })

  it('ATK menor que DEF causa dano ao atacante igual à diferença e não destrói ninguém', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-101'] }, oponente: { campo: [{ id: 'CC-104', pos: 'DEFESA' }] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(5000 - 800)
    expect(e.jogadores.oponente.lp).toBe(5000)
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
  })

  it('revela alvo oculto em DEFESA e usa a DEF no cálculo, mantendo-o revelado', () => {
    const e = ok(
      atacar(
        cenarioCombate({ humano: { campo: ['CC-101'] }, oponente: { campo: [{ id: 'CC-104', pos: 'DEFESA', viradaParaBaixo: true }] } }),
        0,
        0,
      ),
    )
    expect(e.jogadores.humano.lp).toBe(4200)
    expect(e.jogadores.oponente.campo[0]).toMatchObject({ cartaId: 'CC-104', posicao: 'DEFESA', viradaParaBaixo: false })
  })

  it('empate de ATK e DEF: nada acontece (mas a unidade conta como tendo atacado)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-107'] }, oponente: { campo: [{ id: 'CC-109', pos: 'DEFESA' }] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(5000)
    expect(e.jogadores.oponente.lp).toBe(5000)
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
  })
})

describe('ataque direto, LP e vitória', () => {
  it('sem unidades adversárias, ataque direto subtrai o ATK efetivo dos LP', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-103'] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(3400)
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
  })

  it('ataque direto é ilegal enquanto o adversário tiver qualquer unidade (mesmo em defesa)', () => {
    const e = cenarioCombate({ humano: { campo: ['CC-103'] }, oponente: { campo: [null, null, { id: 'CC-104', pos: 'DEFESA' }] } })
    const r = atacar(e, 0, 'direto')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('unidades')
  })

  it('LP exatamente 0 é derrota imediata do defensor', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-103'] }, oponente: { lp: 1600 } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'humano', motivo: 'lp' })
  })

  it('dano maior que os LP restantes deixa LP em 0 (nunca negativo)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-156'] }, oponente: { lp: 500 } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(0)
    expect(e.resultado?.vencedor).toBe('humano')
  })

  it('o atacante também pode perder por dano de recuo (ATK x DEF) e o oponente vence', () => {
    const e = ok(atacar(cenarioCombate({ humano: { lp: 800, campo: ['CC-101'] }, oponente: { campo: [{ id: 'CC-104', pos: 'DEFESA' }] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('LP exato 0 do atacante em ATK x ATK perdido (diferença igual aos LP)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { lp: 400, campo: ['CC-101'] }, oponente: { campo: ['CC-103'] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('vitória por ataque vindo do oponente', () => {
    const e = ok(atacar(cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-103'] }, humano: { lp: 1600 } }), 0, 'direto'))
    expect(e.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('depois do fim da partida não há mais ataques', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-103', 'CC-107'] }, oponente: { lp: 1600 } }), 0, 'direto'))
    expect(atacar(e, 1, 'direto').ok).toBe(false)
  })
})

describe('restrições do ataque', () => {
  it('cada unidade ataca uma vez por turno', () => {
    let e = cenarioCombate({ humano: { campo: ['CC-103'] } })
    e = ok(atacar(e, 0, 'direto'))
    const r = atacar(e, 0, 'direto')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('já atacou')
  })

  it('só ataca na fase de combate, no próprio turno, com unidade existente e alvo existente', () => {
    const principal = cenario({ humano: { campo: ['CC-103'] } })
    expect(atacar(principal, 0, 'direto').ok).toBe(false)
    const e = cenarioCombate({ humano: { campo: ['CC-103'] }, oponente: { campo: ['CC-101'] } })
    expect(aplicarComando(e, { tipo: 'atacar', jogador: 'oponente', atacante: 0, alvo: 0 }).ok).toBe(false)
    expect(atacar(e, 1, 0).ok).toBe(false) // zona vazia
    expect(atacar(e, 0, 3).ok).toBe(false) // alvo inexistente
    expect(atacar(e, 7, 0).ok).toBe(false)
    expect(atacar(e, 0, 7).ok).toBe(false)
  })

  it('unidade invocada neste turno pode atacar (fora do primeiro turno absoluto)', () => {
    let e = cenario({ turno: 3, humano: { mao: ['CC-103'], baralho: 34 }, oponente: { campo: ['CC-101'], baralho: 34 } })
    e = ok(jogar(e, 'humano', 'CC-103'))
    e = ok(aplicarComando(e, { tipo: 'avancarFase', jogador: 'humano' }))
    e = ok(atacar(e, 0, 0))
    expect(e.jogadores.oponente.campo[0]).toBeNull()
  })

  it('unidades do mesmo jogador atacam em qualquer ordem', () => {
    const base = cenarioCombate({ humano: { campo: ['CC-103', 'CC-107'] }, oponente: { campo: ['CC-101', 'CC-104'] } })
    const a = ok(atacar(ok(atacar(base, 1, 1)), 0, 0))
    const b = ok(atacar(ok(atacar(base, 0, 0)), 1, 1))
    expect(a.jogadores.oponente.campo).toEqual([null, null, null, null, null])
    expect(b.jogadores.oponente.campo).toEqual([null, null, null, null, null])
  })
})

describe('atributos efetivos e clamping', () => {
  it('ATK/DEF efetivos somam buffs e nunca ficam negativos', () => {
    const e = cenario({ humano: { campo: [{ id: 'CC-113', buffAtk: -1000, buffDef: -5000 }, { id: 'CC-103', buffAtk: 300, buffDef: -100 }] } })
    const [a, b] = e.jogadores.humano.campo
    expect(atkEfetivo(e, 'humano', a!, cat)).toBe(0)
    expect(defEfetiva(e, 'humano', a!, cat)).toBe(0)
    expect(atkEfetivo(e, 'humano', b!, cat)).toBe(1900)
    expect(defEfetiva(e, 'humano', b!, cat)).toBe(1400)
  })

  it('ataque com ATK efetivo 0 não causa dano', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: [{ id: 'CC-113', buffAtk: -1000 }] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(5000)
  })

  it('buffs que somam acima/abaixo são limitados só no cálculo (um buff posterior compensa o debuff)', () => {
    const e = cenario({ humano: { campo: [{ id: 'CC-113', buffAtk: -1000 }] } }) // base 700 -> -300 bruto
    expect(atkEfetivo(e, 'humano', e.jogadores.humano.campo[0]!, cat)).toBe(0)
    e.jogadores.humano.campo[0]!.buffAtk += 600
    expect(atkEfetivo(e, 'humano', e.jogadores.humano.campo[0]!, cat)).toBe(300)
  })
})
