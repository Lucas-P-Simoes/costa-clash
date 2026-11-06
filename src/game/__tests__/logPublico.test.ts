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

  it('ações jogadas pelo adversário continuam públicas; cartas da mão não', () => {
    let e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-077', 'CC-083'], campo: ['CC-001'] }, humano: {} })
    e = ok(jogar(e, 'oponente', 'CC-077', { alvo: 0 }))
    const pub = JSON.stringify(logPublico(e, 'humano'))
    expect(pub).toContain('CC-077')
    expect(pub).not.toContain('CC-083')
    expect(JSON.stringify(logPublico(e, 'oponente'))).toContain('CC-077')
  })

  it('unidade adversária baixada e movida virada para baixo não vaza identidade no evento ou texto', () => {
    let e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-056'] } })
    e = ok(jogar(e, 'oponente', 'CC-056', { posicao: 'ATAQUE', viradaParaBaixo: true }))
    e = ok(aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'oponente', zona: 0, posicao: 'DEFESA' }))
    const publico = logPublico(e, 'humano')
    expect(JSON.stringify(publico)).not.toContain('CC-056')
    expect(publico.map((x) => x.texto).join(' ')).not.toContain('Derramamento de Óleo')
    expect(publico.find((x) => x.tipo === 'carta_jogada')).toMatchObject({ carta: { uid: '?', cartaId: '?' }, viradaParaBaixo: true })
    expect(publico.find((x) => x.tipo === 'posicao_alterada')?.texto).toContain('unidade virada para baixo')
    expect(JSON.stringify(logPublico(e, 'oponente'))).toContain('CC-056')
  })

  it('buff em unidade própria virada para baixo não publica o nome da unidade alvo', () => {
    let e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-077'], campo: [{ id: 'CC-056', viradaParaBaixo: true }] } })
    e = ok(jogar(e, 'oponente', 'CC-077', { alvo: 0 }))
    const publico = logPublico(e, 'humano')
    const texto = publico.map((x) => x.texto).join(' ')
    expect(texto).not.toContain('Derramamento de Óleo')
    expect(texto).toContain('uma unidade virada para baixo')
    expect(publico.find((x) => x.tipo === 'efeito_aplicado')).toMatchObject({ cartaId: '?', operacao: 'efeito_oculto', valor: 0 })
    expect(JSON.stringify(logPublico(e, 'oponente'))).toContain('buff_unidade')
  })

  it('efeito de ação em unidade oculta não publica operação, valor nem texto derivado do alvo', () => {
    let e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-083'], campo: [{ id: 'CC-056', viradaParaBaixo: true }] } })
    e = ok(jogar(e, 'oponente', 'CC-083', { alvo: 0 }))
    const efeitoPublico = logPublico(e, 'humano').find((x) => x.tipo === 'efeito_aplicado')
    expect(efeitoPublico).toMatchObject({ cartaId: '?', operacao: 'efeito_oculto', valor: 0, texto: 'Um efeito é aplicado a uma unidade virada para baixo.' })
    expect(JSON.stringify(efeitoPublico)).not.toMatch(/buff_unidade|Derramamento de Óleo|300/)
    expect(JSON.stringify(logPublico(e, 'oponente'))).toContain('buff_unidade')
  })

  it('unidade colocada virada para baixo não publica a identidade nem dispara efeitos', () => {
    let e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-056'] } })
    e = ok(jogar(e, 'oponente', 'CC-056', { viradaParaBaixo: true }))
    const publico = JSON.stringify(logPublico(e, 'humano'))
    expect(publico).not.toContain('CC-056')
    expect(publico).not.toContain('Derramamento de Óleo')
    expect(e.log.some((x) => x.tipo === 'efeito_aplicado')).toBe(false)
  })

  it('turno completo da IA: nenhum cartaId de carta oculta (mão/unidade virada) vaza para o humano', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-006', 'CC-009'], baralho: 20 }, humano: { campo: ['CC-043', 'CC-056'], baralho: 20 } })
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
