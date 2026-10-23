import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { aplicarComando } from '../acoes'
import { atkEfetivo, defEfetiva } from '../combate'
import { invariantes, mapaCatalogo } from '../estado'
import type { EstadoDuelo } from '../estado'
import { visaoParaJogador } from '../visao'
import { atacar, cenario, cenarioCombate, jogar, ok } from './util'

const cat = mapaCatalogo(CATALOGO)
const atk = (e: EstadoDuelo, j: 'humano' | 'oponente', z: number) => atkEfetivo(e, j, e.jogadores[j].campo[z]!, cat)
const def = (e: EstadoDuelo, j: 'humano' | 'oponente', z: number) => defEfetiva(e, j, e.jogadores[j].campo[z]!, cat)

// Unidades usadas: CC-047 impacto 1800/900, CC-049 impacto 1700/1000, CC-001 eco 1200/2000, CC-003 eco 1600/1500,
// CC-018 fauna 1700/1500, CC-031 atividade 1400/1200.

describe('debuff_grupo (073, 076, 081): sinal normalizado, reduz ATK e DEF de UMA unidade inimiga do grupo', () => {
  it.each([
    ['CC-073', 500],
    ['CC-076', 400],
    ['CC-081', 600],
  ])('%s reduz %i em ATK e DEF da unidade escolhida e só dela', (id, m) => {
    const e0 = cenario({ humano: { mao: [id] }, oponente: { campo: ['CC-047', 'CC-049', 'CC-001'] } })
    const e = ok(jogar(e0, 'humano', id, { alvo: 1 }))
    expect(atk(e, 'oponente', 1)).toBe(1700 - m)
    expect(def(e, 'oponente', 1)).toBe(1000 - m)
    expect(atk(e, 'oponente', 0)).toBe(1800)
    expect(def(e, 'oponente', 0)).toBe(900)
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId)).toEqual([id])
    expect(e.jogadores.humano.mao).toHaveLength(0)
    expect(e.jogadores.humano.suporte.every((s) => s === null)).toBe(true)
    expect(invariantes(e)).toEqual([])
  })

  it('só aceita unidade inimiga do grupo impacto (aliada, outro grupo ou zona vazia são inválidas)', () => {
    const e = cenario({ humano: { mao: ['CC-073'], campo: ['CC-047'] }, oponente: { campo: ['CC-001', 'CC-049'] } })
    expect(jogar(e, 'humano', 'CC-073', { alvo: 0 }).ok).toBe(false) // zona 0 inimiga é eco
    expect(jogar(e, 'humano', 'CC-073', { alvo: 2 }).ok).toBe(false) // vazia
    expect(jogar(e, 'humano', 'CC-073', { alvo: 1 }).ok).toBe(true)
    expect(jogar(e, 'humano', 'CC-073').ok).toBe(false) // sem alvo escolhido
  })

  it('atributos nunca ficam abaixo de zero ao aplicar debuff maior que o valor base', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-081'] }, oponente: { campo: ['CC-056'] } }), 'humano', 'CC-081', { alvo: 0 })) // DEF 700 - 600
    expect(def(e, 'oponente', 0)).toBe(100)
    const e2 = ok(jogar(cenario({ humano: { mao: ['CC-081'] }, oponente: { campo: [{ id: 'CC-056', buffDef: -400 }] } }), 'humano', 'CC-081', { alvo: 0 }))
    expect(def(e2, 'oponente', 0)).toBe(0)
  })
})

describe('buffs: buff_grupo (074, 078, 084) e buff_unidade (077, 083)', () => {
  it.each([
    ['CC-074', 500, 'CC-001'],
    ['CC-084', 400, 'CC-001'],
    ['CC-078', 300, 'CC-031'],
  ])('%s soma %i em ATK e DEF de UMA unidade aliada do grupo', (id, m, alvoId) => {
    const e0 = cenario({ humano: { mao: [id], campo: [alvoId, alvoId] }, oponente: { campo: [alvoId] } })
    const base = CATALOGO.find((c) => c.id === alvoId)!
    const e = ok(jogar(e0, 'humano', id, { alvo: 0 }))
    expect(atk(e, 'humano', 0)).toBe((base.atk ?? 0) + m)
    expect(def(e, 'humano', 0)).toBe((base.defesa ?? 0) + m)
    expect(atk(e, 'humano', 1)).toBe(base.atk) // outra unidade do mesmo grupo não é afetada
    expect(atk(e, 'oponente', 0)).toBe(base.atk)
    expect(e.jogadores.humano.descarte).toHaveLength(1)
  })

  it('buff_grupo exige unidade aliada do grupo certo', () => {
    const e = cenario({ humano: { mao: ['CC-074'], campo: ['CC-018', 'CC-001'] }, oponente: { campo: ['CC-001'] } })
    expect(jogar(e, 'humano', 'CC-074', { alvo: 0 }).ok).toBe(false) // fauna
    expect(jogar(e, 'humano', 'CC-074', { alvo: 1 }).ok).toBe(true)
  })

  it.each([
    ['CC-077', 400],
    ['CC-083', 300],
  ])('%s soma %i em qualquer unidade aliada, de qualquer grupo', (id, m) => {
    const e = ok(jogar(cenario({ humano: { mao: [id], campo: ['CC-047', 'CC-018'] } }), 'humano', id, { alvo: 1 }))
    expect(atk(e, 'humano', 1)).toBe(1700 + m)
    expect(def(e, 'humano', 1)).toBe(1500 + m)
    expect(atk(e, 'humano', 0)).toBe(1800)
  })

  it('buff_unidade não pode mirar unidade inimiga', () => {
    const e = cenario({ humano: { mao: ['CC-077'], campo: ['CC-018'] }, oponente: { campo: [null, 'CC-001'] } })
    expect(jogar(e, 'humano', 'CC-077', { alvo: 1 }).ok).toBe(false) // zona 1 só existe do lado inimigo
  })

  it('buffs são persistentes: sobrevivem aos turnos enquanto a unidade estiver em campo', () => {
    let e = cenario({ humano: { mao: ['CC-074'], campo: ['CC-001'], baralho: 20 }, oponente: { mao: ['CC-002'], baralho: 20 } })
    e = ok(jogar(e, 'humano', 'CC-074', { alvo: 0 }))
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    e = ok(jogar(e, 'oponente', 'CC-002'))
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.ativo).toBe('humano')
    expect(e.turno).toBe(5)
    expect(atk(e, 'humano', 0)).toBe(1700)
    expect(def(e, 'humano', 0)).toBe(2500)
  })

  it('o buff some junto com a unidade: uma nova unidade na mesma zona não herda nada', () => {
    let e = cenarioCombate({ humano: { campo: [{ id: 'CC-001', buffAtk: 500, buffDef: 500, pos: 'ATAQUE' }] }, oponente: { campo: ['CC-056'] } })
    e = ok(atacar(e, 0, 0)) // 1700 x 2200: unidade destruída
    expect(e.jogadores.humano.campo[0]).toBeNull()
    e.fase = 'PRINCIPAL'
    e.jogadaFeita = false
    e.jogadores.humano.mao.push({ uid: 'x1', cartaId: 'CC-001' })
    const e2 = ok(aplicarComando(e, { tipo: 'jogarCarta', jogador: 'humano', uid: 'x1' }))
    expect(atk(e2, 'humano', 0)).toBe(1200)
  })
})

describe('destruir_grupo (075)', () => {
  it('destrói UMA unidade inimiga impacto, sem afetar LP, enviando-a ao descarte do dono', () => {
    const e0 = cenario({ humano: { mao: ['CC-075'] }, oponente: { campo: ['CC-047', 'CC-049'] } })
    const e = ok(jogar(e0, 'humano', 'CC-075', { alvo: 1 }))
    expect(e.jogadores.oponente.campo[1]).toBeNull()
    expect(e.jogadores.oponente.campo[0]).not.toBeNull()
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId)).toEqual(['CC-049'])
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.lp).toBe(8000)
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId)).toEqual(['CC-075'])
  })

  it('não é remoção global: unidade de outro grupo não é alvo válido; sem alvo a carta é injogável', () => {
    const e = cenario({ humano: { mao: ['CC-075'] }, oponente: { campo: ['CC-001'] } })
    expect(jogar(e, 'humano', 'CC-075', { alvo: 0 }).ok).toBe(false)
    const sem = cenario({ humano: { mao: ['CC-075'], campo: ['CC-047'] } }) // impacto só do lado do próprio jogador
    expect(jogar(sem, 'humano', 'CC-075', { alvo: 0 }).ok).toBe(false)
  })

  it('destrói também o equipamento da unidade alvo', () => {
    const e0 = cenario({ humano: { mao: ['CC-075'] }, oponente: { campo: [{ id: 'CC-047', equip: 'CC-088' }] } })
    expect(e0.jogadores.oponente.suporte[0]?.cartaId).toBe('CC-088')
    const e = ok(jogar(e0, 'humano', 'CC-075', { alvo: 0 }))
    expect(e.jogadores.oponente.suporte[0]).toBeNull()
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId).sort()).toEqual(['CC-047', 'CC-088'])
    expect(invariantes(e)).toEqual([])
  })
})

describe('cura (079, 080)', () => {
  it.each([
    ['CC-079', 500],
    ['CC-080', 700],
  ])('%s cura %i LP do controlador', (id, v) => {
    const e = ok(jogar(cenario({ humano: { mao: [id], lp: 5000 } }), 'humano', id))
    expect(e.jogadores.humano.lp).toBe(5000 + v)
    expect(e.jogadores.oponente.lp).toBe(8000)
    expect(e.jogadores.humano.descarte).toHaveLength(1)
  })

  it('nunca ultrapassa 8000 (cura parcial permitida)', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-080'], lp: 7800 } }), 'humano', 'CC-080'))
    expect(e.jogadores.humano.lp).toBe(8000)
    const e2 = ok(jogar(cenario({ humano: { mao: ['CC-080'], lp: 7999 } }), 'humano', 'CC-080'))
    expect(e2.jogadores.humano.lp).toBe(8000)
  })

  it('com LP já em 8000 a cura não pode ser jogada', () => {
    const r = jogar(cenario({ humano: { mao: ['CC-079'], lp: 8000 } }), 'humano', 'CC-079')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('máximo')
  })
})

describe('revelar (082)', () => {
  it('revela as armadilhas do oponente ao jogador até o fim do turno, sem desarmá-las', () => {
    const base = cenario({ humano: { mao: ['CC-082'] }, oponente: { suporte: ['CC-093', null, 'CC-095'] } })
    const antes = visaoParaJogador(base, 'humano')
    expect(antes.oponente.suporte[0]).toEqual({ oculta: true })
    const e = ok(jogar(base, 'humano', 'CC-082'))
    expect(e.revelacao).toBe('humano')
    const v = visaoParaJogador(e, 'humano')
    expect(v.armadilhasReveladas).toBe(true)
    expect(v.oponente.suporte[0]).toMatchObject({ oculta: false, cartaId: 'CC-093' })
    expect(v.oponente.suporte[2]).toMatchObject({ oculta: false, cartaId: 'CC-095' })
    expect(e.jogadores.oponente.suporte.filter(Boolean)).toHaveLength(2) // não desarma
    expect(e.log.some((x) => x.tipo === 'armadilhas_reveladas')).toBe(true)
    // o oponente não ganha informação
    expect(visaoParaJogador(e, 'oponente').armadilhasReveladas).toBe(false)
  })

  it('a revelação termina no fim do turno atual', () => {
    let e = cenario({ humano: { mao: ['CC-082'], baralho: 20 }, oponente: { suporte: ['CC-093'], mao: ['CC-001'], baralho: 20 } })
    e = ok(jogar(e, 'humano', 'CC-082'))
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    expect(e.revelacao).toBeNull()
    expect(visaoParaJogador(e, 'humano').oponente.suporte[0]).toEqual({ oculta: true })
  })

  it('é jogável mesmo sem armadilhas no campo adversário (não vira descarte forçado)', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-082'] } }), 'humano', 'CC-082'))
    expect(e.log.at(-1)?.texto).toContain('não tem armadilhas')
  })
})

describe('equipamentos (085, 086, 087, 088)', () => {
  it.each([
    ['CC-085', 'CC-001', 'def', 500],
    ['CC-086', 'CC-031', 'atk', 500],
    ['CC-087', 'CC-031', 'def', 400],
    ['CC-088', 'CC-047', 'def', 300],
  ] as const)('%s em %s: +%i só em %s, na zona de suporte, vinculado', (id, alvoId, attr, m) => {
    const e0 = cenario({ humano: { mao: [id], campo: [alvoId] } })
    const base = CATALOGO.find((c) => c.id === alvoId)!
    const e = ok(jogar(e0, 'humano', id, { alvo: 0 }))
    expect(atk(e, 'humano', 0)).toBe((base.atk ?? 0) + (attr === 'atk' ? m : 0))
    expect(def(e, 'humano', 0)).toBe((base.defesa ?? 0) + (attr === 'def' ? m : 0))
    expect(e.jogadores.humano.suporte[0]).toMatchObject({ cartaId: id, tipo: 'equipamento', vinculadaA: e.jogadores.humano.campo[0]!.uid })
    expect(e.jogadores.humano.campo[0]?.equipamentoUid).toBe(e.jogadores.humano.suporte[0]?.uid)
    expect(e.jogadores.humano.descarte).toHaveLength(0)
    expect(invariantes(e)).toEqual([])
  })

  it('só uma unidade aliada do grupo exigido (ou qualquer, para CC-088)', () => {
    const e = cenario({ humano: { mao: ['CC-085', 'CC-088'], campo: ['CC-018', 'CC-001'] }, oponente: { campo: ['CC-001'] } })
    expect(jogar(e, 'humano', 'CC-085', { alvo: 0 }).ok).toBe(false) // fauna
    expect(jogar(e, 'humano', 'CC-085', { alvo: 1 }).ok).toBe(true)
    expect(jogar(e, 'humano', 'CC-088', { alvo: 0 }).ok).toBe(true)
  })

  it('limite de 1 equipamento por unidade: unidade equipada deixa de ser alvo', () => {
    const e = cenario({ humano: { mao: ['CC-088'], campo: [{ id: 'CC-018', equip: 'CC-088' }, 'CC-001'] } })
    expect(jogar(e, 'humano', 'CC-088', { alvo: 0 }).ok).toBe(false)
    expect(jogar(e, 'humano', 'CC-088', { alvo: 1 }).ok).toBe(true)
    const so = cenario({ humano: { mao: ['CC-088'], campo: [{ id: 'CC-018', equip: 'CC-088' }] } })
    const r = jogar(so, 'humano', 'CC-088', { alvo: 0 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('alvo válido')
  })

  it('sem unidade aliada, ou sem zona de suporte livre, o equipamento não pode ser jogado', () => {
    expect(jogar(cenario({ humano: { mao: ['CC-088'] } }), 'humano', 'CC-088', { alvo: 0 }).ok).toBe(false)
    const cheio = cenario({ humano: { mao: ['CC-088'], campo: ['CC-001'], suporte: ['CC-093', 'CC-094', 'CC-095', 'CC-096', 'CC-099'] } })
    expect(jogar(cheio, 'humano', 'CC-088', { alvo: 0 }).ok).toBe(false)
  })

  it('escolha explícita de zona de suporte e rejeição de zona ocupada', () => {
    const e0 = cenario({ humano: { mao: ['CC-088'], campo: ['CC-001'], suporte: ['CC-093'] } })
    expect(jogar(e0, 'humano', 'CC-088', { alvo: 0, zona: 0 }).ok).toBe(false)
    const e = ok(jogar(e0, 'humano', 'CC-088', { alvo: 0, zona: 4 }))
    expect(e.jogadores.humano.suporte[4]?.cartaId).toBe('CC-088')
  })

  it('o equipamento sai junto com a unidade destruída em combate (ambos ao descarte, zona de suporte liberada)', () => {
    let e = cenarioCombate({ humano: { campo: [{ id: 'CC-001', equip: 'CC-085' }] }, oponente: { campo: ['CC-056'] } })
    e = ok(atacar(e, 0, 0)) // 1200 x 2200
    expect(e.jogadores.humano.campo[0]).toBeNull()
    expect(e.jogadores.humano.suporte[0]).toBeNull()
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId).sort()).toEqual(['CC-001', 'CC-085'])
    expect(invariantes(e)).toEqual([])
  })

  it('equipamento de ATK/DEF altera o resultado do combate', () => {
    // CC-001 1200 + CC-086? (atividade). Usa CC-088 (+300 DEF): DEF 2000 -> 2300 contra ATK 2200 não destrói
    const e = ok(atacar(cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-056'] }, humano: { campo: [{ id: 'CC-001', pos: 'DEFESA', equip: 'CC-088' }] } }), 0, 0))
    expect(e.jogadores.humano.campo[0]).not.toBeNull()
    expect(e.jogadores.oponente.campo[0]).not.toBeNull() // 2200 < 2300: ninguém é destruído
    expect(e.jogadores.oponente.lp).toBe(7900) // o atacante sofre 100 de dano
    expect(e.jogadores.humano.lp).toBe(8000)
  })
})

describe('terrenos (089, 090, 091, 092)', () => {
  it.each([
    ['CC-089', 'ecossistema', 'CC-001', 'CC-018'],
    ['CC-090', 'atividade', 'CC-031', 'CC-001'],
    ['CC-091', 'fauna', 'CC-018', 'CC-001'],
    ['CC-092', 'impacto', 'CC-047', 'CC-001'],
  ] as const)('%s: +300 ATK e DEF às unidades de %s dos DOIS lados e a nenhuma de outros grupos', (id, _grupo, doGrupo, outro) => {
    const e0 = cenario({ humano: { mao: [id], campo: [doGrupo, outro] }, oponente: { campo: [doGrupo, outro] } })
    const a = CATALOGO.find((c) => c.id === doGrupo)!
    const b = CATALOGO.find((c) => c.id === outro)!
    const e = ok(jogar(e0, 'humano', id))
    expect(e.terreno).toMatchObject({ cartaId: id, dono: 'humano' })
    for (const j of ['humano', 'oponente'] as const) {
      expect(atk(e, j, 0)).toBe((a.atk ?? 0) + 300)
      expect(def(e, j, 0)).toBe((a.defesa ?? 0) + 300)
      expect(atk(e, j, 1)).toBe(b.atk)
      expect(def(e, j, 1)).toBe(b.defesa)
    }
    // não ocupa zona de suporte nem vai ao descarte enquanto ativo
    expect(e.jogadores.humano.suporte.every((s) => s === null)).toBe(true)
    expect(e.jogadores.humano.descarte).toHaveLength(0)
    expect(invariantes(e)).toEqual([])
  })

  it('novo terreno substitui o anterior imediatamente; o antigo vai ao descarte do seu dono', () => {
    const e0 = cenario({ humano: { mao: ['CC-091'], campo: ['CC-001', 'CC-018'] }, oponente: { descarte: [] }, terreno: { id: 'CC-089', dono: 'oponente' } })
    expect(atk(e0, 'humano', 0)).toBe(1500)
    const e = ok(jogar(e0, 'humano', 'CC-091'))
    expect(e.terreno).toMatchObject({ cartaId: 'CC-091', dono: 'humano' })
    expect(e.jogadores.oponente.descarte.map((c) => c.cartaId)).toEqual(['CC-089'])
    expect(atk(e, 'humano', 0)).toBe(1200) // bônus antigo removido
    expect(atk(e, 'humano', 1)).toBe(2000) // fauna recebe o novo
    expect(invariantes(e)).toEqual([])
  })

  it('substituir pelo mesmo terreno não duplica cartas', () => {
    const e0 = cenario({ humano: { mao: ['CC-089'] }, terreno: { id: 'CC-089', dono: 'humano' } })
    const e = ok(jogar(e0, 'humano', 'CC-089'))
    expect(e.jogadores.humano.descarte).toHaveLength(1)
    expect(invariantes(e)).toEqual([])
  })

  it('terreno joga mesmo sem unidades em campo; só uma jogada por turno', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-089', 'CC-090'] } }), 'humano', 'CC-089'))
    expect(jogar(e, 'humano', 'CC-090').ok).toBe(false)
  })
})

describe('cobertura: todas as 20 ações do catálogo são jogáveis com alvo válido', () => {
  const acoes = CATALOGO.filter((c) => c.tipo === 'acao')
  const campoCompleto = ['CC-047', 'CC-001', 'CC-031', 'CC-018']
  it.each(acoes.map((c) => [c.id, c.efeito!.operacao] as const))('%s (%s)', (id) => {
    const carta = CATALOGO.find((c) => c.id === id)!
    const op = carta.efeito!.operacao
    const ehInimigo = op === 'debuff_grupo' || op === 'destruir_grupo'
    const e0 = cenario({ humano: { mao: [id], campo: campoCompleto, lp: 4000 }, oponente: { campo: campoCompleto } })
    const precisaAlvo = ['debuff_grupo', 'destruir_grupo', 'buff_grupo', 'buff_unidade', 'equip_buff_atk', 'equip_buff_def'].includes(op)
    let alvo: number | undefined
    if (precisaAlvo) {
      const dono = ehInimigo ? 'oponente' : 'humano'
      alvo = e0.jogadores[dono].campo.findIndex((u) => u && (carta.efeito!.alvo === 'qualquer' || cat.get(u.cartaId)?.grupo === carta.efeito!.alvo))
      expect(alvo).toBeGreaterThanOrEqual(0)
    }
    const e = ok(jogar(e0, 'humano', id, alvo === undefined ? {} : { alvo }))
    expect(e.jogadaFeita).toBe(true)
    expect(e.jogadores.humano.mao).toHaveLength(0)
    expect(invariantes(e)).toEqual([])
  })

  it('o catálogo tem exatamente 20 ações e todas usam operações conhecidas', () => {
    expect(acoes).toHaveLength(20)
    const ops = new Set(acoes.map((c) => c.efeito!.operacao))
    expect([...ops].sort()).toEqual(['buff_grupo', 'buff_unidade', 'cura', 'debuff_grupo', 'destruir_grupo', 'equip_buff_atk', 'equip_buff_def', 'field_bonus', 'revelar'])
  })
})

describe('ações sem alvo válido não podem ser jogadas', () => {
  it.each([
    ['CC-073', {}], // debuff sem impacto inimigo
    ['CC-074', {}], // buff eco sem unidade aliada eco
    ['CC-075', {}],
    ['CC-077', {}], // buff_unidade sem nenhuma unidade aliada
    ['CC-085', {}],
    ['CC-088', {}],
  ])('%s sem alvo', (id) => {
    const e = cenario({ humano: { mao: [id, 'CC-001'] }, oponente: { campo: ['CC-001'] } })
    const r = jogar(e, 'humano', id, { alvo: 0 })
    expect(r.ok).toBe(false)
    // jogada ilegal não consome a jogada nem altera o estado
    expect(r.estado).toBe(e)
  })
})
