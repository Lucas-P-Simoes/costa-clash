// Teste de propriedade: sequências ALEATÓRIAS de comandos (legais e ilegais) nunca produzem estado inválido,
// nunca mutam a entrada e conservam o total de cartas de cada jogador.
import { describe, expect, it } from 'vitest'
import { CATALOGO } from '../../data/catalogo'
import { aplicarComando, ataquesLegais, jogadasLegais } from '../acoes'
import type { Comando } from '../acoes'
import { criarDuelo } from '../duelo'
import { invariantes } from '../estado'
import type { EstadoDuelo } from '../estado'
import { criarRng, embaralhar } from '../rng'
import type { Rng } from '../rng'

function congelar<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o)) congelar(v)
  }
  return o
}

function baralhoAleatorio(rng: Rng): string[] {
  const triplas = CATALOGO.flatMap((c) => [c.id, c.id, c.id])
  return embaralhar(triplas, rng).slice(0, 40)
}

function candidatos(e: EstadoDuelo, rng: Rng): Comando[] {
  const j = e.ativo
  const lista: Comando[] = [...jogadasLegais(e), ...ataquesLegais(e)]
  e.jogadores[j].campo.forEach((u, zona) => {
    if (u) lista.push({ tipo: 'mudarPosicao', jogador: j, zona, posicao: u.posicao === 'ATAQUE' ? 'DEFESA' : 'ATAQUE' })
  })
  lista.push({ tipo: 'avancarFase', jogador: j }, { tipo: 'encerrarTurno', jogador: j })
  // comandos propositalmente ilegais/errados
  lista.push(
    { tipo: 'encerrarTurno', jogador: j === 'humano' ? 'oponente' : 'humano' },
    { tipo: 'atacar', jogador: j, atacante: 4, alvo: 4 },
    { tipo: 'mudarPosicao', jogador: j, zona: 9, posicao: 'DEFESA' },
    { tipo: 'jogarCarta', jogador: j, uid: 'inexistente' },
    { tipo: 'descartar', jogador: j, uid: e.jogadores[j].mao[0]?.uid ?? 'x' },
  )
  if (rng() < 0.01) lista.push({ tipo: 'desistir', jogador: j })
  return lista
}

describe('propriedade: nenhuma sequência de comandos produz estado inválido', () => {
  it('80 partidas aleatórias (baralhos aleatórios com todas as cartas do catálogo)', () => {
    let totalComandos = 0
    let aceitos = 0
    let recusados = 0
    const tiposVistos = new Set<string>()
    const traps = new Set<string>()
    for (let seed = 1; seed <= 80; seed++) {
      const rng = criarRng(seed * 7919)
      const r = criarDuelo({ baralhoJogador: baralhoAleatorio(rng), baralhoOponente: baralhoAleatorio(rng), seed })
      if (!r.ok) throw new Error(r.erros.join(';'))
      let e = congelar(r.estado) // congelado: qualquer mutação da entrada lança TypeError (módulos ESM são estritos)
      expect(invariantes(e)).toEqual([])
      for (let passo = 0; passo < 1200 && !e.resultado; passo++) {
        const opcoes = candidatos(e, rng)
        // viés para progredir: 85% das vezes prefere uma jogada/ataque/avanço "útil"
        const util = opcoes.filter((c) => c.tipo === 'jogarCarta' || c.tipo === 'atacar' || c.tipo === 'avancarFase' || c.tipo === 'encerrarTurno' || c.tipo === 'descartar')
        const pool = rng() < 0.85 ? util : opcoes
        const cmd = pool[Math.floor(rng() * pool.length)] as Comando
        const res = aplicarComando(e, cmd)
        totalComandos++
        if (res.ok) {
          aceitos++
          tiposVistos.add(cmd.tipo)
          expect(res.estado).not.toBe(e)
          const inv = invariantes(res.estado)
          expect(inv, `seed ${seed} passo ${passo} cmd ${JSON.stringify(cmd)}`).toEqual([])
          if (passo % 10 === 0) expect(JSON.parse(JSON.stringify(res.estado))).toEqual(res.estado)
          for (const ev of res.eventos) if (ev.tipo === 'armadilha_ativada') traps.add(ev.carta.cartaId)
          e = congelar(res.estado)
        } else {
          recusados++
          expect(res.estado, 'jogada ilegal deve devolver o mesmo estado').toBe(e)
          expect(res.erro.length).toBeGreaterThan(3)
        }
      }
    }
    expect(aceitos).toBeGreaterThan(2000)
    expect(recusados).toBeGreaterThan(0)
    expect([...tiposVistos].sort()).toEqual(['atacar', 'avancarFase', 'descartar', 'desistir', 'encerrarTurno', 'jogarCarta', 'mudarPosicao'].filter((t) => tiposVistos.has(t)))
    for (const t of ['atacar', 'avancarFase', 'encerrarTurno', 'jogarCarta', 'mudarPosicao']) expect(tiposVistos.has(t), t).toBe(true)
    expect(totalComandos).toBeGreaterThan(aceitos)
    // as armadilhas realmente dispararam em partidas aleatórias
    expect(traps.size).toBeGreaterThan(0)
  }, 60000)
})
