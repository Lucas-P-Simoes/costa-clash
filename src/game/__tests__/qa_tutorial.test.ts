// QA do tutorial do Guardião do Mangue: motor intacto por padrão e tutorial vencível/estável com humanos "ruins".
import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { BARALHO_GUARDIAO_TUTORIAL, BARALHO_JOGADOR_TUTORIAL, LP_GUARDIAO_TUTORIAL } from '../../data/tutorialGuardiao'
import { aplicarComando, ataquesLegais, criarDuelo, decidirComandoTutorial, executarTurnoIA, executarTurnoIAComPassos, invariantes, jogadasLegais } from '..'
import type { Comando, EstadoDuelo } from '..'
import { PASSOS, passoAtual } from '../../screens/duelo/tutorial/roteiro'
import { decidirComando } from '../ia'
import { visaoParaJogador } from '../visao'
import { cenario } from './util'

function lcg(seed: number) {
  let s = seed >>> 0
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296
}

function novoTutorial(): EstadoDuelo {
  const r = criarDuelo({ baralhoJogador: BARALHO_JOGADOR_TUTORIAL, baralhoOponente: BARALHO_GUARDIAO_TUTORIAL, seed: 1, ordemFixa: true, lpOponente: LP_GUARDIAO_TUTORIAL })
  if (!r.ok) throw new Error(r.erros.join(' '))
  return r.estado
}

type Estrategia = 'aleatorio' | 'atacaSempre' | 'defesaERuim'

/** Um turno do humano com jogadas legais escolhidas por um RNG (inclui descartes livres, trocas de posição e ataques ruins). */
function turnoHumano(e0: EstadoDuelo, rnd: () => number, est: Estrategia): EstadoDuelo {
  let e = e0
  const tentar = (c: Comando) => {
    const r = aplicarComando(e, c)
    if (r.ok) e = r.estado
    return r.ok
  }
  const jogadas = jogadasLegais(e)
  if (jogadas.length > 0) {
    let escolha = jogadas[Math.floor(rnd() * jogadas.length)]!
    if (est === 'atacaSempre') escolha = jogadas.find((j) => j.tipo === 'jogarCarta' && j.posicao === 'ATAQUE' && !j.viradaParaBaixo) ?? escolha
    // 15% das vezes (aleatório) joga uma carta na lixeira antes de decidir
    if (est === 'aleatorio' && rnd() < 0.15 && e.jogadores.humano.mao[0]) tentar({ tipo: 'descartar', jogador: 'humano', uid: e.jogadores.humano.mao[0]!.uid })
    if (!e.jogadaFeita) tentar(escolha.tipo === 'jogarCarta' && !e.jogadores.humano.mao.some((c) => c.uid === escolha.uid) ? (jogadasLegais(e)[0] ?? escolha) : escolha)
  }
  if (est !== 'atacaSempre') {
    e.jogadores.humano.campo.forEach((u, zona) => {
      if (u && !u.atacou && rnd() < (est === 'defesaERuim' ? 0.5 : 0.3)) tentar({ tipo: 'mudarPosicao', jogador: 'humano', zona, posicao: u.posicao === 'ATAQUE' ? 'DEFESA' : 'ATAQUE' })
    })
  }
  if (e.turno > 1 && e.fase === 'PRINCIPAL') tentar({ tipo: 'avancarFase', jogador: 'humano' })
  for (let i = 0; i < 10 && !e.resultado; i++) {
    const atq = ataquesLegais(e)
    if (atq.length === 0) break
    if (est === 'aleatorio' && rnd() < 0.2) break
    // 'defesaERuim' escolhe o alvo ao acaso (inclui atacar defesa forte com unidade fraca)
    const a = est === 'atacaSempre' ? atq[0]! : atq[Math.floor(rnd() * atq.length)]!
    if (!tentar(a)) break
  }
  if (e.resultado) return e
  const r = aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' })
  if (!r.ok) throw new Error('encerrarTurno: ' + r.erro)
  return r.estado
}

function simular(seed: number, est: Estrategia, limiteTurnos = 60) {
  const rnd = lcg(seed)
  let e = novoTutorial()
  let ataquesGuardiao = 0
  let fallbacks = 0
  while (!e.resultado && e.turno < limiteTurnos) {
    e = turnoHumano(e, rnd, est)
    if (e.resultado) break
    const ia = executarTurnoIAComPassos(e, undefined, undefined, decidirComandoTutorial)
    if (!ia.ok) throw new Error(ia.erro)
    ataquesGuardiao += ia.eventos.filter((x) => x.tipo === 'ataque_declarado').length
    fallbacks += ia.eventos.filter((x) => x.tipo === 'ia_fallback').length
    e = ia.estado
    expect(invariantes(e)).toEqual([])
  }
  return { e, ataquesGuardiao, fallbacks }
}

describe('QA tutorial: motor e IA dos demais duelos intactos', () => {
  it('criarDuelo sem as novas opções é idêntico a ordemFixa:false/lpOponente:undefined e embaralha de verdade', () => {
    const base = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: BARALHOS_OPONENTES['ressaca']!, seed: 7 })
    const explicito = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: BARALHOS_OPONENTES['ressaca']!, seed: 7, ordemFixa: false, lpOponente: undefined })
    if (!base.ok || !explicito.ok) throw new Error('x')
    expect(explicito.estado).toEqual(base.estado)
    expect(base.estado.jogadores.humano.lp).toBe(5000)
    expect(base.estado.jogadores.oponente.lp).toBe(5000)
    // embaralhado: a mão não é igual às 5 primeiras cartas do baralho dado
    expect(base.estado.jogadores.humano.mao.map((c) => c.cartaId)).not.toEqual(BARALHO_INICIAL.slice(0, 5))
  })

  it('lpOponente inválido (0, negativo, fracionário, NaN, Infinity) é ignorado; válido é aplicado e consistente', () => {
    for (const lp of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = criarDuelo({ baralhoJogador: BARALHO_JOGADOR_TUTORIAL, baralhoOponente: BARALHO_GUARDIAO_TUTORIAL, seed: 1, ordemFixa: true, lpOponente: lp })
      if (!r.ok) throw new Error('x')
      expect(r.estado.jogadores.oponente.lp).toBe(5000)
    }
    const ok = criarDuelo({ baralhoJogador: BARALHO_JOGADOR_TUTORIAL, baralhoOponente: BARALHO_GUARDIAO_TUTORIAL, seed: 1, ordemFixa: true, lpOponente: 1 })
    if (!ok.ok) throw new Error('x')
    expect(ok.estado.jogadores.oponente.lp).toBe(1)
    expect(invariantes(ok.estado)).toEqual([])
  })

  it('ordemFixa continua validando o baralho (tamanho/cópias) e só 30 cartas por lado entram', () => {
    const curto = criarDuelo({ baralhoJogador: BARALHO_JOGADOR_TUTORIAL.slice(0, 39), baralhoOponente: BARALHO_GUARDIAO_TUTORIAL, seed: 1, ordemFixa: true })
    expect(curto.ok).toBe(false)
    const e = novoTutorial()
    expect(e.jogadores.humano.mao.length + e.jogadores.humano.baralho.length).toBe(30)
    expect(e.jogadores.oponente.mao.length + e.jogadores.oponente.baralho.length).toBe(30)
  })

  it('executarTurnoIAComPassos com decisor padrão = decidirComando explícito = executarTurnoIA (mesmo estado final)', () => {
    const e = cenario({ ativo: 'oponente', fase: 'PRINCIPAL', turno: 4, mao: undefined, oponente: { mao: ['CC-156', 'CC-143', 'CC-101'], campo: ['CC-156'] }, humano: { campo: ['CC-101', 'CC-102'] } } as never)
    const a = executarTurnoIAComPassos(e)
    const b = executarTurnoIAComPassos(e, undefined, undefined, decidirComando)
    const c = executarTurnoIA(e)
    if (!a.ok || !b.ok || !c.ok) throw new Error('x')
    expect(b.estado).toEqual(a.estado)
    expect(c.estado).toEqual(a.estado)
    expect(b.eventos).toEqual(a.eventos)
  })

  it('decidirComandoTutorial só difere de decidirComando quando este atacaria (e então encerra o turno)', () => {
    const casos: EstadoDuelo[] = [
      cenario({ ativo: 'oponente', fase: 'COMBATE', turno: 4, oponente: { campo: ['CC-143'] }, humano: { campo: ['CC-102'] } }),
      cenario({ ativo: 'oponente', fase: 'COMBATE', turno: 4, oponente: { campo: ['CC-143'] }, humano: { campo: [] } }),
      cenario({ ativo: 'oponente', fase: 'PRINCIPAL', turno: 4, oponente: { mao: ['CC-143', 'CC-101'], campo: [] }, humano: { campo: ['CC-102'] } }),
      cenario({ ativo: 'oponente', fase: 'PRINCIPAL', turno: 4, oponente: { mao: ['CC-143'], campo: ['CC-101'] }, humano: { campo: ['CC-102'] }, jogadaFeita: true }),
    ]
    let atacou = 0
    for (const e of casos) {
      const v = visaoParaJogador(e, 'oponente')
      const normal = decidirComando(v)
      const tut = decidirComandoTutorial(v)
      if (normal.tipo === 'atacar') {
        atacou++
        expect(tut).toEqual({ tipo: 'encerrarTurno', jogador: 'oponente' })
      } else expect(tut).toEqual(normal)
    }
    expect(atacou).toBeGreaterThan(0)
  })
})

describe('QA tutorial: vencível por humanos que jogam qualquer jogada legal', () => {
  for (const est of ['atacaSempre', 'aleatorio', 'defesaERuim'] as const) {
    it(`estratégia ${est}: Guardião nunca ataca, sem fallback da IA, invariantes ok`, () => {
      const stats = { vitorias: 0, derrotas: 0, empates: 0, turnos: [] as number[] }
      let derrotasPorCompra = 0
      for (let seed = 1; seed <= 100; seed++) {
        const { e, ataquesGuardiao, fallbacks } = simular(seed, est)
        expect(ataquesGuardiao).toBe(0)
        expect(fallbacks).toBe(0)
        if (e.resultado?.vencedor === 'humano') {
          stats.vitorias++
          stats.turnos.push(e.turno)
        } else if (e.resultado?.vencedor === 'oponente') {
          stats.derrotas++
          // o Guardião nunca ataca: a única derrota possível é o humano ficar sem cartas para comprar (ou perder LP em ataques ruins)
          expect(['compra', 'lp']).toContain(e.resultado.motivo)
          derrotasPorCompra += e.resultado.motivo === 'compra' ? 1 : 0
        } else stats.empates++
      }
      const max = Math.max(0, ...stats.turnos)
      console.log('QA-STATS', est, JSON.stringify({ ...stats, turnos: undefined, derrotasPorCompra, maxTurno: max, mediaTurno: stats.turnos.reduce((a, b) => a + b, 0) / (stats.turnos.length || 1) }))
      // "qualquer jogada legal" que ataque deve vencer em quase todas as partidas e em poucas rodadas
      // (o humano 'aleatorio' descarta, alterna defesa e pula ataques de propósito: ~13% esgota o baralho no turno ~50)
      expect(stats.vitorias).toBeGreaterThanOrEqual(est === 'atacaSempre' ? 100 : est === 'aleatorio' ? 75 : 95)
      expect(max).toBeLessThanOrEqual(est === 'atacaSempre' ? 15 : 50)
    }, 60000)
  }

  it('humano que nunca ataca não trava o motor: o duelo termina (compra/repetição), sem laço infinito', () => {
    let e = novoTutorial()
    for (let i = 0; i < 80 && !e.resultado; i++) {
      const j = jogadasLegais(e)[0]
      if (j) e = (aplicarComando(e, j) as { estado: EstadoDuelo }).estado
      e = (aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }) as { estado: EstadoDuelo }).estado
      if (e.resultado) break
      const ia = executarTurnoIAComPassos(e, undefined, undefined, decidirComandoTutorial)
      if (!ia.ok) throw new Error(ia.erro)
      e = ia.estado
    }
    expect(e.resultado).not.toBeNull()
  })
})

describe('QA tutorial: roteiro nunca trava nem aponta para algo impossível', () => {
  const nenhum = new Set<string>()

  it('não é possível encerrar o turno 1 sem baixar (ou descartar à força): o passo "baixar" nunca fica órfão', () => {
    const e = novoTutorial()
    const r = aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' })
    expect(r.ok).toBe(false)
    expect(passoAtual(e, new Set(['boas-vindas']))?.id).toBe('baixar')
  })

  it('em todo estado alcançável de partidas simuladas passoAtual responde sem lançar e só some quando não há mais o que ensinar', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rnd = lcg(seed)
      let e = novoTutorial()
      for (let i = 0; i < 40 && !e.resultado; i++) {
        const p = passoAtual(e, nenhum)
        expect(p === null || PASSOS.includes(p)).toBe(true)
        if (p?.alvo) expect(['string', 'function']).toContain(typeof p.alvo)
        e = turnoHumano(e, rnd, 'aleatorio')
        if (e.resultado) break
        const ia = executarTurnoIAComPassos(e, undefined, undefined, decidirComandoTutorial)
        if (!ia.ok) throw new Error(ia.erro)
        e = ia.estado
      }
      expect(passoAtual(e, nenhum)).toBeNull() // fim do duelo => sem balão
    }
  })

  // DEFEITO (médio, usabilidade): no início do turno 3 o passo "atacar" já aparece, mas o humano ainda precisa baixar/descartar
  // a carta da mão antes de poder atacar (podeSeguir) e o texto não avisa. Sem a jogada, arrastar o ataque não faz nada.
  it('o passo "atacar" avisa que a carta do turno deve ser baixada (ou descartada) antes de atacar', () => {
    let e = novoTutorial()
    e = (aplicarComando(e, jogadasLegais(e)[0]!) as { estado: EstadoDuelo }).estado
    e = (aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }) as { estado: EstadoDuelo }).estado
    const ia = executarTurnoIAComPassos(e, undefined, undefined, decidirComandoTutorial)
    if (!ia.ok) throw new Error(ia.erro)
    const t3 = ia.estado
    const conf = new Set(['boas-vindas', 'posicao'])
    expect(t3.jogadaFeita).toBe(false)
    expect(ataquesLegais(t3)).toHaveLength(0)
    const p = passoAtual(t3, conf)!
    expect(p.id === 'baixar' || /antes|primeiro|baixe|descarte/i.test(p.texto.replace(/Baixe cartas/i, ''))).toBe(true)
  })
})
