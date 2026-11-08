import { describe, expect, it } from 'vitest'
import { BARALHO_GUARDIAO_TUTORIAL, BARALHO_JOGADOR_TUTORIAL, LP_GUARDIAO_TUTORIAL } from '../../data/tutorialGuardiao'
import { PASSOS, passoAtual } from '../../screens/duelo/tutorial/roteiro'
import { aplicarComando, ataquesLegais, criarDuelo, decidirComandoTutorial, executarTurnoIAComPassos, invariantes, jogadasLegais } from '..'
import type { Comando, EstadoDuelo } from '..'
import { validarBaralhoDuelo } from '../baralho'
import { cenario } from './util'

function novoTutorial(): EstadoDuelo {
  const r = criarDuelo({ baralhoJogador: BARALHO_JOGADOR_TUTORIAL, baralhoOponente: BARALHO_GUARDIAO_TUTORIAL, seed: 1, ordemFixa: true, lpOponente: LP_GUARDIAO_TUTORIAL })
  if (!r.ok) throw new Error(r.erros.join(' '))
  return r.estado
}

const aplicar = (e: EstadoDuelo, c: Comando): EstadoDuelo => {
  const r = aplicarComando(e, c)
  if (!r.ok) throw new Error(`${c.tipo}: ${r.erro}`)
  return r.estado
}

/** Turno do humano: baixa a 1ª carta, ataca com tudo que puder (1º alvo) e encerra o turno. */
function turnoHumano(e: EstadoDuelo): EstadoDuelo {
  const jogada = jogadasLegais(e)[0]
  if (jogada) e = aplicar(e, jogada)
  if (e.turno > 1 && e.fase === 'PRINCIPAL') e = aplicar(e, { tipo: 'avancarFase', jogador: 'humano' })
  for (let i = 0; i < 10 && !e.resultado; i++) {
    const atq = ataquesLegais(e)[0]
    if (!atq) break
    e = aplicar(e, atq)
  }
  return e.resultado ? e : aplicar(e, { tipo: 'encerrarTurno', jogador: 'humano' })
}

describe('baralhos e abertura do tutorial', () => {
  it('os dois baralhos são válidos (40 cartas, <=3 por ID)', () => {
    expect(validarBaralhoDuelo(BARALHO_JOGADOR_TUTORIAL)).toEqual({ ok: true })
    expect(validarBaralhoDuelo(BARALHO_GUARDIAO_TUTORIAL)).toEqual({ ok: true })
  })

  it('ordemFixa não embaralha: a mão e as compras seguem a ordem dada, igual para qualquer seed', () => {
    const a = novoTutorial()
    const b = criarDuelo({ baralhoJogador: BARALHO_JOGADOR_TUTORIAL, baralhoOponente: BARALHO_GUARDIAO_TUTORIAL, seed: 999, ordemFixa: true, lpOponente: LP_GUARDIAO_TUTORIAL })
    if (!b.ok) throw new Error('x')
    expect(b.estado.jogadores).toEqual(a.jogadores)
    expect(a.jogadores.humano.mao.map((c) => c.cartaId)).toEqual(BARALHO_JOGADOR_TUTORIAL.slice(0, 5))
    expect(a.jogadores.humano.baralho[0]!.cartaId).toBe(BARALHO_JOGADOR_TUTORIAL[5])
    expect(a.jogadores.oponente.mao.map((c) => c.cartaId)).toEqual(BARALHO_GUARDIAO_TUTORIAL.slice(0, 5))
    expect(invariantes(a)).toEqual([])
  })

  it('só o Guardião começa com vida reduzida; sem as opções o duelo é o de sempre', () => {
    const t = novoTutorial()
    expect(t.jogadores.oponente.lp).toBe(LP_GUARDIAO_TUTORIAL)
    expect(t.jogadores.humano.lp).toBe(5000)
    const normal = criarDuelo({ baralhoJogador: BARALHO_JOGADOR_TUTORIAL, baralhoOponente: BARALHO_GUARDIAO_TUTORIAL, seed: 1 })
    if (!normal.ok) throw new Error('x')
    expect(normal.estado.jogadores.oponente.lp).toBe(5000)
  })
})

describe('IA do tutorial', () => {
  it('nunca ataca e o duelo do tutorial é vencível pelo humano em poucas rodadas', () => {
    let e = novoTutorial()
    for (let i = 0; i < 30 && !e.resultado; i++) {
      e = turnoHumano(e)
      if (e.resultado) break
      const ia = executarTurnoIAComPassos(e, undefined, undefined, decidirComandoTutorial)
      if (!ia.ok) throw new Error(ia.erro)
      expect(ia.eventos.some((ev) => ev.tipo === 'ataque_declarado')).toBe(false)
      e = ia.estado
      expect(invariantes(e)).toEqual([])
    }
    expect(e.resultado?.vencedor).toBe('humano')
    expect(e.jogadores.humano.lp).toBe(5000)
    expect(e.turno).toBeLessThanOrEqual(15)
  })

  it('sem o decisor do tutorial a IA normal continua atacando (comportamento padrão intacto)', () => {
    const e = cenario({ ativo: 'oponente', fase: 'COMBATE', turno: 4, oponente: { campo: ['CC-056'] }, humano: { campo: ['CC-001'] } })
    const ia = executarTurnoIAComPassos(e)
    if (!ia.ok) throw new Error(ia.erro)
    expect(ia.eventos.some((ev) => ev.tipo === 'ataque_declarado')).toBe(true)
  })
})

describe('roteiro do tutorial', () => {
  const nenhum = new Set<string>()

  it('abre com as boas-vindas e depois pede para baixar uma carta', () => {
    const e = novoTutorial()
    expect(passoAtual(e, nenhum)?.id).toBe('boas-vindas')
    expect(passoAtual(e, new Set(['boas-vindas']))?.id).toBe('baixar')
  })

  it('jogar fora da ordem não trava: baixar a carta antes de "Continuar" pula direto para a posição', () => {
    let e = novoTutorial()
    e = aplicar(e, jogadasLegais(e)[0]!)
    expect(passoAtual(e, nenhum)?.id).toBe('posicao')
    expect(passoAtual(e, new Set(['posicao']))?.id).toBe('encerrar')
  })

  it('percorre encerrar → vez do Guardião → atacar → defesa/direto → finalizar, e some no fim', () => {
    const conf = new Set(['boas-vindas', 'posicao'])
    let e = novoTutorial()
    e = aplicar(e, jogadasLegais(e)[0]!)
    expect(passoAtual(e, conf)?.id).toBe('encerrar')
    e = aplicar(e, { tipo: 'encerrarTurno', jogador: 'humano' })
    expect(e.ativo).toBe('oponente')
    expect(passoAtual(e, conf)?.id).toBe('atacar') // a vez do Guardião não tem passo próprio (o balão some durante a reprodução da IA)
    const ia = executarTurnoIAComPassos(e, undefined, undefined, decidirComandoTutorial)
    if (!ia.ok) throw new Error(ia.erro)
    e = ia.estado
    expect(passoAtual(e, conf)?.id).toBe('atacar')
    e = aplicar(e, jogadasLegais(e)[0]!)
    e = aplicar(e, { tipo: 'avancarFase', jogador: 'humano' })
    e = aplicar(e, ataquesLegais(e)[0]!)
    expect(passoAtual(e, conf)?.id).toBe('defesa-e-direto')
    expect(passoAtual(e, new Set([...conf, 'defesa-e-direto']))?.id).toBe('finalizar')
    expect(passoAtual(e, new Set(PASSOS.map((p) => p.id)))).toBeNull()
  })

  it('termina junto com o duelo', () => {
    const e = cenario({})
    expect(passoAtual({ ...e, resultado: { vencedor: 'humano', motivo: 'lp' } }, nenhum)).toBeNull()
  })

  it('os textos não afirmam que algo elimina totalmente um risco', () => {
    for (const p of PASSOS) expect(p.texto).not.toMatch(/elimina|acaba com|resolve totalmente|zera/i)
  })
})
