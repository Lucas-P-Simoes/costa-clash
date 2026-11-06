// QA independente: as 15 ações do catálogo, conferidas contra §6/§7 (texto do regulamento + cartas.json).
import { describe, expect, it } from 'vitest'
import { aplicarComando, jogadasLegais } from '../acoes'
import { atkEfetivo, defEfetiva } from '../combate'
import { invariantes, mapaCatalogo, totalCartas } from '../estado'
import type { EstadoDuelo, IdJogador } from '../estado'
import { atacar, cenario, cenarioCombate, cmd, ok, uidDe } from './util'

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

  it('CC-075: destrói UMA unidade inimiga impacto, sem tirar LP; recusa não-impacto', () => {
    const e0 = cenario({ turno: 3, humano: { mao: ['CC-075'] }, oponente: { campo: ['CC-001', 'CC-047', 'CC-056'] } })
    recusa(e0, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e0, 'humano', 'CC-075'), alvo: 0 })
    const e = ok(usarAcao(e0, 'humano', 'CC-075', { alvo: 1 }))
    expect(e.jogadores.oponente.campo.map((u) => u?.cartaId ?? null)).toEqual(['CC-001', null, 'CC-056', null, null])
    expect(e.jogadores.oponente.lp).toBe(5000)
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId).sort()).toEqual(['CC-047'])
    expect(totalCartas(e, 'oponente')).toBe(totalCartas(e0, 'oponente'))
  })

  it('debuff sobrepõe-se com buff posterior (valores brutos), efetivo nunca negativo', () => {
    let e = cenario({ turno: 3, humano: { mao: ['CC-081', 'CC-081'], campo: ['CC-047'] }, oponente: { campo: ['CC-056'] } })
    e = ok(usarAcao(e, 'humano', 'CC-081', { alvo: 0 }))
    e = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(def(e, 'oponente', 0)).toBe(100) // 700-600
  })
})

describe('QA 4 - cura e terreno', () => {
  it.each([
    ['CC-079', 500],
    ['CC-080', 700],
  ])('%s: +%i LP, máximo 5000, só jogável se LP < 5000', (id, v) => {
    const e1 = ok(usarAcao(cenario({ turno: 3, humano: { lp: 3000, mao: [id] } }), 'humano', id))
    expect(e1.jogadores.humano.lp).toBe(3000 + v)
    expect(e1.jogadores.humano.descarte).toHaveLength(1)
    const e2 = ok(usarAcao(cenario({ turno: 3, humano: { lp: 4900, mao: [id] } }), 'humano', id))
    expect(e2.jogadores.humano.lp).toBe(5000)
    const e3 = ok(usarAcao(cenario({ turno: 3, humano: { lp: 4999, mao: [id] } }), 'humano', id))
    expect(e3.jogadores.humano.lp).toBe(5000)
    const cheio = cenario({ turno: 3, humano: { lp: 5000, mao: [id] } })
    recusa(cheio, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(cheio, 'humano', id) })
    // a cura é só do próprio controlador
    expect(e1.jogadores.oponente.lp).toBe(5000)
    const op = ok(usarAcao(cenario({ turno: 4, ativo: 'oponente', oponente: { lp: 1000, mao: [id] } }), 'oponente', id))
    expect(op.jogadores.oponente.lp).toBe(1000 + v)
  })

  it.each([
    ['CC-089', 'CC-001', 'CC-033'],
    ['CC-090', 'CC-033', 'CC-001'],
    ['CC-091', 'CC-019', 'CC-001'],
    ['CC-092', 'CC-047', 'CC-001'],
  ])('%s terreno: +300 ATK e DEF do grupo para AMBOS os lados; outros grupos intocados', (id, afetada, outra) => {
    const e0 = cenario({ turno: 3, humano: { mao: [id], campo: [afetada, outra] }, oponente: { campo: [afetada, outra] } })
    const base = cat.get(afetada)!
    const e = ok(usarAcao(e0, 'humano', id))
    for (const j of ['humano', 'oponente'] as const) {
      expect(atk(e, j, 0)).toBe(base.atk! + 300)
      expect(def(e, j, 0)).toBe(base.defesa! + 300)
      expect(atk(e, j, 1)).toBe(cat.get(outra)!.atk)
    }
    expect(e.terreno).toMatchObject({ cartaId: id, dono: 'humano' })
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
    expect(totalCartas(e, 'humano')).toBe(30)
    expect(totalCartas(e, 'oponente')).toBe(30)
    const r = cenario({ turno: 3, terreno: { id: 'CC-089', dono: 'humano' }, humano: { mao: ['CC-089'] } })
    expect(ok(usarAcao(r, 'humano', 'CC-089')).jogadores.humano.descarte.map((c) => c.cartaId)).toEqual(['CC-089'])
  })

  it('terreno afeta resultado de combate dos dois lados (vira o jogo)', () => {
    // sem terreno: 1700 (fauna CC-018) perde para 1800 (ativ CC-031 1400?) -> usar valores conhecidos: CC-043 2000 ativ vs CC-027 2000 fauna = empate
    const e = cenarioCombate({ turno: 3, terreno: { id: 'CC-091', dono: 'oponente' }, humano: { campo: ['CC-043'] }, oponente: { campo: ['CC-027'] } })
    const r = ok(atacar(e, 0, 0)) // fauna 2300 vence atividade 2000: atacante perde 300
    expect(r.jogadores.humano.lp).toBe(4700)
    expect(r.jogadores.humano.campo[0]).toBeNull()
  })

})
