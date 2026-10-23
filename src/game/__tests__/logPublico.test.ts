import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { aplicarComando } from '../acoes'
import { criarDuelo, executarTurnoIA } from '../duelo'
import { criarRng, embaralhar } from '../rng'
import { eventosPublicos, logPublico } from '../visao'
import { cenario, jogar, ok } from './util'

describe('logPublico / eventosPublicos', () => {
  it('compras do adversário: só quantidade; as próprias ficam completas', () => {
    const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: BARALHOS_OPONENTES['ressaca'] as string[], seed: 3 })
    if (!r.ok) throw new Error('x')
    const e = r.estado
    const log = logPublico(e, 'humano')
    const compras = log.filter((x) => x.tipo === 'compra')
    const dele = compras.find((x) => x.tipo === 'compra' && x.jogador === 'oponente')
    const meu = compras.find((x) => x.tipo === 'compra' && x.jogador === 'humano')
    expect(dele && dele.tipo === 'compra' && dele.cartas).toEqual([])
    expect(dele && dele.tipo === 'compra' && dele.quantidade).toBe(5)
    expect(meu && meu.tipo === 'compra' && meu.cartas).toHaveLength(5)
    const json = JSON.stringify(log)
    for (const c of e.jogadores.oponente.mao) expect(json).not.toContain(`"${c.uid}"`)
  })

  it('armadilha colocada pelo adversário não revela a carta; equipamento e ações continuam públicos', () => {
    let e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-099', 'CC-077'], campo: ['CC-001'] }, humano: {} })
    e = ok(jogar(e, 'oponente', 'CC-099'))
    const pub = logPublico(e, 'humano')
    const col = pub.find((x) => x.tipo === 'carta_jogada')
    expect(col && col.tipo === 'carta_jogada' && col.carta.cartaId).toBe('?')
    expect(JSON.stringify(pub)).not.toContain('CC-099')
    // o dono vê a própria
    expect(JSON.stringify(logPublico(e, 'oponente'))).toContain('CC-099')
    const e2 = ok(aplicarComando({ ...e, jogadaFeita: false }, { tipo: 'jogarCarta', jogador: 'oponente', uid: e.jogadores.oponente.mao[0]!.uid, alvo: 0 }))
    expect(JSON.stringify(logPublico(e2, 'humano'))).toContain('CC-077')
  })

  it('turno completo da IA: nenhum cartaId de carta oculta (mão/armadilha) vaza para o humano', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-093', 'CC-094', 'CC-095', 'CC-096', 'CC-100'], baralho: 20 }, humano: { baralho: 20 } })
    const r = executarTurnoIA(e)
    if (!r.ok) throw new Error('x')
    const json = JSON.stringify(eventosPublicos(r.eventos, 'humano'))
    expect(json).not.toMatch(/CC-09[3-6]|CC-100/)
  })
})

describe('correções do QA', () => {
  it('rng injetado devolvendo 1.0 não quebra o embaralhamento', () => {
    const r = embaralhar([1, 2, 3, 4, 5], () => 1)
    expect([...r].sort()).toEqual([1, 2, 3, 4, 5])
    expect(embaralhar([1, 2, 3], criarRng(1))).toHaveLength(3)
  })

  it('desistência emite evento próprio, além de fim_de_jogo', () => {
    const r = aplicarComando(cenario(), { tipo: 'desistir', jogador: 'humano' })
    if (!r.ok) throw new Error('x')
    expect(r.eventos.map((x) => x.tipo)).toEqual(['desistencia', 'fim_de_jogo'])
  })
})
