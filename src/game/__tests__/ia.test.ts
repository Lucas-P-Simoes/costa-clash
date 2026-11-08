import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { aplicarComando } from '../acoes'
import type { Comando } from '../acoes'
import { criarDuelo, executarTurnoIA } from '../duelo'

import type { EstadoDuelo } from '../estado'
import { avaliarAtaque, decidirComando, escolherMelhorAtaque } from '../ia'
import { estadoDeVisao, visaoParaJogador } from '../visao'
import { cenario, cenarioCombate, ok, uidDe } from './util'

const decide = (e: EstadoDuelo, j: 'humano' | 'oponente' = 'oponente'): Comando => decidirComando(visaoParaJogador(e, j))

function novoDuelo(seed = 1): EstadoDuelo {
  const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: BARALHOS_OPONENTES['ressaca'] as string[], seed })
  if (!r.ok) throw new Error(r.erros.join(';'))
  return r.estado
}

describe('visão parcial: não vaza informação oculta', () => {
  it('a visão do oponente não contém mão, baralho nem uids/cartas do humano', () => {
    const e = novoDuelo(4)
    const v = visaoParaJogador(e, 'oponente')
    expect(Object.keys(v.oponente).sort()).toEqual(['baralhoTamanho', 'campo', 'descarte', 'id', 'lp', 'maoTamanho'])
    expect(Object.keys(v.eu).sort()).toEqual(['baralhoTamanho', 'campo', 'descarte', 'id', 'lp', 'mao'])
    expect(v.oponente.maoTamanho).toBe(5)
    expect(v.oponente.baralhoTamanho).toBe(25)
    const json = JSON.stringify(v)
    for (const c of [...e.jogadores.humano.mao, ...e.jogadores.humano.baralho]) expect(json).not.toContain(`"${c.uid}"`)
    expect(json).not.toMatch(/"uid":"h\d+"/)
    expect(json).not.toContain('"log"')
    // nem a ordem do próprio baralho é exposta
    for (const c of e.jogadores.oponente.baralho) expect(json).not.toContain(`"${c.uid}"`)
  })

  it('unidade virada para baixo aparece sem identidade, uid, arte lógica, ATK, DEF ou buffs', () => {
    const e = cenario({ humano: { campo: [{ id: 'CC-156', pos: 'ATAQUE', viradaParaBaixo: true, buffAtk: 900, buffDef: 700 }] }, ativo: 'oponente' })
    const v = visaoParaJogador(e, 'oponente')
    expect(v.oponente.campo[0]).toEqual({ oculta: true, posicao: 'ATAQUE', atacou: false })
    const json = JSON.stringify(v.oponente.campo[0])
    expect(json).not.toMatch(/CC-156|cartaId|uid|buff|atk|def/i)
    expect(visaoParaJogador(e, 'humano').eu.campo[0]).toMatchObject({ cartaId: 'CC-156', viradaParaBaixo: true })
  })

  it('o estado reconstruído para planejamento só tem marcadores no lugar do oculto', () => {
    const e = novoDuelo(2)
    const r = estadoDeVisao(visaoParaJogador(e, 'oponente'))
    expect(r.jogadores.humano.mao.every((c) => c.cartaId === '?')).toBe(true)
    expect(r.jogadores.humano.baralho.every((c) => c.cartaId === '?')).toBe(true)
    expect(r.jogadores.oponente.mao.map((c) => c.cartaId).sort()).toEqual(e.jogadores.oponente.mao.map((c) => c.cartaId).sort())
  })

  it('a decisão da IA é idêntica quando só muda a informação oculta do humano (mão e baralho)', () => {
    const mk = (maoH: string[]) =>
      cenario({
        ativo: 'oponente',
        oponente: { mao: ['CC-103', 'CC-101', 'CC-114', 'CC-113', 'CC-121'], campo: ['CC-107'] },
        humano: { mao: maoH, campo: ['CC-147'] },
      })
    const a = mk(['CC-101', 'CC-102', 'CC-104', 'CC-105', 'CC-106'])
    const b = mk(['CC-115', 'CC-116', 'CC-122', 'CC-156', 'CC-169'])
    // embaralha também o baralho do humano em um deles
    b.jogadores.humano.baralho.reverse()
    b.jogadores.humano.baralho.forEach((c, i) => (c.cartaId = i % 2 ? 'CC-120' : 'CC-125'))
    expect(JSON.stringify(visaoParaJogador(a, 'oponente'))).not.toBe('')
    const va = visaoParaJogador(a, 'oponente')
    const vb = visaoParaJogador(b, 'oponente')
    // as visões do que importa são iguais (uids do humano na mão não aparecem na visão)
    expect(JSON.stringify(va)).toBe(JSON.stringify(vb))
    expect(decidirComando(va)).toEqual(decidirComando(vb))
    // turno inteiro: o lado do oponente termina no mesmo estado
    const ra = executarTurnoIA(a)
    const rb = executarTurnoIA(b)
    expect(ra.ok && rb.ok).toBe(true)
    if (ra.ok && rb.ok) {
      expect(JSON.stringify(ra.estado.jogadores.oponente)).toBe(JSON.stringify(rb.estado.jogadores.oponente))
      expect(ra.estado.jogadores.humano.campo).toEqual(rb.estado.jogadores.humano.campo)
    }
  })
})

describe('escolha da jogada (§9)', () => {
  it('1º: unidade capaz de vencer combate (e a coloca em ATAQUE quando há vantagem)', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-101', 'CC-147', 'CC-114', 'CC-121'] }, humano: { campo: ['CC-107'] } })
    const c = decide(e)
    expect(c).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-101'), posicao: 'ATAQUE', viradaParaBaixo: false }) // 2500 > 1700
  })

  it('entre as que vencem, a de maior ATK; empate total por ID/uid crescente', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-101', 'CC-103', 'CC-109'] } }) // campo adversário vazio: todas vencem
    expect(decide(e)).toMatchObject({ uid: uidDe(e, 'oponente', 'CC-101') })
    const dup = cenario({ ativo: 'oponente', oponente: { mao: ['CC-101', 'CC-101'] } })
    const uids = dup.jogadores.oponente.mao.map((c) => c.uid).sort()
    expect(decide(dup)).toMatchObject({ uid: uids[0] })
  })

  it('3º: sem vitória possível nem ação eficaz, a unidade de maior DEFESA, em DEFESA', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-113', 'CC-104'] }, humano: { campo: ['CC-156'] } })
    expect(decide(e)).toMatchObject({ uid: uidDe(e, 'oponente', 'CC-104'), posicao: 'DEFESA', viradaParaBaixo: true })
  })

  it('sem jogada legal descarta (a carta de menor utilidade; empate por ID)', () => {
    const e = cenario({
      ativo: 'oponente',
      oponente: { mao: ['CC-103', 'CC-113', 'CC-101', 'CC-107', 'CC-104'], campo: ['CC-102', 'CC-104', 'CC-105', 'CC-106', 'CC-109'] },
    })
    const c = decide(e)
    expect(c).toMatchObject({ tipo: 'descartar', uid: uidDe(e, 'oponente', 'CC-107') }) // 0+1500 é o menor
  })
})

describe('posições e ataques (§9)', () => {
  it('ajusta posições: ATAQUE se há vantagem, senão DEFESA', () => {
    const e = cenario({
      ativo: 'oponente',
      jogadaFeita: true,
      oponente: { campo: [{ id: 'CC-103', pos: 'DEFESA' }, { id: 'CC-101', pos: 'ATAQUE' }] },
      humano: { campo: ['CC-101'] },
    })
    // CC-103 (1600) vence 1200 e não é mais fraca: deve ir a ataque
    expect(decide(e)).toEqual({ tipo: 'mudarPosicao', jogador: 'oponente', zona: 0, posicao: 'ATAQUE' })
    // CC-101 (1200) empata com o atacante inimigo (não vence): vai a defesa
    const e2 = ok(aplicarComando(e, decide(e)))
    expect(decide(e2)).toEqual({ tipo: 'mudarPosicao', jogador: 'oponente', zona: 1, posicao: 'DEFESA' })
  })

  it('depois das posições avança para o combate; no turno 1 absoluto apenas encerra', () => {
    const e = cenario({ ativo: 'oponente', jogadaFeita: true, oponente: { campo: [{ id: 'CC-103', pos: 'ATAQUE' }] }, humano: { campo: ['CC-101'] } })
    expect(decide(e)).toEqual({ tipo: 'avancarFase', jogador: 'oponente' })
    const t1 = cenario({ turno: 1, jogadaFeita: true, humano: { campo: ['CC-103'] } })
    expect(decide(t1, 'humano')).toEqual({ tipo: 'encerrarTurno', jogador: 'humano' })
  })

  it('ataca diretamente quando o adversário não tem unidades', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-101', 'CC-103'] } })
    expect(decide(e)).toEqual({ tipo: 'atacar', jogador: 'oponente', atacante: 1, alvo: 'direto' }) // maior ATK primeiro
  })

  it('prioriza sequência de vitória: usa a unidade menor para abrir o campo e preserva o atacante letal', () => {
    const e = cenarioCombate({
      ativo: 'oponente',
      oponente: { campo: ['CC-143', 'CC-169'] },
      humano: { lp: 2300, campo: [{ id: 'CC-113', pos: 'DEFESA' }] },
    })
    expect(decide(e)).toEqual({ tipo: 'atacar', jogador: 'oponente', atacante: 0, alvo: 0 })
  })

  it('avalia sem mutar e explica ataques vantajosos/prejudiciais', () => {
    const bom = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-103'] }, humano: { campo: ['CC-101'] } })
    const antes = JSON.stringify(bom)
    const avaliacao = avaliarAtaque(bom, { tipo: 'atacar', jogador: 'oponente', atacante: 0, alvo: 0 })
    expect(avaliacao.score).toBeGreaterThan(0)
    expect(avaliacao.motivo).toContain('Elimina')
    expect(JSON.stringify(bom)).toBe(antes)
    const ruim = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-101'] }, humano: { campo: [{ id: 'CC-104', pos: 'DEFESA' }] } })
    expect(escolherMelhorAtaque(ruim)).toBeNull()
  })

  it('ataca a unidade que consegue vencer, preferindo remover a mais forte', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-169'] }, humano: { campo: ['CC-101', 'CC-156', 'CC-113'] } })
    // 2400 vence 2200 (zona 1), 1200 (0) e 700 (2): prefere a de maior ATK
    expect(decide(e)).toMatchObject({ tipo: 'atacar', atacante: 0, alvo: 1 })
  })

  it('nunca ataca em suicídio (defesa mais alta, alvo mais forte); aceita a troca equivalente', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-101'] }, humano: { campo: [{ id: 'CC-104', pos: 'DEFESA' }] } })
    expect(decide(e)).toEqual({ tipo: 'encerrarTurno', jogador: 'oponente' })
    // IA agressiva: aceita a troca equivalente (ambas destruídas), mas nunca o suicídio contra alvo mais forte
    const empate = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-103'] }, humano: { campo: ['CC-103'] } })
    expect(decide(empate)).toMatchObject({ tipo: 'atacar', atacante: 0, alvo: 0 })
    const fraco = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-101'] }, humano: { campo: ['CC-103'] } })
    expect(decide(fraco)).toEqual({ tipo: 'encerrarTurno', jogador: 'oponente' })
  })

  it('destrói unidade em defesa quando o ATK é maior', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-103'] }, humano: { campo: [{ id: 'CC-147', pos: 'DEFESA' }] } })
    expect(decide(e)).toMatchObject({ tipo: 'atacar', alvo: 0 })
  })

  it('ataca alvo oculto sem consultar identidade/atributos: usa o atacante mais forte e menor zona no desempate', () => {
    const montarOculta = (id: string) =>
      cenarioCombate({
        ativo: 'oponente',
        oponente: { campo: ['CC-103', 'CC-107'] },
        humano: { campo: [null, { id, pos: 'ATAQUE', viradaParaBaixo: true }] },
      })
    const fraca = montarOculta('CC-113')
    const forte = montarOculta('CC-156')
    expect(JSON.stringify(visaoParaJogador(fraca, 'oponente'))).toBe(JSON.stringify(visaoParaJogador(forte, 'oponente')))
    expect(decide(fraca)).toEqual({ tipo: 'atacar', jogador: 'oponente', atacante: 1, alvo: 1 })
    expect(decide(forte)).toEqual(decide(fraca))
  })

  it('IA agressiva: ataca mesmo um alvo oculto com uma unidade fraca', () => {
    const e = cenarioCombate({
      ativo: 'oponente',
      oponente: { campo: ['CC-113'] },
      humano: { campo: [{ id: 'CC-156', pos: 'ATAQUE', viradaParaBaixo: true }] },
    })
    expect(decide(e)).toMatchObject({ tipo: 'atacar', atacante: 0, alvo: 0 })
  })

  it('unidades em DEFESA ou que já atacaram não atacam', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: [{ id: 'CC-103', pos: 'DEFESA' }, { id: 'CC-107', atacou: true }] } })
    expect(decide(e)).toEqual({ tipo: 'encerrarTurno', jogador: 'oponente' })
  })
})

describe('executarTurnoIA', () => {
  function humanoJogaEPassa(e: EstadoDuelo): EstadoDuelo {
    const legal = (e.jogadores.humano.mao.map((c) => c.uid))
    let atual = e
    for (const uid of legal) {
      const r = aplicarComando(atual, { tipo: 'jogarCarta', jogador: 'humano', uid })
      if (r.ok) {
        atual = r.estado
        break
      }
    }
    if (!atual.jogadaFeita) atual = ok(aplicarComando(atual, { tipo: 'descartar', jogador: 'humano', uid: atual.jogadores.humano.mao[0]!.uid }))
    return ok(aplicarComando(atual, { tipo: 'encerrarTurno', jogador: 'humano' }))
  }

  it('executa o turno completo e devolve a vez ao humano, com eventos em ordem', () => {
    const e = humanoJogaEPassa(novoDuelo(8))
    expect(e.ativo).toBe('oponente')
    const r = executarTurnoIA(e)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.estado.ativo).toBe('humano')
    expect(r.estado.turno).toBe(3)
    expect(r.estado.fase).toBe('PRINCIPAL')
    expect(r.eventos.some((x) => x.tipo === 'carta_jogada' || x.tipo === 'descarte_forcado')).toBe(true)
    expect(r.eventos.at(-1 as number)?.tipo).toBe('fase_alterada')
    expect(r.eventos.some((x) => x.tipo === 'turno_encerrado' && x.jogador === 'oponente')).toBe(true)
    expect(r.eventos.some((x) => x.tipo === 'ia_fallback')).toBe(false)
    expect(r.estado.log.length).toBe(e.log.length + r.eventos.length)
    expect(e.ativo).toBe('oponente') // entrada intacta
  })

  it('é determinístico e a seed opcional não altera a decisão', () => {
    const e = humanoJogaEPassa(novoDuelo(8))
    const a = executarTurnoIA(e)
    const b = executarTurnoIA(e, 12345)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('recusa estado encerrado', () => {
    const e = ok(aplicarComando(cenario(), { tipo: 'desistir', jogador: 'humano' }))
    const r = executarTurnoIA(e)
    expect(r.ok).toBe(false)
  })

  it('a IA pode vencer a partida durante o próprio turno', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-101'], campo: ['CC-169'], baralho: 10 }, humano: { lp: 2000, baralho: 10 } })
    const r = executarTurnoIA(e)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.estado.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('o IA descarta quando não há jogada e ainda assim encerra o turno', () => {
    const e = cenario({
      ativo: 'oponente',
      oponente: { mao: ['CC-103', 'CC-113', 'CC-101', 'CC-107', 'CC-104'], campo: ['CC-102', 'CC-104', 'CC-105', 'CC-106', 'CC-109'].map((id) => ({ id, atacou: true })), baralho: 20 },
      humano: { baralho: 20 },
    })
    const r = executarTurnoIA(e)
    expect(r.ok && r.eventos.some((x) => x.tipo === 'descarte_forcado')).toBe(true)
    if (r.ok) expect(r.estado.ativo).toBe('humano')
  })

  it('perde por compra incompleta ao passar a vez (a IA nunca trava, o jogo apenas termina)', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-101'], baralho: 5 }, humano: { mao: ['CC-101', 'CC-102'], baralho: 1 } })
    const r = executarTurnoIA(e)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.estado.resultado).toEqual({ vencedor: 'oponente', motivo: 'compra' })
  })
})
