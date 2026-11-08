import { describe, expect, it } from 'vitest'
import { alvosAtaqueLegais, aplicarComando, atacantesDisponiveis, ataquesLegais, jogadasLegais, simularAtaque } from '../acoes'
import type { Comando } from '../acoes'
import { executarTurnoIA } from '../duelo'
import { invariantes } from '../estado'
import { atacar, cenario, cenarioCombate, irParaCombate, jogar, ok, uidDe } from './util'

describe('jogar carta: regras de fase, turno e uma jogada por turno', () => {
  it('invoca unidade na primeira zona livre, em ATAQUE por padrão, e marca a jogada feita', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-101', 'CC-102'] } }), 'humano', 'CC-101'))
    const u = e.jogadores.humano.campo[0]!
    expect(u.cartaId).toBe('CC-101')
    expect(u.posicao).toBe('ATAQUE')
    expect(u.atacou).toBe(false)
    expect(u.invocadaNoTurno).toBe(3)
    expect(e.jogadaFeita).toBe(true)
    expect(e.jogadores.humano.mao).toHaveLength(1)
  })

  it('respeita a zona escolhida pelo jogador e a posição pedida', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-101'] } }), 'humano', 'CC-101', { zona: 3, posicao: 'DEFESA' }))
    expect(e.jogadores.humano.campo[3]?.cartaId).toBe('CC-101')
    expect(e.jogadores.humano.campo[3]?.posicao).toBe('DEFESA')
    expect(e.jogadores.humano.campo[0]).toBeNull()
  })

  it('permite unidade virada para baixo tanto em ATAQUE quanto em DEFESA', () => {
    const atk = ok(jogar(cenario({ humano: { mao: ['CC-101'] } }), 'humano', 'CC-101', { posicao: 'ATAQUE', viradaParaBaixo: true }))
    expect(atk.jogadores.humano.campo[0]).toMatchObject({ posicao: 'ATAQUE', viradaParaBaixo: true })
    const def = ok(jogar(cenario({ humano: { mao: ['CC-101'] } }), 'humano', 'CC-101', { posicao: 'DEFESA', viradaParaBaixo: true }))
    expect(def.jogadores.humano.campo[0]).toMatchObject({ posicao: 'DEFESA', viradaParaBaixo: true })
  })

  it('rejeita zona ocupada, zona inválida e posição inválida', () => {
    const base = cenario({ humano: { mao: ['CC-101'], campo: ['CC-102'] } })
    expect(jogar(base, 'humano', 'CC-101', { zona: 0 }).ok).toBe(false)
    expect(jogar(base, 'humano', 'CC-101', { zona: 5 }).ok).toBe(false)
    expect(jogar(base, 'humano', 'CC-101', { zona: -1 }).ok).toBe(false)
    expect(jogar(base, 'humano', 'CC-101', { zona: 1.5 }).ok).toBe(false)
    // @ts-expect-error posição inválida de propósito
    expect(jogar(base, 'humano', 'CC-101', { posicao: 'X' }).ok).toBe(false)
  })

  it('uma única jogada da mão por turno', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-101', 'CC-102'] } }), 'humano', 'CC-101'))
    const r = jogar(e, 'humano', 'CC-102')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('jogada da mão')
  })

  it('só joga no seu turno e na fase principal', () => {
    const e = cenario({ humano: { mao: ['CC-101', 'CC-103'] }, oponente: { mao: ['CC-102'] } })
    expect(jogar(e, 'oponente', 'CC-102').ok).toBe(false)
    expect(jogar(irParaCombate(ok(jogar(e, 'humano', 'CC-101'))), 'humano', 'CC-103').ok).toBe(false)
    const comb = cenarioCombate({ humano: { mao: ['CC-101'] }, jogadaFeita: false })
    expect(jogar(comb, 'humano', 'CC-101').ok).toBe(false)
  })

  it('rejeita carta que não está na mão', () => {
    const e = cenario({ humano: { mao: ['CC-101'] } })
    const r = aplicarComando(e, { tipo: 'jogarCarta', jogador: 'humano', uid: 'inexistente' })
    expect(r.ok).toBe(false)
    // carta do adversário não pode ser usada
    const o = cenario({ humano: { mao: ['CC-101'] }, oponente: { mao: ['CC-102'] } })
    expect(aplicarComando(o, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(o, 'oponente', 'CC-102') }).ok).toBe(false)
  })

  it('campo cheio: unidade não pode ser jogada', () => {
    const e = cenario({ humano: { mao: ['CC-101', 'CC-112'], campo: ['CC-102', 'CC-104', 'CC-105', 'CC-106', 'CC-109'] } })
    const r = jogar(e, 'humano', 'CC-101')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('zona de unidade livre')
  })
})

describe('campo cheio: substituição de unidade', () => {
  const cheio = ['CC-102', 'CC-104', 'CC-105', 'CC-106', 'CC-109']
  it('com o campo cheio, a zona ocupada escolhida é substituída: a antiga vai ao descarte e o total de cartas se conserva', () => {
    const e0 = cenario({ humano: { mao: ['CC-101'], campo: cheio } })
    const e = ok(aplicarComando(e0, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e0, 'humano', 'CC-101'), zona: 2 }))
    expect(e.jogadores.humano.campo[2]?.cartaId).toBe('CC-101')
    expect(e.jogadores.humano.descarte.map((c) => c.cartaId)).toEqual(['CC-105'])
    expect(e.log.some((x) => x.tipo === 'unidade_substituida' && x.zona === 2)).toBe(true)
    expect(invariantes(e)).toEqual([])
  })

  it('com zona livre, escolher uma zona ocupada continua recusado', () => {
    const e0 = cenario({ humano: { mao: ['CC-101'], campo: ['CC-102'] } })
    const r = aplicarComando(e0, { tipo: 'jogarCarta', jogador: 'humano', uid: uidDe(e0, 'humano', 'CC-101'), zona: 0 })
    expect(r.ok).toBe(false)
  })
})

describe('descarte forçado', () => {
  it('com jogada legal disponível o descarte é livre (lixeira): não gasta a jogada da mão e a mão é reposta no próximo turno', () => {
    const e = cenario({ humano: { mao: ['CC-101', 'CC-102'] }, oponente: { mao: [] } })
    const r = ok(aplicarComando(e, { tipo: 'descartar', jogador: 'humano', uid: uidDe(e, 'humano', 'CC-102') }))
    expect(r.jogadaFeita).toBe(false)
    expect(r.jogadores.humano.mao).toHaveLength(1)
    expect(r.jogadores.humano.descarte).toHaveLength(1)
    expect(r.log.at(-1)?.tipo).toBe('descarte_livre')
    // pode continuar jogando normalmente e descartar de novo
    expect(jogadasLegais(r).some((c) => c.tipo === 'jogarCarta')).toBe(true)
    const r2 = ok(aplicarComando(r, { tipo: 'descartar', jogador: 'humano', uid: r.jogadores.humano.mao[0]!.uid }))
    expect(r2.jogadores.humano.mao).toHaveLength(0)
    expect(r2.jogadores.humano.descarte).toHaveLength(2)
    // no início do próximo turno do jogador a mão volta a 5
    const volta = ok(executarTurnoIA(ok(aplicarComando(r2, { tipo: 'encerrarTurno', jogador: 'humano' }))))
    expect(volta.jogadores.humano.mao).toHaveLength(5)
  })

  it('descarte livre só vale na fase principal do próprio turno, com carta da própria mão', () => {
    const e = cenario({ humano: { mao: ['CC-101'] } })
    expect(aplicarComando(e, { tipo: 'descartar', jogador: 'oponente', uid: 'x' }).ok).toBe(false)
    expect(aplicarComando(e, { tipo: 'descartar', jogador: 'humano', uid: 'inexistente' }).ok).toBe(false)
    expect(aplicarComando({ ...e, fase: 'COMBATE' }, { tipo: 'descartar', jogador: 'humano', uid: uidDe(e, 'humano', 'CC-101') }).ok).toBe(false)
  })

  it('campo cheio + só unidades na mão: descarte é a jogada (e a única opção listada)', () => {
    const e = cenario({ humano: { mao: ['CC-101', 'CC-103'], campo: ['CC-102', 'CC-104', 'CC-105', 'CC-106', 'CC-109'] } })
    const legais = jogadasLegais(e)
    expect(legais.length).toBe(2)
    expect(legais.every((c) => c.tipo === 'descartar')).toBe(true)
    const e2 = ok(aplicarComando(e, legais[0] as Comando))
    expect(e2.jogadaFeita).toBe(true)
    expect(e2.jogadores.humano.mao).toHaveLength(1)
    expect(e2.jogadores.humano.descarte).toHaveLength(1)
    expect(e2.log.at(-1)?.tipo).toBe('descarte_forcado')
    // depois do descarte forçado, não há mais jogadas; a lixeira continua aceitando descartes livres
    expect(jogadasLegais(e2)).toEqual([])
    expect(aplicarComando(e2, { tipo: 'descartar', jogador: 'humano', uid: e2.jogadores.humano.mao[0]!.uid }).ok).toBe(true)
  })

  it('mão vazia (estado atípico) não trava: pode avançar e encerrar sem jogada', () => {
    const e = cenario({ humano: { mao: [] }, oponente: { mao: ['CC-101'] } })
    expect(jogadasLegais(e)).toEqual([])
    expect(ok(aplicarComando(e, { tipo: 'avancarFase', jogador: 'humano' })).fase).toBe('COMBATE')
  })

  it('não é possível avançar de fase nem encerrar sem ter feito a jogada da mão', () => {
    const e = cenario({ humano: { mao: ['CC-101'] } })
    expect(aplicarComando(e, { tipo: 'avancarFase', jogador: 'humano' }).ok).toBe(false)
    expect(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }).ok).toBe(false)
  })
})

describe('posições', () => {
  it('muda livremente entre ATAQUE e DEFESA antes de atacar (também logo após invocar)', () => {
    let e = ok(jogar(cenario({ humano: { mao: ['CC-101'] } }), 'humano', 'CC-101'))
    e = ok(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 0, posicao: 'DEFESA' }))
    expect(e.jogadores.humano.campo[0]?.posicao).toBe('DEFESA')
    e = ok(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 0, posicao: 'ATAQUE' }))
    expect(e.jogadores.humano.campo[0]?.posicao).toBe('ATAQUE')
  })

  it('rejeita posição igual, zona vazia/inválida e posição inválida', () => {
    const e = cenario({ humano: { campo: ['CC-101'] } })
    expect(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 0, posicao: 'ATAQUE' }).ok).toBe(false)
    expect(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 1, posicao: 'DEFESA' }).ok).toBe(false)
    expect(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 9, posicao: 'DEFESA' }).ok).toBe(false)
    // @ts-expect-error posição inválida de propósito
    expect(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 0, posicao: 'X' }).ok).toBe(false)
  })

  it('unidade que atacou não pode mudar de posição até o próximo turno', () => {
    let e = cenarioCombate({ humano: { campo: ['CC-103'] }, oponente: { campo: ['CC-104'] } })
    e = ok(atacar(e, 0, 0))
    const r = aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 0, posicao: 'DEFESA' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('já atacou')
  })

  it('só o dono da vez muda posições; também funciona na fase de combate', () => {
    const e = cenarioCombate({ humano: { campo: ['CC-101'] }, oponente: { campo: ['CC-104'] } })
    expect(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'oponente', zona: 0, posicao: 'DEFESA' }).ok).toBe(false)
    expect(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 0, posicao: 'DEFESA' }).ok).toBe(true)
  })

  it('unidade em DEFESA não ataca; voltando a ATAQUE ela ataca no mesmo turno', () => {
    let e = cenarioCombate({ humano: { campo: [{ id: 'CC-103', pos: 'DEFESA' }] }, oponente: { campo: ['CC-104'] } })
    expect(atacar(e, 0, 0).ok).toBe(false)
    e = ok(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: 0, posicao: 'ATAQUE' }))
    expect(atacar(e, 0, 0).ok).toBe(true)
  })

  it('reinicia as flags de ataque no início do turno do controlador, liberando posição e novo ataque', () => {
    let e = cenarioCombate({ turno: 3, humano: { campo: ['CC-103'], baralho: 20, mao: ['CC-101'] }, oponente: { campo: [{ id: 'CC-104', pos: 'DEFESA' }], baralho: 20, mao: ['CC-102'] } })
    e = ok(atacar(e, 0, 0)) // 1600 vs DEF 2000: sem destruir, dano 400 ao atacante
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(true)
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    e = ok(jogar(e, 'oponente', 'CC-102'))
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'oponente' }))
    expect(e.ativo).toBe('humano')
    expect(e.jogadores.humano.campo[0]?.atacou).toBe(false)
  })
})

describe('validação no motor (não só na interface)', () => {
  it('rejeita jogador errado, comando desconhecido e campos inválidos sem alterar o estado', () => {
    const e = cenario({ humano: { mao: ['CC-101'] }, oponente: { mao: ['CC-102'] } })
    const antes = JSON.stringify(e)
    const ruins = [
      { tipo: 'encerrarTurno', jogador: 'oponente' },
      { tipo: 'avancarFase', jogador: 'oponente' },
      { tipo: 'nada', jogador: 'humano' },
      { tipo: 'jogarCarta', jogador: 'terceiro', uid: 'x' },
      { tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 0 },
      {},
    ] as unknown as Comando[]
    for (const c of ruins) {
      const r = aplicarComando(e, c)
      expect(r.ok).toBe(false)
      expect(r.estado).toBe(e) // mesmo objeto
      if (!r.ok) expect(r.erro.length).toBeGreaterThan(3)
    }
    expect(JSON.stringify(e)).toBe(antes)
  })

  it('comandos válidos não mutam o estado de entrada (imutabilidade)', () => {
    const e = cenario({ humano: { mao: ['CC-101', 'CC-114'], campo: ['CC-102'] }, oponente: { campo: ['CC-104'] } })
    const antes = JSON.stringify(e)
    const r = ok(jogar(e, 'humano', 'CC-101'))
    expect(JSON.stringify(e)).toBe(antes)
    expect(r).not.toBe(e)
    expect(r.jogadores.humano.campo).not.toBe(e.jogadores.humano.campo)
    const congelado = structuredClone(e)
    deepFreeze(congelado)
    expect(() => jogar(congelado, 'humano', 'CC-101')).not.toThrow()
  })

  it('o log cresce somente no estado novo e preserva o anterior', () => {
    const e = cenario({ humano: { mao: ['CC-101'] } })
    const r = ok(jogar(e, 'humano', 'CC-101'))
    expect(e.log).toHaveLength(0)
    expect(r.log.length).toBeGreaterThan(0)
    expect(r.log.every((x) => typeof x.texto === 'string' && x.texto.length > 0 && x.turno === 3)).toBe(true)
  })

  it('estado resultante mantém invariantes e é serializável', () => {
    const e = ok(jogar(cenario({ humano: { mao: ['CC-101'] } }), 'humano', 'CC-101'))
    expect(invariantes(e)).toEqual([])
    expect(JSON.parse(JSON.stringify(e))).toEqual(e)
  })
})

describe('listagens de jogadas legais', () => {
  it('jogadasLegais lista unidades nas duas posições e duas faces', () => {
    const e = cenario({ humano: { mao: ['CC-101', 'CC-103'], campo: ['CC-102', 'CC-104'] } })
    const legais = jogadasLegais(e)
    expect(legais.filter((c) => c.tipo === 'jogarCarta' && c.uid === uidDe(e, 'humano', 'CC-101'))).toHaveLength(4)
    expect(legais.filter((c) => c.tipo === 'jogarCarta' && c.uid === uidDe(e, 'humano', 'CC-103'))).toHaveLength(4)
    for (const c of legais) expect(aplicarComando(e, c).ok).toBe(true)
  })

  it('ataquesLegais: direto só sem unidades inimigas; senão cada alvo; nenhum na fase errada ou no turno 1', () => {
    const e = cenarioCombate({ humano: { campo: ['CC-103', { id: 'CC-101', pos: 'DEFESA' }] }, oponente: { campo: ['CC-104', null, 'CC-105'] } })
    const a = ataquesLegais(e)
    expect(a).toHaveLength(2)
    expect(a.map((x) => x.alvo).sort()).toEqual([0, 2])
    const d = cenarioCombate({ humano: { campo: ['CC-103'] } })
    expect(ataquesLegais(d)).toEqual([{ tipo: 'atacar', jogador: 'humano', atacante: 0, alvo: 'direto' }])
    expect(ataquesLegais(cenarioCombate({ turno: 1, humano: { campo: ['CC-103'] } }))).toEqual([])
    expect(ataquesLegais(cenario({ humano: { campo: ['CC-103'] } }))).toEqual([])
  })

  it('alvos e atacantes usam a mesma legalidade; simulação é idêntica à execução e não muta a entrada', () => {
    const e = cenarioCombate({ humano: { campo: ['CC-103', { id: 'CC-101', pos: 'DEFESA' }] }, oponente: { campo: ['CC-101', null, 'CC-104'] } })
    expect(atacantesDisponiveis(e)).toEqual([0])
    expect(alvosAtaqueLegais(e, 0).map((c) => c.alvo)).toEqual([0, 2])
    expect(alvosAtaqueLegais(e, 1)).toEqual([])
    const antes = JSON.stringify(e)
    const cmd = alvosAtaqueLegais(e, 0)[0]!
    const simulado = simularAtaque(e, cmd)
    const executado = aplicarComando(e, cmd)
    expect(simulado).toEqual(executado)
    expect(JSON.stringify(e)).toBe(antes)
  })
})

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.freeze(o)
    for (const v of Object.values(o)) deepFreeze(v)
  }
  return o
}
