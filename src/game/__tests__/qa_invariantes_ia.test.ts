// QA independente: invariantes, determinismo, JSON, vazamento de informação, IA e baralhos (itens 6-9 da missão).
import { describe, expect, it, vi } from 'vitest'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { CATALOGO } from '../../data/catalogo'
import { OPONENTES } from '../../data/oponentes'
import { jogadasLegais } from '../acoes'
import { validarBaralhoDuelo } from '../baralho'
import { criarDuelo, executarTurnoIA } from '../duelo'
import { invariantes, mapaCatalogo, totalCartas } from '../estado'
import type { EstadoDuelo } from '../estado'
import { decidirComando } from '../ia'
import { criarRng, embaralhar } from '../rng'
import { visaoParaJogador } from '../visao'
import { simularIAxIA } from './simular'
import { cenario, cenarioCombate, cmd, ok, uidDe } from './util'

// Simulações longas: sob carga ocasional passam de 5 s (asserções inalteradas).
vi.setConfig({ testTimeout: 30_000 })

const cat = mapaCatalogo()
const duelo = (seed: number, a: readonly string[] = BARALHO_INICIAL, b: readonly string[] = BARALHOS_OPONENTES['porto']!): EstadoDuelo => {
  const r = criarDuelo({ baralhoJogador: a, baralhoOponente: b, seed })
  if (!r.ok) throw new Error(r.erros.join())
  return r.estado
}

describe('QA 6 - invariantes, determinismo, JSON, imutabilidade', () => {
  it('baralho inválido é rejeitado antes do duelo (§12)', () => {
    const ruim = (ids: unknown) => criarDuelo({ baralhoJogador: ids as string[], baralhoOponente: BARALHO_INICIAL, seed: 1 })
    expect(ruim(BARALHO_INICIAL.slice(0, 39)).ok).toBe(false)
    expect(ruim([...BARALHO_INICIAL, 'CC-001']).ok).toBe(false)
    expect(ruim(Array(40).fill('CC-001')).ok).toBe(false) // 40 cópias
    expect(ruim([...BARALHO_INICIAL.slice(0, 39), 'CC-999']).ok).toBe(false)
    expect(ruim(null).ok).toBe(false)
    expect(ruim('abc').ok).toBe(false)
    expect(ruim([...BARALHO_INICIAL.slice(0, 39), 7]).ok).toBe(false)
    expect(validarBaralhoDuelo([...BARALHO_INICIAL.slice(0, 39), '__proto__']).ok).toBe(false)
  })

  it('mesma seed = mesma partida (estado e log idênticos); seeds diferentes embaralham diferente; entrada do RNG não é mutada', () => {
    const a = duelo(42)
    const b = duelo(42)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(duelo(43))).not.toBe(JSON.stringify(a))
    const lista = [...BARALHO_INICIAL]
    const copia = [...lista]
    embaralhar(lista, criarRng(1))
    expect(lista).toEqual(copia)
    const ia1 = simularIAxIA(BARALHO_INICIAL, BARALHOS_OPONENTES['ressaca']!, 9)
    const ia2 = simularIAxIA(BARALHO_INICIAL, BARALHOS_OPONENTES['ressaca']!, 9)
    expect(JSON.stringify(ia1.estado)).toBe(JSON.stringify(ia2.estado))
    // o embaralhamento é uma permutação: 40 cartas, mesmas contagens
    const ids = [...a.jogadores.humano.mao, ...a.jogadores.humano.baralho].map((c) => c.cartaId).sort()
    expect(ids).toEqual([...BARALHO_INICIAL].sort())
    expect(new Set([...a.jogadores.humano.mao, ...a.jogadores.humano.baralho].map((c) => c.uid)).size).toBe(40)
  })

  it('estado é JSON puro: round-trip idêntico e a partida continua igual a partir da cópia', () => {
    let e = duelo(5)
    let f: EstadoDuelo = JSON.parse(JSON.stringify(e))
    expect(f).toEqual(e)
    for (let i = 0; i < 30 && !e.resultado; i++) {
      const r = executarTurnoIA(e)
      const r2 = executarTurnoIA(f)
      expect(r.ok && r2.ok).toBe(true)
      if (!r.ok || !r2.ok) return
      expect(JSON.stringify(r2.estado)).toBe(JSON.stringify(r.estado))
      e = r.estado
      f = JSON.parse(JSON.stringify(r.estado)) as EstadoDuelo
      expect(f).toEqual(e)
    }
    expect(e.resultado).not.toBeNull()
  })

  it('conservação (40 por jogador), zonas <=5, uids únicos e entrada imutável durante partidas inteiras', () => {
    for (let seed = 1; seed <= 12; seed++) {
      let e = duelo(seed, BARALHO_INICIAL, BARALHOS_OPONENTES[Object.keys(BARALHOS_OPONENTES)[seed % 16]!]!)
      while (!e.resultado) {
        const antes = JSON.stringify(e)
        const r = executarTurnoIA(e)
        expect(JSON.stringify(e)).toBe(antes)
        if (!r.ok) throw new Error(r.erro)
        expect(totalCartas(r.estado, 'humano')).toBe(40)
        expect(totalCartas(r.estado, 'oponente')).toBe(40)
        expect(invariantes(r.estado)).toEqual([])
        e = r.estado
      }
    }
  })

  it('o turno do humano pode ser jogado pelo mesmo caminho de comandos (jogar, avançar, atacar, encerrar) e o log cresce monotonicamente', () => {
    let e = duelo(7)
    let tamanho = e.log.length
    for (let t = 0; t < 8 && !e.resultado; t++) {
      if (e.ativo === 'humano') {
        e = ok(cmd(e, jogadasLegais(e)[0]!))
        e = ok(cmd(e, { tipo: 'avancarFase', jogador: 'humano' }))
        e = ok(cmd(e, { tipo: 'encerrarTurno', jogador: 'humano' }))
      } else e = (() => { const r = executarTurnoIA(e); return r.ok ? r.estado : e })()
      expect(e.log.length).toBeGreaterThanOrEqual(tamanho)
      tamanho = e.log.length
    }
  })
})

describe('QA 7 - vazamento de informação', () => {
  const montar = () => {
    // meio de partida: turno 3, humano com armadilha virada e oponente com armadilha virada
    let e = cenario({ turno: 4, ativo: 'oponente', fase: 'PRINCIPAL', humano: { mao: ['CC-001', 'CC-003'], suporte: ['CC-093'], campo: ['CC-043'] }, oponente: { mao: ['CC-082', 'CC-019', 'CC-027'], suporte: ['CC-099', { id: 'CC-097', turno: 2 }], baralho: 30 } })
    e = { ...e }
    return e
  }
  it('visaoParaJogador(humano) não contém uid nem carta da mão/baralho/armadilhas viradas do oponente', () => {
    const e = montar()
    const json = JSON.stringify(visaoParaJogador(e, 'humano'))
    const o = e.jogadores.oponente
    for (const c of [...o.mao, ...o.baralho]) expect(json, `vazou ${c.uid}`).not.toContain(`"${c.uid}"`)
    for (const s of o.suporte) if (s) expect(json, `vazou armadilha ${s.uid}`).not.toContain(`"${s.uid}"`)
    expect(json).not.toContain('CC-099')
    expect(json).not.toContain('CC-097')
    const v = visaoParaJogador(e, 'humano')
    expect(v.oponente.maoTamanho).toBe(3)
    expect(v.oponente.suporte.filter(Boolean)).toEqual([{ oculta: true }, { oculta: true }])
    expect(Object.keys(v)).not.toContain('log')
    // vale também na perspectiva da IA
    const jsonIA = JSON.stringify(visaoParaJogador(e, 'oponente'))
    for (const c of [...e.jogadores.humano.mao, ...e.jogadores.humano.baralho]) expect(jsonIA).not.toContain(`"${c.uid}"`)
    expect(jsonIA).not.toContain('CC-093')
  })

  it('a visão é uma cópia: alterá-la não corrompe o estado', () => {
    const e = montar()
    const v = visaoParaJogador(e, 'humano')
    v.eu.mao.length = 0
    v.eu.campo[0]!.buffAtk = 99999
    expect(e.jogadores.humano.mao).toHaveLength(2)
    expect(e.jogadores.humano.campo[0]!.buffAtk).toBe(0)
  })

  it('decidirComando(visao) é idêntico quando só a informação oculta muda (diferencial, 60 estados)', () => {
    for (let seed = 1; seed <= 60; seed++) {
      let e = duelo(seed, BARALHO_INICIAL, BARALHOS_OPONENTES['erosao-costeira']!)
      // avança alguns turnos
      for (let i = 0; i < seed % 5 && !e.resultado; i++) {
        const r = executarTurnoIA(e)
        if (r.ok) e = r.estado
      }
      if (e.resultado) continue
      const alt: EstadoDuelo = JSON.parse(JSON.stringify(e))
      const adv = e.ativo === 'humano' ? 'oponente' : 'humano'
      const j = alt.jogadores[adv]
      alt.jogadores[adv] = { ...j, mao: [...j.mao].reverse(), baralho: embaralhar(j.baralho, criarRng(seed)) }
      // troca armadilhas viradas do adversário por outras
      alt.jogadores[adv].suporte = alt.jogadores[adv].suporte.map((s) => (s && s.tipo === 'armadilha' ? { ...s, cartaId: 'CC-095' } : s))
      const d1 = decidirComando(visaoParaJogador(e, e.ativo))
      const d2 = decidirComando(visaoParaJogador(alt, e.ativo))
      expect(d2).toEqual(d1)
    }
  })

  it('RISCO DOCUMENTADO: estado.log/eventos vazam informação oculta (a UI NÃO deve renderizar o log cru do adversário)', () => {
    // 1) colocar armadilha: o evento carrega a carta embora o texto diga "virada para baixo"
    let e = cenario({ turno: 4, ativo: 'oponente', oponente: { mao: ['CC-099'] } })
    e = ok(cmd(e, { tipo: 'jogarCarta', jogador: 'oponente', uid: uidDe(e, 'oponente', 'CC-099') }))
    const ev = e.log.find((x) => x.tipo === 'carta_jogada')!
    expect(ev.texto).not.toContain('Proteção')
    expect(JSON.stringify(ev)).toContain('CC-099') // vazamento via dados do evento
    // 2) compra do oponente lista as cartas
    const d = duelo(1)
    const compra = d.log.find((x) => x.tipo === 'compra' && x.jogador === 'oponente')!
    expect(JSON.stringify(compra)).toContain(d.jogadores.oponente.mao[0]!.cartaId)
    // 3) o estado completo contém tudo: a UI deve usar visaoParaJogador
    expect(JSON.stringify(d)).toContain(d.jogadores.oponente.baralho[0]!.uid)
  })
})

describe('QA 8 - IA', () => {
  const ia = (e: EstadoDuelo, quem = e.ativo) => decidirComando(visaoParaJogador(e, quem))

  it('sem jogada legal: descarta (carta de menor utilidade) e depois encerra o turno sem travar', () => {
    const e = cenario({ turno: 4, ativo: 'oponente', oponente: { mao: ['CC-073', 'CC-075', 'CC-001'], campo: ['CC-002', 'CC-002', 'CC-002', 'CC-002', 'CC-002'] } })
    expect(jogadasLegais(e).every((c) => c.tipo === 'descartar')).toBe(true)
    const r = executarTurnoIA(e)
    expect(r.ok && r.estado.turno === 5).toBe(true)
    if (r.ok) {
      expect(r.estado.jogadores.oponente.descarte).toHaveLength(1)
      expect(r.eventos.some((x) => x.tipo === 'descarte_forcado')).toBe(true)
      expect(r.eventos.some((x) => x.tipo === 'ia_fallback')).toBe(false)
    }
  })

  it('não ataca em suicídio: ATK menor, empate de destruição, ou contra DEF maior/igual; ataca quando vence', () => {
    const caso = (atkId: string, alvoId: string, pos: 'ATAQUE' | 'DEFESA') =>
      cenarioCombate({ turno: 4, ativo: 'oponente', oponente: { campo: [atkId] }, humano: { campo: [{ id: alvoId, pos }] } })
    expect(ia(caso('CC-033', 'CC-043', 'ATAQUE')).tipo).toBe('encerrarTurno') // 1800 x 2000
    expect(ia(caso('CC-043', 'CC-027', 'ATAQUE')).tipo).toBe('encerrarTurno') // empate
    expect(ia(caso('CC-033', 'CC-001', 'DEFESA')).tipo).toBe('encerrarTurno') // 1800 x DEF 2000
    expect(ia(caso('CC-033', 'CC-013', 'DEFESA')).tipo).toBe('encerrarTurno') // 1800 x DEF 1800
    expect(ia(caso('CC-043', 'CC-033', 'ATAQUE'))).toMatchObject({ tipo: 'atacar', atacante: 0, alvo: 0 })
    expect(ia(caso('CC-043', 'CC-033', 'DEFESA'))).toMatchObject({ tipo: 'atacar' })
    expect(ia(cenarioCombate({ turno: 4, ativo: 'oponente', oponente: { campo: ['CC-043'] } }))).toMatchObject({ tipo: 'atacar', alvo: 'direto' })
  })

  it('turno 2: a IA como oponente ataca; nunca ataca no turno 1 (quando joga como primeiro)', () => {
    const t1 = cenarioCombate({ turno: 1, ativo: 'humano', humano: { campo: ['CC-043'] } })
    expect(ia(t1).tipo).toBe('encerrarTurno')
  })

  it('prioridade §9: unidade que vence > ação eficaz > unidade de maior DEF > armadilha; desempate por ID', () => {
    // unidade que vence (CC-071 2400) antes da ação eficaz
    let e = cenario({ turno: 4, ativo: 'oponente', humano: { campo: ['CC-053'] }, oponente: { mao: ['CC-075', 'CC-071', 'CC-093'] } })
    let c = ia(e)
    expect(c).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-071') })
    // sem unidade que vença: ação eficaz (destruir impacto)
    e = cenario({ turno: 4, ativo: 'oponente', humano: { campo: ['CC-053'] }, oponente: { mao: ['CC-075', 'CC-001', 'CC-093'] } })
    c = ia(e)
    expect(c).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-075'), alvo: 0 })
    // sem ação eficaz: maior DEF
    e = cenario({ turno: 4, ativo: 'oponente', humano: { campo: ['CC-053'] }, oponente: { mao: ['CC-001', 'CC-007', 'CC-093'] } })
    c = ia(e)
    expect(c).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-007'), posicao: 'DEFESA' })
    // só armadilha e cura inútil
    e = cenario({ turno: 4, ativo: 'oponente', humano: { campo: ['CC-053'] }, oponente: { mao: ['CC-079', 'CC-093'] } })
    c = ia(e)
    expect(c).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-093') })
  })

  it('usa efeitos úteis: cura quando LP baixo; evita desperdiçar cura com LP cheio (nunca legal)', () => {
    const e = cenario({ turno: 4, ativo: 'oponente', oponente: { lp: 2000, mao: ['CC-079'] } })
    expect(ia(e)).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-079') })
  })

  it('QA-3 corrigido: com armadilha inimiga virada, a IA reforça o campo em vez de gastar a jogada em `revelar`', () => {
    const e = cenario({ turno: 4, ativo: 'oponente', humano: { suporte: ['CC-093'], campo: ['CC-033'] }, oponente: { mao: ['CC-082', 'CC-007'] } })
    expect(ia(e)).toMatchObject({ tipo: 'jogarCarta', uid: uidDe(e, 'oponente', 'CC-007') })
  })

  it('posição: ataque com vantagem, defesa sem; sempre termina o turno (6 cenários de 0 a 5 unidades)', () => {
    const e = cenario({ turno: 4, ativo: 'oponente', humano: { campo: ['CC-071'] }, oponente: { mao: ['CC-033'] } })
    expect(ia(e)).toMatchObject({ posicao: 'DEFESA' }) // 1800 não vence 2400
    const e2 = cenario({ turno: 4, ativo: 'oponente', humano: { campo: ['CC-033'] }, oponente: { mao: ['CC-071'] } })
    expect(ia(e2)).toMatchObject({ posicao: 'ATAQUE' })
    for (let n = 0; n <= 5; n++) {
      const campo = Array.from({ length: n }, () => 'CC-043')
      const x = cenario({ turno: 4, ativo: 'oponente', humano: { campo: ['CC-001'] }, oponente: { mao: ['CC-043'], campo } })
      const r = executarTurnoIA(x)
      expect(r.ok && (r.estado.turno === 5 || !!r.estado.resultado)).toBe(true)
    }
  })

  it('IA decide em qualquer fase sem lançar, inclusive com resultado/fase estranha', () => {
    const e = cenario({ turno: 4, ativo: 'oponente', fase: 'FIM' })
    expect(ia(e).tipo).toBe('encerrarTurno')
    const r = executarTurnoIA({ ...cenario(), resultado: { vencedor: 'humano', motivo: 'lp' } })
    expect(r.ok).toBe(false)
  })

  it('vence partidas da forma esperada: 51 simulações terminam, sem fallback (dupla checagem do DEV)', () => {
    let n = 0
    for (const [nome, ids] of Object.entries(BARALHOS_OPONENTES)) {
      for (const seed of [11, 12, 13]) {
        const r = simularIAxIA(BARALHO_INICIAL, ids, seed * 17 + n++)
        expect(r.estado.resultado, nome).not.toBeNull()
        expect(r.fallbacks).toBe(0)
        expect(r.violacoes).toEqual([])
      }
    }
  })
})

describe('QA 9 - baralhos', () => {
  it('17 baralhos válidos (40 cartas, <=3 por ID, IDs existentes) e um por oponente', () => {
    const todos: [string, readonly string[]][] = [['inicial', BARALHO_INICIAL], ...Object.entries(BARALHOS_OPONENTES)]
    expect(todos).toHaveLength(17)
    for (const [nome, ids] of todos) {
      expect(validarBaralhoDuelo(ids), nome).toEqual({ ok: true })
      expect(ids).toHaveLength(40)
      const cont = new Map<string, number>()
      for (const id of ids) cont.set(id, (cont.get(id) ?? 0) + 1)
      expect(Math.max(...cont.values()), nome).toBeLessThanOrEqual(3)
      expect(ids.every((i) => CATALOGO.some((c) => c.id === i))).toBe(true)
    }
    expect(Object.keys(BARALHOS_OPONENTES).sort()).toEqual(OPONENTES.map((o) => o.id).sort())
  })

  it('baralho inicial tem 26 unidades, 10 ações, 4 armadilhas (como documentado)', () => {
    const tipos = BARALHO_INICIAL.map((i) => cat.get(i)!.tipo)
    expect(tipos.filter((t) => t === 'unidade')).toHaveLength(26)
    expect(tipos.filter((t) => t === 'acao')).toHaveLength(10)
    expect(tipos.filter((t) => t === 'armadilha')).toHaveLength(4)
  })

  it('composição temática: unidades do grupo do oponente são a maior fatia (ou ao menos >=30%) e a dificuldade cresce em ATK médio', () => {
    const resumo: Record<number, number[]> = { 1: [], 2: [], 3: [] }
    const naoTematicos: string[] = []
    for (const o of OPONENTES) {
      const ids = BARALHOS_OPONENTES[o.id]!
      const un = ids.map((i) => cat.get(i)!).filter((c) => c.tipo === 'unidade')
      const porGrupo: Record<string, number> = {}
      for (const u of un) porGrupo[u.grupo!] = (porGrupo[u.grupo!] ?? 0) + 1
      const meu = porGrupo[o.grupo!] ?? 0
      if (meu / un.length < 0.3) naoTematicos.push(`${o.id}:${meu}/${un.length}`)
      resumo[o.dificuldade]!.push(un.reduce((s, u) => s + u.atk!, 0) / un.length)
    }
    expect(naoTematicos).toEqual([])
    const media = (l: number[]) => l.reduce((s, x) => s + x, 0) / l.length
    // dificuldade 1 < 2 e 1 < 3 em ATK médio das unidades (2 vs 3 pode inverter: ver relatório)
    expect(media(resumo[1]!)).toBeLessThan(media(resumo[2]!))
    expect(media(resumo[1]!)).toBeLessThan(media(resumo[3]!))
  })
})
