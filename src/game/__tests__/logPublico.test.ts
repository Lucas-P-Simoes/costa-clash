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

  it('unidade adversária baixada e movida virada para baixo não vaza identidade no evento ou texto', () => {
    let e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-156'] } })
    e = ok(jogar(e, 'oponente', 'CC-156', { posicao: 'ATAQUE', viradaParaBaixo: true }))
    e = ok(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'oponente', zona: 0, posicao: 'DEFESA' }))
    const publico = logPublico(e, 'humano')
    expect(JSON.stringify(publico)).not.toContain('CC-156')
    expect(publico.map((x) => x.texto).join(' ')).not.toContain('GORGÔNIA-ESCARLATE')
    expect(publico.find((x) => x.tipo === 'carta_jogada')).toMatchObject({ carta: { uid: '?', cartaId: '?' }, viradaParaBaixo: true })
    expect(publico.find((x) => x.tipo === 'posicao_alterada')?.texto).toContain('unidade virada para baixo')
    expect(JSON.stringify(logPublico(e, 'oponente'))).toContain('CC-156')
  })

  it('unidade colocada virada para baixo não publica a identidade nem dispara efeitos', () => {
    let e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-156'] } })
    e = ok(jogar(e, 'oponente', 'CC-156', { viradaParaBaixo: true }))
    const publico = JSON.stringify(logPublico(e, 'humano'))
    expect(publico).not.toContain('CC-156')
    expect(publico).not.toContain('GORGÔNIA-ESCARLATE')
  })

  it('turno completo da IA: nenhum cartaId de carta oculta (mão/unidade virada) vaza para o humano', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-101', 'CC-102', 'CC-104', 'CC-106', 'CC-109'], baralho: 20 }, humano: { campo: ['CC-143', 'CC-156'], baralho: 20 } })
    const r = executarTurnoIA(e)
    if (!r.ok) throw new Error('x')
    const json = JSON.stringify(eventosPublicos(r.eventos, 'humano'))
    expect(json).not.toMatch(/CC-00[12469]/)
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
