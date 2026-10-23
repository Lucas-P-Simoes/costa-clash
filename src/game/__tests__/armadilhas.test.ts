import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { aplicarComando } from '../acoes'
import { armadilhaMaisAntiga } from '../armadilhas'
import { atkEfetivo, defEfetiva } from '../combate'
import { invariantes, mapaCatalogo } from '../estado'
import type { EstadoDuelo } from '../estado'
import { atacar, cenario, cenarioCombate, jogar, ok } from './util'

const cat = mapaCatalogo(CATALOGO)
const ativadas = (e: EstadoDuelo) => e.log.filter((x) => x.tipo === 'armadilha_ativada')
const restantes = (e: EstadoDuelo, j: 'humano' | 'oponente') => e.jogadores[j].suporte.filter(Boolean).map((s) => s!.cartaId)

// Humano ataca no turno 3; as armadilhas do oponente foram colocadas no turno 1 (elegíveis).
// CC-003 1600/1500, CC-001 1200/2000, CC-007 1700/2000, CC-013 700/1800, CC-047 1800/900.

describe('colocar armadilha', () => {
  it('fica virada na zona de suporte com turno de colocação e ordem crescente', () => {
    let e = cenario({ humano: { mao: ['CC-093', 'CC-094'] } })
    e = ok(jogar(e, 'humano', 'CC-093'))
    expect(e.jogadores.humano.suporte[0]).toMatchObject({ cartaId: 'CC-093', tipo: 'armadilha', colocadaNoTurno: 3, vinculadaA: null })
    const ordem1 = e.jogadores.humano.suporte[0]!.ordem
    e.jogadaFeita = false
    e = ok(jogar(e, 'humano', 'CC-094', { zona: 3 }))
    expect(e.jogadores.humano.suporte[3]!.ordem).toBeGreaterThan(ordem1)
    expect(e.jogadores.humano.suporte.filter(Boolean)).toHaveLength(2)
    expect(invariantes(e)).toEqual([])
  })
})

describe('ataque_recebido: reduzir_dano (CC-093 -600, CC-094 -800)', () => {
  it.each([
    ['CC-093', 600, 1000],
    ['CC-094', 800, 1000],
  ])('%s reduz o dano aos LP do controlador (mín. 0) mas não impede a destruição', (id, red) => {
    // CC-007 (1700) x CC-013 (700): dano base 1000
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-007'] }, oponente: { campo: ['CC-013'], suporte: [id] } }), 0, 0))
    expect(e.jogadores.oponente.lp).toBe(8000 - (1000 - red))
    expect(e.jogadores.oponente.campo[0]).toBeNull() // destruição mantida
    expect(restantes(e, 'oponente')).toEqual([])
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId).sort()).toEqual([id, 'CC-013'].sort())
    expect(ativadas(e)).toHaveLength(1)
  })

  it('dano menor que a redução vira 0 (nunca cura)', () => {
    // 1300 vs 1200: dano 100 -> reduzido a 0
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-005'] }, oponente: { campo: ['CC-001'], suporte: ['CC-094'] } }), 0, 0)) // 1500 vs 1200 = 300
    expect(e.jogadores.oponente.lp).toBe(8000)
  })

  it('só reduz dano do controlador: se o atacante perde, ele continua levando o dano e a armadilha é consumida', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-001'] }, oponente: { campo: ['CC-003'], suporte: ['CC-093'] } }), 0, 0))
    expect(e.jogadores.humano.lp).toBe(8000 - 400)
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(restantes(e, 'oponente')).toEqual([])
  })

  it('também dispara contra unidade em DEFESA (gatilho é o ataque recebido)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: [{ id: 'CC-047', pos: 'DEFESA' }], suporte: ['CC-093'] } }), 0, 0))
    expect(ativadas(e)).toHaveLength(1)
    expect(e.jogadores.oponente.campo[0]).toBeNull()
  })
})

describe('anular_ataque (CC-099 ataque_recebido, CC-095 ataque_direto)', () => {
  it('CC-099 cancela o ataque inteiro: sem dano nem destruição, e consome o ataque da unidade', () => {
    let e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], suporte: ['CC-099'] } }), 0, 0))
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.lp).toBe(8000)
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
    expect(e.log.some((x) => x.tipo === 'ataque_anulado')).toBe(true)
    expect(atacar(e, 0, 0).ok).toBe(false)
    expect(restantes(e, 'oponente')).toEqual([])
    e = structuredClone(e)
    expect(invariantes(e)).toEqual([])
  })

  it('CC-099 também anula quando o atacante perderia a luta (a unidade dele não é destruída)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-001'] }, oponente: { campo: ['CC-003'], suporte: ['CC-099'] } }), 0, 0))
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
    expect(e.jogadores.humano.lp).toBe(8000)
  })

  it('CC-095 anula ataque direto', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { suporte: ['CC-095'] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
    expect(restantes(e, 'oponente')).toEqual([])
  })
})

describe('ataque_direto: reduzir_dano (CC-096 -1000) e cura (CC-100 +500)', () => {
  it('CC-096 reduz o dano direto em 1000 (mín. 0)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { suporte: ['CC-096'] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(8000 - 600)
    const e2 = ok(atacar(cenarioCombate({ humano: { campo: ['CC-013'] }, oponente: { suporte: ['CC-096'] } }), 0, 'direto'))
    expect(e2.jogadores.oponente.lp).toBe(8000) // 700 - 1000 < 0 -> 0
  })

  it('CC-100 cura 500 ANTES do dano; o ataque segue normalmente', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { lp: 3000, suporte: ['CC-100'] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(3000 + 500 - 1600)
    expect(e.resultado).toBeNull()
  })

  it('CC-100: se ainda perder todos os LP depois da cura, perde a partida', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { lp: 1000, suporte: ['CC-100'] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(0)
    expect(e.resultado).toEqual({ vencedor: 'humano', motivo: 'lp' })
  })

  it('CC-100: a cura respeita o teto de 8000 e a armadilha vira descarte', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-013'] }, oponente: { lp: 7900, suporte: ['CC-100'] } }), 0, 'direto'))
    expect(e.jogadores.oponente.lp).toBe(8000 - 700)
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId)).toEqual(['CC-100'])
  })
})

describe('invocacao_impacto: debuff_invocada (CC-097 500, CC-098 400)', () => {
  it.each([
    ['CC-097', 500],
    ['CC-098', 400],
  ])('%s reduz de forma permanente ATK e DEF da unidade impacto invocada', (id, m) => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-047'] }, oponente: { suporte: [id] } }), 'humano', 'CC-047'))
    const u = e.jogadores.humano.campo[0]!
    expect(atkEfetivo(e, 'humano', u, cat)).toBe(1800 - m)
    expect(defEfetiva(e, 'humano', u, cat)).toBe(900 - m)
    expect(restantes(e, 'oponente')).toEqual([])
    expect(ativadas(e)).toHaveLength(1)
  })

  it('o debuff é normalizado: valor positivo no catálogo REDUZ (e nunca passa de zero no efetivo)', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-056'] }, oponente: { suporte: ['CC-097'] } }), 'humano', 'CC-056')) // DEF 700 - 500
    expect(e.jogadores.humano.campo[0]!.buffAtk).toBe(-500)
    expect(e.jogadores.humano.campo[0]!.buffDef).toBe(-500)
    const e2 = ok(jogar(cenario({ humano: { mao: ['CC-056'] }, oponente: { suporte: ['CC-097', 'CC-097'] } }), 'humano', 'CC-056'))
    expect(e2.jogadores.oponente.suporte.filter(Boolean)).toHaveLength(1) // só uma por evento
  })

  it('unidade que não é do grupo impacto não dispara a armadilha, que continua armada', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-001'] }, oponente: { suporte: ['CC-097'] } }), 'humano', 'CC-001'))
    expect(ativadas(e)).toHaveLength(0)
    expect(restantes(e, 'oponente')).toEqual(['CC-097'])
    expect(atkEfetivo(e, 'humano', e.jogadores.humano.campo[0]!, cat)).toBe(1200)
  })

  it('o oponente invocando impacto também dispara armadilha do humano', () => {
    const e = ok(jogar(cenario({ ativo: 'oponente', oponente: { mao: ['CC-047'] }, humano: { suporte: ['CC-098'] } }), 'oponente', 'CC-047'))
    expect(e.jogadores.oponente.campo[0]!.buffAtk).toBe(-400)
  })
})

describe('prioridade e ordem de ativação', () => {
  it('com duas elegíveis para o mesmo evento, ativa a mais antiga (menor ordem), mesmo em zona posterior', () => {
    const base = cenarioCombate({
      humano: { campo: ['CC-007'] },
      oponente: { campo: ['CC-013'], suporte: [{ id: 'CC-093', ordem: 9 }, null, null, { id: 'CC-094', ordem: 2 }] },
    })
    const e = ok(atacar(base, 0, 0))
    expect(restantes(e, 'oponente')).toEqual(['CC-093']) // a mais nova ficou armada
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId)).toContain('CC-094')
    expect(e.jogadores.oponente.lp).toBe(8000 - (1000 - 800)) // reduziu 800 (CC-094), não 600
  })

  it('apenas UMA armadilha por evento, mesmo com três elegíveis', () => {
    const base = cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], suporte: ['CC-093', 'CC-094', 'CC-099'] } })
    const e = ok(atacar(base, 0, 0))
    expect(ativadas(e)).toHaveLength(1)
    expect(restantes(e, 'oponente')).toHaveLength(2)
  })

  it('desempate por uid quando a ordem coincide (determinístico)', () => {
    const base = cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], suporte: [{ id: 'CC-093', ordem: 1 }, { id: 'CC-094', ordem: 1 }] } })
    const z = armadilhaMaisAntiga(base, 'oponente', 'ataque_recebido', cat)
    const uids = [base.jogadores.oponente.suporte[0]!.uid, base.jogadores.oponente.suporte[1]!.uid]
    expect(base.jogadores.oponente.suporte[z]!.uid).toBe([...uids].sort()[0])
  })

  it('ataque direto só considera ataque_direto; ataque a unidade só considera ataque_recebido', () => {
    const suporte = ['CC-093', 'CC-095']
    const direto = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { suporte } }), 0, 'direto'))
    expect(restantes(direto, 'oponente')).toEqual(['CC-093'])
    const contraUnidade = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], suporte } }), 0, 0))
    expect(restantes(contraUnidade, 'oponente')).toEqual(['CC-095'])
  })

  it('armadilha inelegível para o evento fica armada (invocacao_impacto não reage a ataque)', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], suporte: ['CC-097'] } }), 0, 0))
    expect(ativadas(e)).toHaveLength(0)
    expect(restantes(e, 'oponente')).toEqual(['CC-097'])
  })

  it('armadilhas do atacante não reagem ao próprio ataque', () => {
    const e = ok(atacar(cenarioCombate({ humano: { campo: ['CC-003'], suporte: ['CC-099'] }, oponente: { campo: ['CC-001'] } }), 0, 0))
    expect(ativadas(e)).toHaveLength(0)
    expect(e.jogadores.oponente.campo[0]).toBeNull()
  })
})

describe('só ativa a partir do turno seguinte ao da colocação', () => {
  it('armadilha colocada no turno atual não é elegível (estado construído)', () => {
    const e = cenarioCombate({ turno: 3, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], suporte: [{ id: 'CC-099', turno: 3 }] } })
    expect(armadilhaMaisAntiga(e, 'oponente', 'ataque_recebido', cat)).toBe(-1)
    const r = ok(atacar(e, 0, 0))
    expect(ativadas(r)).toHaveLength(0)
    expect(restantes(r, 'oponente')).toEqual(['CC-099']) // continua armada
    expect(r.jogadores.oponente.campo[0]).toBeNull() // ataque seguiu normal
  })

  it('colocada em turno anterior é elegível; entre duas, só a elegível dispara', () => {
    const e = cenarioCombate({
      turno: 3,
      humano: { campo: ['CC-003'] },
      oponente: { campo: ['CC-001'], suporte: [{ id: 'CC-093', turno: 3, ordem: 1 }, { id: 'CC-094', turno: 2, ordem: 5 }] },
    })
    const z = armadilhaMaisAntiga(e, 'oponente', 'ataque_recebido', cat)
    expect(e.jogadores.oponente.suporte[z]!.cartaId).toBe('CC-094')
  })

  it('fluxo real: armadilha colocada no turno 1 já pode reagir ao ataque do turno 2', () => {
    let e = cenario({ turno: 1, humano: { mao: ['CC-095'], baralho: 34 }, oponente: { mao: ['CC-003'], campo: ['CC-001'], baralho: 34 } })
    e = ok(jogar(e, 'humano', 'CC-095'))
    expect(e.jogadores.humano.suporte[0]?.colocadaNoTurno).toBe(1)
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    e = ok(jogar(e, 'oponente', 'CC-003', { posicao: 'ATAQUE' }))
    e = ok(aplicarComando(e, { tipo: 'avancarFase', jogador: 'oponente' }))
    e = ok(atacar(e, 0, 'direto'))
    expect(e.jogadores.humano.lp).toBe(8000)
    expect(ativadas(e)).toHaveLength(1)
  })
})
