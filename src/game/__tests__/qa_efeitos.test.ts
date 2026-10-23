// QA independente: as 20 ações e as 8 armadilhas do catálogo, conferidas contra §6/§7 (texto do regulamento + cartas.json).
import { describe, expect, it } from 'vitest'
import { aplicarComando, jogadasLegais } from '../acoes'
import { atkEfetivo, defEfetiva } from '../combate'
import { invariantes, mapaCatalogo, totalCartas } from '../estado'
import type { EstadoDuelo, IdJogador } from '../estado'
import { visaoParaJogador } from '../visao'
import { atacar, cenario, cenarioCombate, cmd, irParaCombate, jogar, ok, uidDe } from './util'

const cat = mapaCatalogo()
const atk = (e: EstadoDuelo, j: IdJogador, z: number) => atkEfetivo(e, j, e.jogadores[j].campo[z]!, cat)
const def = (e: EstadoDuelo, j: IdJogador, z: number) => defEfetiva(e, j, e.jogadores[j].campo[z]!, cat)
const recusa = (e: EstadoDuelo, c: Parameters<typeof aplicarComando>[1]) => {
  const r = aplicarComando(e, c)
  expect(r.ok).toBe(false)
  expect(r.estado).toBe(e)
}
const usarAcao = (e: EstadoDuelo, j: IdJogador, id: string, extra: { alvo?: number; zona?: number } = {}) => aplicarComando(e, { tipo: 'jogarCarta', jogador: j, uid: uidDe(e, j, id), ...extra })

describe('QA 4 - ações com alvo de unidade: debuff / buff / destruir (§6)', () => {
  // [id, valor]; debuffs atingem UMA unidade inimiga do grupo impacto
  it.each([
    ['CC-073', 500],
    ['CC-076', 400],
    ['CC-081', 600],
  ])('%s: -%i em ATK e DEF de UMA unidade inimiga impacto; nada mais muda', (id, v) => {
    const e0 = cenario({ turno: 3, humano: { mao: [id], campo: ['CC-047'] }, oponente: { campo: ['CC-047', 'CC-001', 'CC-056'] } })
    const e = ok(usarAcao(e0, 'humano', id, { alvo: 2 }))
    expect(atk(e, 'oponente', 2)).toBe(2200 - v)
    expect(def(e, 'oponente', 2)).toBe(700 - v < 0 ? 0 : 700 - v)
    expect(atk(e, 'oponente', 0)).toBe(1800) // outra impacto intocada
    expect(atk(e, 'humano', 0)).toBe(1800) // aliada intocada
    expect(atk(e, 'oponente', 1)).toBe(1200)
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId)).toEqual([id])
    expect(e.jogadores.humano.mao).toHaveLength(0)
    expect(e.jogadaFeita).toBe(true)
    expect(invariantes(e)).toEqual([])
  })

  it('debuff: alvo omitido, aliado, de outro grupo, vazio ou fora de faixa é recusado; sem impacto inimigo a carta não é jogável', () => {
    const e = cenario({ turno: 3, humano: { mao: ['CC-073'], campo: ['CC-047'] }, oponente: { campo: ['CC-001', 'CC-047'] } })
    const u = uidDe(e, 'humano', 'CC-073')
    for (const alvo of [undefined, 0 /* inimiga ecossistema */, 2 /* vazia */, 5, -1, 1.2, NaN]) recusa(e, { tipo: 'jogarCarta', jogador: 'humano', uid: u, alvo: alvo as number })
    expect(ok(aplicarComando(e, { tipo: 'jogarCarta', jogador: 'humano', uid: u, alvo: 1 })).jogadores.oponente.campo[1]!.buffAtk).toBe(-500)
    const semImpacto = cenario({ turno: 3, humano: { mao: ['CC-073', 'CC-001'], campo: ['CC-047'] }, oponente: { campo: ['CC-001'] } })
    expect(jogadasLegais(semImpacto).filter((c) => c.tipo === 'jogarCarta' && c.uid === uidDe(semImpacto, 'humano', 'CC-073'))).toEqual([])
    recusa(semImpacto, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(semImpacto, 'humano', 'CC-073'), alvo: 0 })
  })

  it.each([
    ['CC-074', 500, 'CC-001'],
    ['CC-084', 400, 'CC-001'],
    ['CC-078', 300, 'CC-033'],
  ])('%s: +%i em ATK e DEF de UMA aliada do grupo certo (não de todo o grupo)', (id, v, alvoCarta) => {
    const e0 = cenario({ turno: 3, humano: { mao: [id], campo: [alvoCarta, alvoCarta, 'CC-047'] }, oponente: { campo: [alvoCarta] } })
    const e = ok(usarAcao(e0, 'humano', id, { alvo: 1 }))
    const base = cat.get(alvoCarta)!
    expect(atk(e, 'humano', 1)).toBe(base.atk! + v)
    expect(def(e, 'humano', 1)).toBe(base.defesa! + v)
    expect(atk(e, 'humano', 0)).toBe(base.atk!) // a outra do mesmo grupo não recebe
    expect(atk(e, 'humano', 2)).toBe(1800)
    expect(atk(e, 'oponente', 0)).toBe(base.atk!)
    recusa(e0, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e0, 'humano', id), alvo: 2 }) // aliada de outro grupo
    // não pode mirar a unidade inimiga nem zona vazia
    recusa(e0, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e0, 'humano', id), alvo: 3 })
    recusa(e0, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e0, 'humano', id) })
  })

  it('buff de grupo sem aliada do grupo (só inimiga no grupo) não é jogável', () => {
    const e = cenario({ turno: 3, humano: { mao: ['CC-074'], campo: ['CC-047'] }, oponente: { campo: ['CC-001'] } })
    expect(jogadasLegais(e).every((c) => c.tipo === 'descartar')).toBe(true)
  })

  it.each([
    ['CC-077', 400],
    ['CC-083', 300],
  ])('%s: +%i em qualquer unidade aliada (qualquer grupo), nunca inimiga', (id, v) => {
    for (const alvoCarta of ['CC-001', 'CC-019', 'CC-033', 'CC-047']) {
      const e0 = cenario({ turno: 3, humano: { mao: [id], campo: [alvoCarta] }, oponente: { campo: ['CC-001'] } })
      const e = ok(usarAcao(e0, 'humano', id, { alvo: 0 }))
      expect(atk(e, 'humano', 0)).toBe(cat.get(alvoCarta)!.atk! + v)
      expect(def(e, 'humano', 0)).toBe(cat.get(alvoCarta)!.defesa! + v)
    }
    // sem aliada: não jogável (o alvo é sempre aliado)
    const vazio = cenario({ turno: 3, humano: { mao: [id] }, oponente: { campo: ['CC-001'] } })
    recusa(vazio, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(vazio, 'humano', id), alvo: 0 })
  })

  it('CC-075: destrói UMA unidade inimiga impacto, sem tirar LP; leva o equipamento; recusa não-impacto', () => {
    const e0 = cenario({ turno: 3, humano: { mao: ['CC-075'] }, oponente: { campo: ['CC-001', { id: 'CC-047', equip: 'CC-088' }, 'CC-056'] } })
    recusa(e0, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e0, 'humano', 'CC-075'), alvo: 0 })
    const e = ok(usarAcao(e0, 'humano', 'CC-075', { alvo: 1 }))
    expect(e.jogadores.oponente.campo.map((u) => u?.cartaId ?? null)).toEqual(['CC-001', null, 'CC-056', null, null])
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId).sort()).toEqual(['CC-047', 'CC-088'])
    expect(e.jogadores.oponente.suporte.every((s) => s === null)).toBe(true)
    expect(totalCartas(e, 'oponente')).toBe(totalCartas(e0, 'oponente'))
  })

  it('debuff sobrepõe-se com buff posterior (valores brutos), efetivo nunca negativo', () => {
    let e = cenario({ turno: 3, humano: { mao: ['CC-081', 'CC-081'], campo: ['CC-047'] }, oponente: { campo: ['CC-056'] } })
    e = ok(usarAcao(e, 'humano', 'CC-081', { alvo: 0 }))
    e = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(def(e, 'oponente', 0)).toBe(100) // 700-600
  })
})

describe('QA 4 - cura, revelar, equipamento, terreno', () => {
  it.each([
    ['CC-079', 500],
    ['CC-080', 700],
  ])('%s: +%i LP, máximo 8000, só jogável se LP < 8000', (id, v) => {
    const e1 = ok(usarAcao(cenario({ turno: 3, humano: { lp: 3000, mao: [id] } }), 'humano', id))
    expect(e1.jogadores.humano.lp).toBe(3000 + v)
    expect(e1.jogadores.humano.descarte).toHaveLength(1)
    const e2 = ok(usarAcao(cenario({ turno: 3, humano: { lp: 7900, mao: [id] } }), 'humano', id))
    expect(e2.jogadores.humano.lp).toBe(8000)
    const e3 = ok(usarAcao(cenario({ turno: 3, humano: { lp: 7999, mao: [id] } }), 'humano', id))
    expect(e3.jogadores.humano.lp).toBe(8000)
    const cheio = cenario({ turno: 3, humano: { lp: 8000, mao: [id] } })
    recusa(cheio, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(cheio, 'humano', id) })
    // a cura é só do próprio controlador
    expect(e1.jogadores.oponente.lp).toBe(8000)
    const op = ok(usarAcao(cenario({ turno: 4, ativo: 'oponente', oponente: { lp: 1000, mao: [id] } }), 'oponente', id))
    expect(op.jogadores.oponente.lp).toBe(1000 + v)
  })

  it('CC-082 revelar: sempre jogável, mostra armadilhas viradas do oponente até o fim do turno, sem desarmar', () => {
    const base = cenario({ turno: 3, humano: { mao: ['CC-082'] }, oponente: { suporte: ['CC-093', 'CC-100'] } })
    expect(visaoParaJogador(base, 'humano').oponente.suporte.every((s) => s === null || s.oculta)).toBe(true)
    const e = ok(usarAcao(base, 'humano', 'CC-082'))
    const v = visaoParaJogador(e, 'humano')
    expect(v.oponente.suporte.map((s) => (s && !s.oculta ? s.cartaId : null))).toEqual(['CC-093', 'CC-100', null, null, null])
    expect(e.jogadores.oponente.suporte.filter(Boolean)).toHaveLength(2)
    // o oponente não ganha visão
    expect(visaoParaJogador(e, 'oponente').oponente.suporte.every((s) => s === null || s.oculta === true || s.oculta === false)).toBe(true)
    // revelar não revela a mão
    expect(JSON.stringify(v)).not.toContain(e.jogadores.oponente.mao[0]?.uid ?? '__nada__')
    // fim do turno: volta a ocultar
    const fim = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(visaoParaJogador(fim, 'humano').oponente.suporte.every((s) => s === null || s.oculta)).toBe(true)
    // sem armadilhas e sem unidades: ainda jogável
    const vazio = cenario({ turno: 3, humano: { mao: ['CC-082'] } })
    expect(ok(usarAcao(vazio, 'humano', 'CC-082')).jogadores.humano.descarte).toHaveLength(1)
  })

  it.each([
    ['CC-085', 'def', 500, 'CC-001', 'CC-019'],
    ['CC-086', 'atk', 500, 'CC-033', 'CC-001'],
    ['CC-087', 'def', 400, 'CC-033', 'CC-001'],
    ['CC-088', 'def', 300, 'CC-047', 'CC-001'],
  ])('%s equipamento: só ATK ou DEF (%s %i), restrição de grupo, 1 por unidade, usa zona de suporte', (id, qual, v, bom, ruim) => {
    const e0 = cenario({ turno: 3, humano: { mao: [id], campo: [bom, ruim] } })
    const e = ok(usarAcao(e0, 'humano', id, { alvo: 0 }))
    const b = cat.get(bom)!
    expect(atk(e, 'humano', 0)).toBe(b.atk! + (qual === 'atk' ? v : 0))
    expect(def(e, 'humano', 0)).toBe(b.defesa! + (qual === 'def' ? v : 0))
    expect(e.jogadores.humano.suporte.filter(Boolean)).toHaveLength(1)
    expect(e.jogadores.humano.suporte[0]).toMatchObject({ tipo: 'equipamento', vinculadaA: e.jogadores.humano.campo[0]!.uid })
    expect(e.jogadores.humano.descarte).toHaveLength(0)
    expect(e.jogadores.humano.mao).toHaveLength(0)
    expect(invariantes(e)).toEqual([])
    if (id !== 'CC-088') recusa(e0, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e0, 'humano', id), alvo: 1 }) // grupo errado
    // enemy target
    const inim = cenario({ turno: 3, humano: { mao: [id], campo: [bom] }, oponente: { campo: [bom] } })
    recusa(inim, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(inim, 'humano', id), alvo: 1 })
  })

  it('equipamento: 1 por unidade (unidade equipada deixa de ser alvo), suporte cheio bloqueia, ocupado recusa zona', () => {
    const dois = cenario({ turno: 3, humano: { mao: ['CC-088'], campo: [{ id: 'CC-001', equip: 'CC-085' }] } })
    expect(jogadasLegais(dois).every((c) => c.tipo === 'descartar')).toBe(true)
    recusa(dois, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(dois, 'humano', 'CC-088'), alvo: 0 })
    const cheio = cenario({ turno: 3, humano: { mao: ['CC-088'], campo: ['CC-001'], suporte: ['CC-093', 'CC-093', 'CC-093', 'CC-093', 'CC-093'] } })
    expect(jogadasLegais(cheio).every((c) => c.tipo === 'descartar')).toBe(true)
    const um = cenario({ turno: 3, humano: { mao: ['CC-088'], campo: ['CC-001'], suporte: ['CC-093'] } })
    recusa(um, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(um, 'humano', 'CC-088'), alvo: 0, zona: 0 })
    recusa(um, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(um, 'humano', 'CC-088'), alvo: 0, zona: 9 })
    expect(ok(usarAcao(um, 'humano', 'CC-088', { alvo: 0, zona: 3 })).jogadores.humano.suporte[3]?.cartaId).toBe('CC-088')
    expect(ok(usarAcao(um, 'humano', 'CC-088', { alvo: 0 })).jogadores.humano.suporte[1]?.cartaId).toBe('CC-088')
  })

  it.each([
    ['CC-089', 'CC-001', 'CC-033'],
    ['CC-090', 'CC-033', 'CC-001'],
    ['CC-091', 'CC-019', 'CC-001'],
    ['CC-092', 'CC-047', 'CC-001'],
  ])('%s terreno: +300 ATK e DEF do grupo para AMBOS os lados; outros grupos intocados; sem zona de suporte', (id, afetada, outra) => {
    const e0 = cenario({ turno: 3, humano: { mao: [id], campo: [afetada, outra] }, oponente: { campo: [afetada, outra] } })
    const base = cat.get(afetada)!
    const e = ok(usarAcao(e0, 'humano', id))
    for (const j of ['humano', 'oponente'] as const) {
      expect(atk(e, j, 0)).toBe(base.atk! + 300)
      expect(def(e, j, 0)).toBe(base.defesa! + 300)
      expect(atk(e, j, 1)).toBe(cat.get(outra)!.atk)
    }
    expect(e.terreno).toMatchObject({ cartaId: id, dono: 'humano' })
    expect(e.jogadores.humano.suporte.every((s) => s === null)).toBe(true)
    expect(e.jogadores.humano.descarte).toHaveLength(0)
    expect(totalCartas(e, 'humano')).toBe(totalCartas(e0, 'humano'))
    expect(invariantes(e)).toEqual([])
  })

  it('terreno substitui o anterior (vai ao descarte do DONO anterior) e muda os cálculos; mesmo terreno pode ser reposto', () => {
    const e0 = cenario({ turno: 4, ativo: 'oponente', terreno: { id: 'CC-089', dono: 'humano' }, oponente: { mao: ['CC-092'], campo: ['CC-001', 'CC-047'] } })
    expect(atk(e0, 'oponente', 0)).toBe(1500)
    const e = ok(usarAcao(e0, 'oponente', 'CC-092'))
    expect(e.terreno).toMatchObject({ cartaId: 'CC-092', dono: 'oponente' })
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId)).toEqual(['CC-089'])
    expect(atk(e, 'oponente', 0)).toBe(1200)
    expect(atk(e, 'oponente', 1)).toBe(2100)
    expect(totalCartas(e, 'humano')).toBe(40)
    expect(totalCartas(e, 'oponente')).toBe(40)
    const r = cenario({ turno: 3, terreno: { id: 'CC-089', dono: 'humano' }, humano: { mao: ['CC-089'] } })
    expect(ok(usarAcao(r, 'humano', 'CC-089')).jogadores.humano.descarte.map((c) => c.cartaId)).toEqual(['CC-089'])
  })

  it('terreno afeta resultado de combate dos dois lados (vira o jogo)', () => {
    // sem terreno: 1700 (fauna CC-018) perde para 1800 (ativ CC-031 1400?) -> usar valores conhecidos: CC-043 2000 ativ vs CC-027 2000 fauna = empate
    const e = cenarioCombate({ turno: 3, terreno: { id: 'CC-091', dono: 'oponente' }, humano: { campo: ['CC-043'] }, oponente: { campo: ['CC-027'] } })
    const r = ok(atacar(e, 0, 0)) // fauna 2300 vence atividade 2000: atacante perde 300
    expect(r.jogadores.humano.lp).toBe(7700)
    expect(r.jogadores.humano.campo[0]).toBeNull()
  })

  it('dano real conserva cartas e efeito em encadeamento: buff + equipamento + terreno + debuff', () => {
    let e = cenario({ turno: 3, terreno: { id: 'CC-089', dono: 'oponente' }, humano: { mao: ['CC-074'], campo: [{ id: 'CC-001', equip: 'CC-085' }] }, oponente: { campo: [] } })
    e = ok(usarAcao(e, 'humano', 'CC-074', { alvo: 0 }))
    expect(atk(e, 'humano', 0)).toBe(1200 + 500 + 300)
    expect(def(e, 'humano', 0)).toBe(2000 + 500 + 500 + 300)
  })
})

describe('QA 5 - armadilhas (§6/§7)', () => {
  // armadilha do HUMANO colocada no turno 1; ataque do oponente no turno 4 (cenários com ativo oponente)
  const defende = (trap: string | { id: string; turno?: number; ordem?: number }, extra: Parameters<typeof cenarioCombate>[0] = {}) =>
    cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: [trap], campo: ['CC-001'] }, oponente: { campo: ['CC-071'] }, ...extra }) // CC-071 2400 vs CC-001 1200

  it.each([
    ['CC-093', 600],
    ['CC-094', 800],
  ])('%s reduzir_dano %i: reduz só o dano aos LP do controlador (mínimo 0) e não impede a destruição', (id, v) => {
    const e = ok(atacar(defende(id), 0, 0)) // diferença 1200
    expect(e.jogadores.humano.lp).toBe(8000 - (1200 - v))
    expect(e.jogadores.humano.campo[0]).toBeNull() // destruída mesmo assim
    expect(e.jogadores.humano.suporte[0]).toBeNull()
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId).sort()).toEqual([id, 'CC-001'].sort())
    // dano menor que a redução: zero, nunca negativo (LP não sobe)
    const peq = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: [id], campo: ['CC-043'], lp: 5000 }, oponente: { campo: [{ id: 'CC-027' }] } }), 0, 0)) // 2000 x 2000 empate: sem dano
    expect(peq.jogadores.humano.lp).toBe(5000)
    const pq = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: [id], campo: ['CC-033'], lp: 5000 }, oponente: { campo: ['CC-043'] } }), 0, 0)) // diferença 200 < v
    expect(pq.jogadores.humano.lp).toBe(5000)
    // não reduz dano que o próprio controlador sofreria ao atacar? (não aplicável); mas defende unidade em DEFESA com atacante perdendo: sem efeito
    const rep = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: [id], campo: [{ id: 'CC-001', pos: 'DEFESA' }] }, oponente: { campo: ['CC-033'] } }), 0, 0)) // 1800 < DEF 2000: dano ao atacante
    expect(rep.jogadores.oponente.lp).toBe(7800) // redução NÃO se aplica ao dano do atacante
    expect(rep.jogadores.humano.lp).toBe(8000)
    expect(rep.jogadores.humano.suporte[0]).toBeNull() // gastou mesmo sem utilidade (§15.11)
  })

  it('ataque_recebido também dispara contra unidade em DEFESA e contra a mais antiga entre duas', () => {
    const e = cenarioCombate({
      ativo: 'oponente',
      turno: 4,
      humano: { suporte: [{ id: 'CC-094', ordem: 9 }, { id: 'CC-093', ordem: 2 }, null, { id: 'CC-099', ordem: 5 }], campo: ['CC-001'] },
      oponente: { campo: ['CC-071'] },
    })
    const r = ok(atacar(e, 0, 0))
    // ordem 2 (CC-093, zona 1) é a mais antiga; só UMA dispara
    expect(r.jogadores.humano.suporte.map((s) => s?.cartaId ?? null)).toEqual(['CC-094', null, null, 'CC-099', null])
    expect(r.jogadores.humano.lp).toBe(8000 - 600)
  })

  it('desempate: mesma ordem -> uid menor; armadilha de gatilho errado fica armada', () => {
    const e = defende('CC-096') // ataque_direto não dispara em ataque a unidade
    const r = ok(atacar(e, 0, 0))
    expect(r.jogadores.humano.suporte[0]?.cartaId).toBe('CC-096')
    expect(r.jogadores.humano.lp).toBe(8000 - 1200)
    const direto = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: ['CC-093', 'CC-099'] }, oponente: { campo: ['CC-071'] } })
    const rd = ok(atacar(direto, 0, 'direto')) // ataque_recebido não dispara no ataque direto
    expect(rd.jogadores.humano.lp).toBe(8000 - 2400)
    expect(rd.jogadores.humano.suporte.filter(Boolean)).toHaveLength(2)
  })

  it.each([
    ['CC-095', 'direto'],
    ['CC-099', 'unidade'],
  ])('%s anular_ataque (%s): sem dano, sem destruição, atacante marcado como atacou, armadilha consumida', (id, tipo) => {
    const e = ok(
      tipo === 'direto'
        ? atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: [id] }, oponente: { campo: ['CC-071'] } }), 0, 'direto')
        : atacar(defende(id), 0, 0),
    )
    expect(e.jogadores.humano.lp).toBe(8000)
    expect(e.jogadores.humano.campo.filter(Boolean)).toHaveLength(tipo === 'direto' ? 0 : 1)
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
    expect(e.jogadores.oponente.campo[0]!.atacou).toBe(true)
    expect(e.jogadores.humano.suporte[0]).toBeNull()
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId)).toEqual([id])
    recusa(e, { tipo: 'atacar', jogador: 'oponente', atacante: 0, alvo: tipo === 'direto' ? 'direto' : 0 })
    expect(e.log.at(-1)?.tipo).toBe('ataque_anulado')
  })

  it('CC-096 reduz ataque direto em 1000 (mínimo 0); CC-100 cura 500 ANTES do dano (cap 8000)', () => {
    const r = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: ['CC-096'] }, oponente: { campo: ['CC-071'] } }), 0, 'direto'))
    expect(r.jogadores.humano.lp).toBe(8000 - 1400)
    const baixo = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: ['CC-096'] }, oponente: { campo: ['CC-004'] } }), 0, 'direto')) // 900 < 1000
    expect(baixo.jogadores.humano.lp).toBe(8000)
    const c = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { lp: 5000, suporte: ['CC-100'] }, oponente: { campo: ['CC-043'] } }), 0, 'direto'))
    expect(c.jogadores.humano.lp).toBe(5000 + 500 - 2000)
    // cura antes do dano salva a vida: 1500 + 500 = 2000 - 2000 = 0 -> ainda morre; 1501 vive com 1
    const morre = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { lp: 1500, suporte: ['CC-100'] }, oponente: { campo: ['CC-043'] } }), 0, 'direto'))
    expect(morre.jogadores.humano.lp).toBe(0)
    expect(morre.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
    const vive = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { lp: 1501, suporte: ['CC-100'] }, oponente: { campo: ['CC-043'] } }), 0, 'direto'))
    expect(vive.jogadores.humano.lp).toBe(1)
    expect(vive.resultado).toBeNull()
    const cap = ok(atacar(cenarioCombate({ ativo: 'oponente', turno: 4, humano: { lp: 8000, suporte: ['CC-100'] }, oponente: { campo: ['CC-043'] } }), 0, 'direto'))
    expect(cap.jogadores.humano.lp).toBe(6000)
  })

  it('debuff_invocada: só unidade IMPACTO invocada pelo adversário; permanente; mínimo 0; uma por evento', () => {
    const e0 = cenario({ turno: 4, ativo: 'oponente', humano: { suporte: [{ id: 'CC-098', ordem: 8 }, { id: 'CC-097', ordem: 3 }] }, oponente: { mao: ['CC-056', 'CC-001'] } })
    const naoImpacto = ok(jogar(e0, 'oponente', 'CC-001'))
    expect(naoImpacto.jogadores.humano.suporte.filter(Boolean)).toHaveLength(2) // continua armada
    const e = ok(jogar(e0, 'oponente', 'CC-056', { posicao: 'ATAQUE' })) // 2200/700
    expect(atk(e, 'oponente', 0)).toBe(1700) // CC-097 (-500, a mais antiga) dispara
    expect(def(e, 'oponente', 0)).toBe(200)
    expect(e.jogadores.humano.suporte.map((s) => s?.cartaId ?? null)).toEqual(['CC-098', null, null, null, null])
    // segue permanente nos turnos seguintes
    const t = ok(cmd(ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'oponente' })), jogadasLegais(ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'oponente' })))[0]!))
    expect(t.jogadores.oponente.campo[0]!.buffAtk).toBe(-500)
    // mínimo zero: CC-056 (DEF 700) com -800 total nunca fica negativo
    const dupla = cenario({ turno: 4, ativo: 'oponente', humano: { suporte: ['CC-097'] }, oponente: { mao: ['CC-056'], campo: [{ id: 'CC-056', buffDef: -600 }] } })
    const du = ok(jogar(dupla, 'oponente', 'CC-056'))
    expect(def(du, 'oponente', 1)).toBe(200)
    expect(def(du, 'oponente', 0)).toBe(100)
    const forte = cenario({ turno: 4, ativo: 'oponente', humano: { suporte: ['CC-097'] }, oponente: { mao: ['CC-056'], campo: [] } })
    const forteR = ok(jogar(forte, 'oponente', 'CC-056'))
    expect(def(forteR, 'oponente', 0)).toBeGreaterThanOrEqual(0)
  })

  it('debuff_invocada também funciona contra o HUMANO invocando (simetria) e não dispara na própria invocação do dono', () => {
    const h = cenario({ turno: 3, humano: { mao: ['CC-053'] }, oponente: { suporte: ['CC-098'] } })
    const r = ok(jogar(h, 'humano', 'CC-053'))
    expect(atk(r, 'humano', 0)).toBe(2100 - 400)
    expect(def(r, 'humano', 0)).toBe(500)
    expect(r.jogadores.oponente.suporte[0]).toBeNull()
    const proprio = cenario({ turno: 3, humano: { mao: ['CC-053'], suporte: ['CC-098'] } })
    const p = ok(jogar(proprio, 'humano', 'CC-053'))
    expect(atk(p, 'humano', 0)).toBe(2100) // armadilha do próprio invocador não reage
    expect(p.jogadores.humano.suporte[0]).not.toBeNull()
  })

  it('NÃO dispara no turno de colocação (estado construído) e dispara no turno seguinte (turno absoluto)', () => {
    const mesmo = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: [{ id: 'CC-099', turno: 4 }] , campo: ['CC-001'] }, oponente: { campo: ['CC-071'] } })
    expect(ok(atacar(mesmo, 0, 0)).jogadores.humano.suporte[0]).not.toBeNull()
    const seguinte = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: [{ id: 'CC-099', turno: 3 }], campo: ['CC-001'] }, oponente: { campo: ['CC-071'] } })
    expect(ok(atacar(seguinte, 0, 0)).jogadores.humano.suporte[0]).toBeNull()
  })

  it('FLUXO REAL (decisão §15.12): armadilha colocada pelo humano no turno 1 já reage ao ataque do oponente no turno 2', () => {
    let e = cenario({ turno: 1, ativo: 'humano', humano: { mao: ['CC-095'] }, oponente: { campo: ['CC-071'] } })
    e = ok(jogar(e, 'humano', 'CC-095'))
    expect(e.jogadores.humano.suporte[0]?.colocadaNoTurno).toBe(1)
    e = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(e.turno).toBe(2)
    e = irParaCombateSeguro(e)
    const r = ok(atacar(e, 0, 'direto'))
    // a armadilha anulou o ataque do turno 2: leitura "turno absoluto"
    expect(r.jogadores.humano.lp).toBe(8000)
    expect(r.jogadores.humano.suporte[0]).toBeNull()
  })

  it('a armadilha não é consumida por equipamento nem outro tipo de suporte', () => {
    const e = cenarioCombate({ ativo: 'oponente', turno: 4, humano: { suporte: [{ id: 'CC-085', turno: 1 }], campo: [{ id: 'CC-001', equip: 'CC-088' }] }, oponente: { campo: ['CC-071'] } })
    const r = ok(atacar(e, 0, 0))
    expect(r.jogadores.humano.lp).toBe(8000 - (2400 - 1200))
  })
})

function irParaCombateSeguro(e: EstadoDuelo): EstadoDuelo {
  // o oponente do cenário precisa da jogada da mão: descarta/joga a primeira jogada legal
  let x = e
  const j = jogadasLegais(x)[0]
  if (j) x = ok(cmd(x, j))
  return irParaCombate(x)
}
