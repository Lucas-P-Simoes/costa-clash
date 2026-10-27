import { describe, expect, it } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { aplicarComando } from '../acoes'
import type { Comando } from '../acoes'
import { criarDuelo, executarTurnoIA } from '../duelo'
import { invariantes } from '../estado'
import type { EstadoDuelo } from '../estado'
import { decidirComando } from '../ia'
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
    expect(Object.keys(v.oponente).sort()).toEqual(['baralhoTamanho', 'campo', 'descarte', 'id', 'lp', 'maoTamanho', 'suporte'])
    expect(Object.keys(v.eu).sort()).toEqual(['baralhoTamanho', 'campo', 'descarte', 'id', 'lp', 'mao', 'suporte'])
    expect(v.oponente.maoTamanho).toBe(5)
    expect(v.oponente.baralhoTamanho).toBe(35)
    const json = JSON.stringify(v)
    for (const c of [...e.jogadores.humano.mao, ...e.jogadores.humano.baralho]) expect(json).not.toContain(`"${c.uid}"`)
    expect(json).not.toMatch(/"uid":"h\d+"/)
    expect(json).not.toContain('"log"')
    // nem a ordem do próprio baralho é exposta
    for (const c of e.jogadores.oponente.baralho) expect(json).not.toContain(`"${c.uid}"`)
  })

  it('armadilhas viradas do adversário aparecem só como zona ocupada (sem carta nem uid)', () => {
    const e = cenario({ humano: { suporte: ['CC-093', null, 'CC-095'] }, ativo: 'oponente' })
    const v = visaoParaJogador(e, 'oponente')
    expect(v.oponente.suporte).toEqual([{ oculta: true }, null, { oculta: true }, null, null])
    expect(JSON.stringify(v)).not.toContain('CC-093')
    // o dono vê as suas
    expect(visaoParaJogador(e, 'humano').eu.suporte[0]?.cartaId).toBe('CC-093')
  })

  it('unidade virada para baixo aparece sem identidade, uid, arte lógica, ATK, DEF ou buffs', () => {
    const e = cenario({ humano: { campo: [{ id: 'CC-056', pos: 'ATAQUE', viradaParaBaixo: true, buffAtk: 900, buffDef: 700 }] }, ativo: 'oponente' })
    const v = visaoParaJogador(e, 'oponente')
    expect(v.oponente.campo[0]).toEqual({ oculta: true, posicao: 'ATAQUE', atacou: false })
    const json = JSON.stringify(v.oponente.campo[0])
    expect(json).not.toMatch(/CC-056|cartaId|uid|buff|atk|def/i)
    expect(visaoParaJogador(e, 'humano').eu.campo[0]).toMatchObject({ cartaId: 'CC-056', viradaParaBaixo: true })
  })

  it('equipamentos do adversário são públicos (estão vinculados a unidades visíveis)', () => {
    const e = cenario({ humano: { campo: [{ id: 'CC-001', equip: 'CC-085' }] }, ativo: 'oponente' })
    const v = visaoParaJogador(e, 'oponente')
    const unidade = v.oponente.campo[0]
    expect(unidade?.oculta).toBe(false)
    if (!unidade || unidade.oculta) throw new Error('A unidade deveria estar visível.')
    expect(v.oponente.suporte[0]).toMatchObject({ oculta: false, cartaId: 'CC-085', vinculadaA: unidade.uid })
  })

  it('equipamento público não expõe o uid interno da unidade oculta vinculada', () => {
    const e = cenario({ humano: { campo: [{ id: 'CC-056', viradaParaBaixo: true, equip: 'CC-085' }] }, ativo: 'oponente' })
    const uidOculto = e.jogadores.humano.campo[0]!.uid
    const v = visaoParaJogador(e, 'oponente')
    expect(v.oponente.campo[0]).toEqual({ oculta: true, posicao: 'ATAQUE', atacou: false })
    expect(v.oponente.suporte[0]).toMatchObject({ oculta: false, cartaId: 'CC-085', vinculadaA: '?u0' })
    expect.soft(JSON.stringify(v.oponente)).not.toContain(uidOculto)
    expect.soft(invariantes(estadoDeVisao(v)).filter((erro) => !erro.includes('total de cartas'))).toEqual([])
  })

  it('o estado reconstruído para planejamento só tem marcadores no lugar do oculto', () => {
    const e = novoDuelo(2)
    const r = estadoDeVisao(visaoParaJogador(e, 'oponente'))
    expect(r.jogadores.humano.mao.every((c) => c.cartaId === '?')).toBe(true)
    expect(r.jogadores.humano.baralho.every((c) => c.cartaId === '?')).toBe(true)
    expect(r.jogadores.oponente.mao.map((c) => c.cartaId).sort()).toEqual(e.jogadores.oponente.mao.map((c) => c.cartaId).sort())
  })

  it('a decisão da IA é idêntica quando só muda a informação oculta do humano (mão, baralho, armadilha)', () => {
    const mk = (maoH: string[], armadilha: string) =>
      cenario({
        ativo: 'oponente',
        oponente: { mao: ['CC-003', 'CC-001', 'CC-077', 'CC-075', 'CC-093'], campo: ['CC-007'] },
        humano: { mao: maoH, campo: ['CC-047'], suporte: [armadilha] },
      })
    const a = mk(['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], 'CC-099')
    const b = mk(['CC-100', 'CC-094', 'CC-096', 'CC-056', 'CC-071'], 'CC-093')
    // embaralha também o baralho do humano em um deles
    b.jogadores.humano.baralho.reverse()
    b.jogadores.humano.baralho.forEach((c, i) => (c.cartaId = i % 2 ? 'CC-020' : 'CC-025'))
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
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-001', 'CC-047', 'CC-077', 'CC-093'] }, humano: { campo: ['CC-007'] } })
    const c = decide(e)
    expect(c).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-047'), posicao: 'ATAQUE' }) // 1800 > 1700
  })

  it('entre as que vencem, a de maior ATK; empate total por ID/uid crescente', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-001', 'CC-003', 'CC-009'] } }) // campo adversário vazio: todas vencem
    expect(decide(e)).toMatchObject({ uid: uidDe(e, 'oponente', 'CC-003') })
    const dup = cenario({ ativo: 'oponente', oponente: { mao: ['CC-001', 'CC-001'] } })
    const uids = dup.jogadores.oponente.mao.map((c) => c.uid).sort()
    expect(decide(dup)).toMatchObject({ uid: uids[0] })
  })

  it('2º: ação eficaz antes de unidade que não vence', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-001', 'CC-075'] }, humano: { campo: ['CC-056'] } }) // 2200/700: CC-001 não vence
    expect(decide(e)).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-075'), alvo: 0 })
  })

  it('unidade que vence tem prioridade sobre ação eficaz', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-071', 'CC-075'] }, humano: { campo: ['CC-056'] } }) // CC-071 2400 > 2200
    expect(decide(e)).toMatchObject({ uid: uidDe(e, 'oponente', 'CC-071') })
  })

  it('3º: sem vitória possível nem ação eficaz, a unidade de maior DEFESA, em DEFESA', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-013', 'CC-004', 'CC-093'] }, humano: { campo: ['CC-056'] } })
    expect(decide(e)).toMatchObject({ uid: uidDe(e, 'oponente', 'CC-004'), posicao: 'DEFESA' })
  })

  it('4º: armadilha só depois de unidades e ações eficazes; entre armadilhas, ID crescente', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-099', 'CC-093'] } })
    expect(decide(e)).toMatchObject({ uid: uidDe(e, 'oponente', 'CC-093') })
    const e2 = cenario({ ativo: 'oponente', oponente: { mao: ['CC-093', 'CC-013'] }, humano: { campo: ['CC-056'] } })
    expect(decide(e2)).toMatchObject({ uid: uidDe(e2, 'oponente', 'CC-013') })
  })

  it('escolhe o alvo mais forte para debuff e destruição (desempate por zona)', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-075'] }, humano: { campo: ['CC-049', 'CC-056', 'CC-047'] } })
    expect(decide(e)).toMatchObject({ alvo: 1 }) // 2200
  })

  it('cura só é "eficaz" quando recupera o valor inteiro; senão fica atrás das unidades', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-079', 'CC-013'], lp: 7900 }, humano: { campo: ['CC-056'] } })
    expect(decide(e)).toMatchObject({ uid: uidDe(e, 'oponente', 'CC-013') })
    const e2 = cenario({ ativo: 'oponente', oponente: { mao: ['CC-079', 'CC-013'], lp: 4000 }, humano: { campo: ['CC-056'] } })
    expect(decide(e2)).toMatchObject({ uid: uidDe(e2, 'oponente', 'CC-079') })
  })

  it('terreno só quando favorece mais as próprias unidades do que as do adversário', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-089', 'CC-013'], campo: ['CC-001'] }, humano: { campo: ['CC-056'] } })
    expect(decide(e)).toMatchObject({ uid: uidDe(e, 'oponente', 'CC-089') })
    const ruim = cenario({ ativo: 'oponente', oponente: { mao: ['CC-089', 'CC-013'] }, humano: { campo: ['CC-001'] } })
    expect(decide(ruim)).toMatchObject({ uid: uidDe(ruim, 'oponente', 'CC-013') })
  })

  it('revelar nunca é preferido a unidades: a IA não usa a informação revelada', () => {
    const sem = cenario({ ativo: 'oponente', oponente: { mao: ['CC-082', 'CC-013'] }, humano: { campo: ['CC-056'] } })
    expect(decide(sem)).toMatchObject({ uid: uidDe(sem, 'oponente', 'CC-013') })
    const com = cenario({ ativo: 'oponente', oponente: { mao: ['CC-082', 'CC-013'] }, humano: { campo: ['CC-056'], suporte: ['CC-093'] } })
    expect(decide(com)).toMatchObject({ uid: uidDe(com, 'oponente', 'CC-013') })
  })

  it('sem jogada legal descarta (a carta de menor utilidade; empate por ID)', () => {
    const e = cenario({
      ativo: 'oponente',
      oponente: { mao: ['CC-003', 'CC-013', 'CC-001', 'CC-007', 'CC-004'], campo: ['CC-002', 'CC-004', 'CC-005', 'CC-006', 'CC-009'] },
    })
    const c = decide(e)
    expect(c).toMatchObject({ tipo: 'descartar', uid: uidDe(e, 'oponente', 'CC-013') }) // 700+1800 é o menor
  })
})

describe('posições e ataques (§9)', () => {
  it('ajusta posições: ATAQUE se há vantagem, senão DEFESA', () => {
    const e = cenario({
      ativo: 'oponente',
      jogadaFeita: true,
      oponente: { campo: [{ id: 'CC-003', pos: 'DEFESA' }, { id: 'CC-001', pos: 'ATAQUE' }] },
      humano: { campo: ['CC-001'] },
    })
    // CC-003 (1600) vence 1200 e não é mais fraca: deve ir a ataque
    expect(decide(e)).toEqual({ tipo: 'mudarPosicao', jogador: 'oponente', zona: 0, posicao: 'ATAQUE' })
    // CC-001 (1200) empata com o atacante inimigo (não vence): vai a defesa
    const e2 = ok(aplicarComando(e, decide(e)))
    expect(decide(e2)).toEqual({ tipo: 'mudarPosicao', jogador: 'oponente', zona: 1, posicao: 'DEFESA' })
  })

  it('depois das posições avança para o combate; no turno 1 absoluto apenas encerra', () => {
    const e = cenario({ ativo: 'oponente', jogadaFeita: true, oponente: { campo: [{ id: 'CC-003', pos: 'ATAQUE' }] }, humano: { campo: ['CC-001'] } })
    expect(decide(e)).toEqual({ tipo: 'avancarFase', jogador: 'oponente' })
    const t1 = cenario({ turno: 1, jogadaFeita: true, humano: { campo: ['CC-003'] } })
    expect(decide(t1, 'humano')).toEqual({ tipo: 'encerrarTurno', jogador: 'humano' })
  })

  it('ataca diretamente quando o adversário não tem unidades', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-001', 'CC-003'] } })
    expect(decide(e)).toEqual({ tipo: 'atacar', jogador: 'oponente', atacante: 1, alvo: 'direto' }) // maior ATK primeiro
  })

  it('ataca a unidade que consegue vencer, preferindo remover a mais forte', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-071'] }, humano: { campo: ['CC-001', 'CC-056', 'CC-013'] } })
    // 2400 vence 2200 (zona 1), 1200 (0) e 700 (2): prefere a de maior ATK
    expect(decide(e)).toMatchObject({ tipo: 'atacar', atacante: 0, alvo: 1 })
  })

  it('nunca ataca unidade em defesa mais alta (dano ao próprio LP) nem empata trocando unidades', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-001'] }, humano: { campo: [{ id: 'CC-004', pos: 'DEFESA' }] } })
    expect(decide(e)).toEqual({ tipo: 'encerrarTurno', jogador: 'oponente' })
    const empate = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-003'] }, humano: { campo: ['CC-003'] } })
    expect(decide(empate)).toEqual({ tipo: 'encerrarTurno', jogador: 'oponente' })
    const fraco = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-001'] }, humano: { campo: ['CC-003'] } })
    expect(decide(fraco)).toEqual({ tipo: 'encerrarTurno', jogador: 'oponente' })
  })

  it('destrói unidade em defesa quando o ATK é maior', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: ['CC-003'] }, humano: { campo: [{ id: 'CC-047', pos: 'DEFESA' }] } })
    expect(decide(e)).toMatchObject({ tipo: 'atacar', alvo: 0 })
  })

  it('ataca alvo oculto sem consultar identidade/atributos: usa o atacante mais forte e menor zona no desempate', () => {
    const montarOculta = (id: string) =>
      cenarioCombate({
        ativo: 'oponente',
        oponente: { campo: ['CC-003', 'CC-007'] },
        humano: { campo: [null, { id, pos: 'ATAQUE', viradaParaBaixo: true }] },
      })
    const fraca = montarOculta('CC-013')
    const forte = montarOculta('CC-056')
    expect(JSON.stringify(visaoParaJogador(fraca, 'oponente'))).toBe(JSON.stringify(visaoParaJogador(forte, 'oponente')))
    expect(decide(fraca)).toEqual({ tipo: 'atacar', jogador: 'oponente', atacante: 1, alvo: 1 })
    expect(decide(forte)).toEqual(decide(fraca))
  })

  it('unidades em DEFESA ou que já atacaram não atacam', () => {
    const e = cenarioCombate({ ativo: 'oponente', oponente: { campo: [{ id: 'CC-003', pos: 'DEFESA' }, { id: 'CC-007', atacou: true }] } })
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
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-001'], campo: ['CC-071'], baralho: 10 }, humano: { lp: 2000, baralho: 10 } })
    const r = executarTurnoIA(e)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.estado.resultado).toEqual({ vencedor: 'oponente', motivo: 'lp' })
  })

  it('o IA descarta quando não há jogada e ainda assim encerra o turno', () => {
    const e = cenario({
      ativo: 'oponente',
      oponente: { mao: ['CC-003', 'CC-013', 'CC-001', 'CC-007', 'CC-004'], campo: ['CC-002', 'CC-004', 'CC-005', 'CC-006', 'CC-009'], baralho: 20 },
      humano: { baralho: 20 },
    })
    const r = executarTurnoIA(e)
    expect(r.ok && r.eventos.some((x) => x.tipo === 'descarte_forcado')).toBe(true)
    if (r.ok) expect(r.estado.ativo).toBe('humano')
  })

  it('perde por compra incompleta ao passar a vez (a IA nunca trava, o jogo apenas termina)', () => {
    const e = cenario({ ativo: 'oponente', oponente: { mao: ['CC-001'], baralho: 5 }, humano: { mao: ['CC-001', 'CC-002'], baralho: 1 } })
    const r = executarTurnoIA(e)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.estado.resultado).toEqual({ vencedor: 'oponente', motivo: 'compra' })
  })
})
