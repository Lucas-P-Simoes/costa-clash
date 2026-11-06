// QA fase B: vazamento no log público/visão em partidas completas (humano aleatório x IA) e correções QA-1/2/3.
import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { aplicarComando, ataquesLegais, jogadasLegais } from '../acoes'
import { criarDuelo, executarTurnoIAComPassos } from '../duelo'
import { criarRng } from '../rng'
import { logPublico, visaoParaJogador } from '../visao'
import { decidirComando } from '../ia'
import type { EstadoDuelo } from '../estado'

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
