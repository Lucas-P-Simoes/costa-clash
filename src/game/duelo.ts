// API de alto nível: criar um duelo e executar o turno completo da IA.
import { CATALOGO } from '../data/catalogo'
import { aplicarComando, iniciarTurno, listarJogadas } from './acoes'
import type { Comando, ResultadoComando } from './acoes'
import { validarBaralhoDuelo } from './baralho'
import { criarEstadoInicial, emitir, mapaCatalogo } from './estado'
import type { CartaInstancia, Ctx, Evento, EstadoDuelo } from './estado'
import { decidirComando } from './ia'
import { criarRng, embaralhar } from './rng'
import type { Rng } from './rng'
import { CARTAS_NO_DUELO } from './tipos'
import type { Carta } from './tipos'
import { visaoParaJogador } from './visao'
import type { VisaoDuelo } from './visao'

export interface OpcoesDuelo {
  /** 40 IDs de carta do jogador humano (perfil do usuário ou baralho inicial padrão). */
  baralhoJogador: readonly string[]
  /** 40 IDs de carta do oponente (ver `baralhosOponentes.ts`). */
  baralhoOponente: readonly string[]
  /** Seed do embaralhamento (determinístico). */
  seed: number
  /** Opcional: RNG já pronto (sobrepõe `seed`). */
  rng?: Rng
  /** Tutorial: não embaralha; os baralhos já vêm na ordem de compra (as 5 primeiras são a mão). Só 30 por lado entram. */
  ordemFixa?: boolean
  /** Tutorial: vida inicial do oponente (padrão: a vida normal). */
  lpOponente?: number
  catalogo?: readonly Carta[]
}

export type ResultadoCriarDuelo = { ok: true; estado: EstadoDuelo; eventos: Evento[] } | { ok: false; erros: string[] }

/**
 * Valida os dois baralhos, embaralha (humano primeiro, depois oponente, mesmo RNG), compra a mão inicial de 5
 * para ambos e abre o turno 1 do humano (que não compra extra). O estado devolvido está na fase PRINCIPAL.
 * Só 30 cartas por lado entram no duelo (as 30 primeiras após embaralhar).
 * uids: `h1..h40` (humano) e `o1..o40` (oponente), pela posição original no baralho informado.
 */
export function criarDuelo(op: OpcoesDuelo): ResultadoCriarDuelo {
  const catalogo = op.catalogo ?? CATALOGO
  const erros: string[] = []
  for (const [nome, ids] of [
    ['jogador', op.baralhoJogador],
    ['oponente', op.baralhoOponente],
  ] as const) {
    const v = validarBaralhoDuelo(ids, catalogo)
    if (!v.ok) erros.push(...v.erros.map((m) => `Baralho do ${nome}: ${m}`))
  }
  if (erros.length > 0) return { ok: false, erros }

  const rng = op.rng ?? criarRng(op.seed)
  const instancias = (prefixo: string, ids: readonly string[]): CartaInstancia[] => ids.map((cartaId, i) => ({ uid: `${prefixo}${i + 1}`, cartaId }))
  // Baralhos de 40 são embaralhados e só as 30 primeiras entram no duelo (as demais ficam de fora).
  const ordenar = (cartas: CartaInstancia[]) => (op.ordemFixa ? cartas : embaralhar(cartas, rng))
  const h = ordenar(instancias('h', op.baralhoJogador)).slice(0, CARTAS_NO_DUELO)
  const o = ordenar(instancias('o', op.baralhoOponente)).slice(0, CARTAS_NO_DUELO)
  const e = criarEstadoInicial(h, o)
  if (op.lpOponente !== undefined && Number.isInteger(op.lpOponente) && op.lpOponente > 0) e.jogadores.oponente.lp = op.lpOponente
  const ctx: Ctx = { e, ev: [], cat: mapaCatalogo(catalogo) }
  emitir(ctx, { tipo: 'compra', jogador: 'humano', cartas: e.jogadores.humano.mao.map((c) => ({ ...c })) }, 'Você compra a mão inicial de 5 cartas.')
  emitir(ctx, { tipo: 'compra', jogador: 'oponente', cartas: e.jogadores.oponente.mao.map((c) => ({ ...c })) }, 'O oponente compra a mão inicial de 5 cartas.')
  iniciarTurno(ctx)
  e.log = ctx.ev.slice()
  return { ok: true, estado: e, eventos: ctx.ev }
}

const LIMITE_COMANDOS_IA = 60

/** Quem escolhe o próximo comando da IA (padrão: `decidirComando`; o tutorial usa uma IA que nunca ataca). */
export type DecisorIA = (visao: VisaoDuelo, catalogo?: readonly Carta[]) => Comando

/** Um comando da IA já aplicado: o estado resultante e os eventos que ele gerou (para reprodução passo a passo). */
export interface PassoIA {
  estado: EstadoDuelo
  eventos: Evento[]
}

export type ResultadoTurnoIA = { ok: true; estado: EstadoDuelo; eventos: Evento[]; passos: PassoIA[] } | { ok: false; erro: string; estado: EstadoDuelo }

/**
 * Executa o turno COMPLETO do jogador ativo (por convenção o oponente/IA; para simulações IA×IA funciona
 * para qualquer um) até passar a vez ou terminar a partida. Devolve todos os eventos, em ordem, para animação,
 * e também os `passos` (estado após cada comando) para a UI reproduzir o tabuleiro gradualmente.
 * A IA só enxerga `visaoParaJogador`. Totalmente determinística: `_seed` é reservado e hoje não influencia nada.
 * Se algum comando da IA fosse rejeitado, recorre a uma jogada legal e registra `ia_fallback` (nunca trava).
 */
export function executarTurnoIAComPassos(estado: EstadoDuelo, _seed?: number, catalogo: readonly Carta[] = CATALOGO, decisor: DecisorIA = decidirComando): ResultadoTurnoIA {
  if (estado.resultado) return { ok: false, erro: 'A partida já terminou.', estado }
  const cat = mapaCatalogo(catalogo)
  const jogador = estado.ativo
  const turnoInicial = estado.turno
  let atual = estado
  const eventos: Evento[] = []
  const passos: PassoIA[] = []
  const aplicar = (cmd: Comando): boolean => {
    const r = aplicarComando(atual, cmd, catalogo)
    if (!r.ok) return false
    atual = r.estado
    eventos.push(...r.eventos)
    passos.push({ estado: r.estado, eventos: r.eventos })
    return true
  }
  for (let i = 0; i < LIMITE_COMANDOS_IA && !atual.resultado && atual.turno === turnoInicial; i++) {
    const cmd = decisor(visaoParaJogador(atual, jogador), catalogo)
    if (aplicar(cmd)) continue
    // recuperação: primeira jogada legal, senão encerrar o turno
    const motivo = `comando rejeitado: ${cmd.tipo}`
    const ev: Evento = { tipo: 'ia_fallback', jogador, motivo, turno: atual.turno, texto: 'A IA recorreu a uma jogada de recuperação.' }
    eventos.push(ev)
    atual = { ...atual, log: atual.log.concat(ev) }
    passos.push({ estado: atual, eventos: [ev] })
    const legal = listarJogadas(atual, cat)[0]
    if (legal && aplicar(legal)) continue
    if (aplicar({ tipo: 'encerrarTurno', jogador })) continue
    aplicar({ tipo: 'desistir', jogador })
  }
  if (!atual.resultado && atual.turno === turnoInicial) {
    // limite excedido (não deveria ocorrer): força o fim do turno ou a desistência
    if (!aplicar({ tipo: 'encerrarTurno', jogador })) aplicar({ tipo: 'desistir', jogador })
  }
  return { ok: true, estado: atual, eventos, passos }
}

/** Versão sem `passos`: `{ ok, estado, eventos }` como os demais comandos. */
export function executarTurnoIA(estado: EstadoDuelo, seed?: number, catalogo: readonly Carta[] = CATALOGO): ResultadoComando {
  const r = executarTurnoIAComPassos(estado, seed, catalogo)
  return r.ok ? { ok: true, estado: r.estado, eventos: r.eventos } : r
}
