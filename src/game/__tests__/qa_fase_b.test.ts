// QA fase B: vazamento no log público/visão em partidas completas (humano aleatório x IA) e correções QA-1/2/3.
import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { CATALOGO } from '../../data/catalogo'
import { aplicarComando, ataquesLegais, jogadasLegais } from '../acoes'
import { criarDuelo, executarTurnoIAComPassos } from '../duelo'
import { criarRng } from '../rng'
import { logPublico, visaoParaJogador } from '../visao'
import { decidirComando } from '../ia'
import type { EstadoDuelo } from '../estado'

const nome = (id: string) => CATALOGO.find((c) => c.id === id)!.nome

function turnoHumanoAleatorio(e: EstadoDuelo, rng: () => number): EstadoDuelo {
  let s = e
  for (let i = 0; i < 40 && !s.resultado && s.ativo === 'humano'; i++) {
    const legais = jogadasLegais(s)
    const ata = s.fase === 'COMBATE' ? ataquesLegais(s) : []
    const todos = [...legais, ...ata]
    let cmd = todos[Math.floor(rng() * todos.length)]
    if (!cmd || rng() < 0.15) cmd = { tipo: s.fase === 'PRINCIPAL' && s.jogadaFeita ? 'avancarFase' : 'encerrarTurno', jogador: 'humano' } as never
    let r = aplicarComando(s, cmd!)
    if (!r.ok) r = aplicarComando(s, { tipo: 'encerrarTurno', jogador: 'humano' })
    if (!r.ok) r = aplicarComando(s, { tipo: 'avancarFase', jogador: 'humano' })
    if (!r.ok) break
    s = r.estado
  }
  return s
}

describe('QA fase B: vazamento em partidas completas', () => {
  for (const op of ['ressaca', 'coral', 'poluicao-mar']) {
    it(`sem uid/nome oculto no log/visão (${op})`, () => {
      const base = BARALHOS_OPONENTES[op] as string[]
      expect(base).toBeTruthy()
      for (let seed = 1; seed <= 6; seed++) {
        const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: base, seed })
        if (!r.ok) throw new Error('x')
        let s = r.estado
        const rng = criarRng(seed * 77)
        for (let t = 0; t < 80 && !s.resultado; t++) {
          if (s.ativo === 'humano') s = turnoHumanoAleatorio(s, rng)
          else {
            const ia = executarTurnoIAComPassos(s)
            if (!ia.ok) throw new Error(ia.erro)
            for (const p of ia.passos) check(p.estado)
            s = ia.passos[ia.passos.length - 1]!.estado
          }
          check(s)
        }
      }
    })
  }
})

function check(s: EstadoDuelo) {
  const v = visaoParaJogador(s, 'humano')
  const log = logPublico(s, 'humano')
  const blob = JSON.stringify({ v, log })
  const adv = s.jogadores.oponente
  const ocultos = [...adv.mao, ...adv.baralho]
  for (const c of ocultos) expect(blob.includes(`"${c.uid}"`)).toBe(false)
  if (s.revelacao !== 'humano') {
    for (const z of adv.suporte) {
      if (z && z.tipo === 'armadilha') {
        expect(blob.includes(`"${z.uid}"`)).toBe(false)
        // nome só pode aparecer se a armadilha já foi pública (revelada antes por revelar/ativada)
        const jaPublica = log.some((e) => (e.tipo === 'armadilhas_reveladas'))
        if (!jaPublica) { const hit = log.filter((e) => e.texto.includes(nome(z.cartaId)) && !(e.tipo === "armadilha_ativada") && !(e.tipo === "carta_jogada" && e.jogador === "humano") && !(e.tipo==="unidade_destruida")); if (hit.length) throw new Error("VAZ " + JSON.stringify(hit.slice(0,3))) }
      }
    }
  }
  // baralho do próprio: nada da ordem
  expect(blob.includes('"baralho":[')).toBe(false)
  void decidirComando
}

describe('QA fase B: correções', () => {
  const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: BARALHOS_OPONENTES['ressaca'] as string[], seed: 5 })
  if (!r.ok) throw new Error('x')
  it('QA-1 comando nulo/primitivo', () => {
    for (const c of [null, undefined, 0, 'x', [], true]) {
      const x = aplicarComando(r.estado, c as never)
      expect(x.ok).toBe(false)
    }
  })
  it('QA-2 desistencia', () => {
    const x = aplicarComando(r.estado, { tipo: 'desistir', jogador: 'humano' })
    if (!x.ok) throw new Error('x')
    expect(x.eventos.some((e) => e.tipo === 'desistencia')).toBe(true)
    expect(aplicarComando(x.estado, { tipo: 'desistir', jogador: 'humano' }).ok).toBe(false)
  })
})

describe('QA fase B: revelar', () => {
  it('armadilhas reveladas somem da visão ao fim do turno; o log público registra o que foi visto', async () => {
    const { cenario, jogar, ok } = await import('./util')
    let e = cenario({ ativo: 'humano', humano: { mao: ['CC-082'] }, oponente: { suporte: [{ id: 'CC-093', turno: 1 }, 'CC-100'], campo: ['CC-001'] } })
    e = ok(jogar(e, 'humano', 'CC-082'))
    const v1 = visaoParaJogador(e, 'humano')
    expect(v1.oponente.suporte.filter((s) => s && !s.oculta)).toHaveLength(2)
    e = ok(aplicarComando(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
    const v2 = visaoParaJogador(e, 'humano')
    expect(v2.oponente.suporte.every((s) => !s || s.oculta)).toBe(true)
    expect(JSON.stringify(v2)).not.toMatch(/CC-093|CC-100/)
    const log = logPublico(e, 'humano')
    // registro histórico: só informativo (o jogador viu); o oponente não recebe isso
    const rev = log.find((x) => x.tipo === 'armadilhas_reveladas')
    expect(rev).toBeTruthy()
  })
})
