// IA determinística (§9). Recebe APENAS uma VisaoDuelo (sem mão/baralho do adversário nem ordem futura)
// e devolve o próximo comando. Sem aleatoriedade: desempates por ID de carta crescente (depois uid/zona).
import { CATALOGO } from '../data/catalogo'
import { atkEfetivo, bonusTerreno, defEfetiva } from './combate'
import { analisarAcao } from './efeitos'
import { listarJogadas } from './acoes'
import type { Comando, ComandoJogarCarta } from './acoes'
import { mapaCatalogo, outro } from './estado'
import type { Catalogo, EstadoDuelo, IdJogador, Posicao } from './estado'
import { estadoDeVisao } from './visao'
import type { VisaoDuelo } from './visao'
import { VIDA_INICIAL } from './tipos'
import type { Carta } from './tipos'

interface Inimigo {
  zona: number
  posicao: Posicao
  atk: number
  def: number
  cartaId: string
}

function inimigos(e: EstadoDuelo, eu: IdJogador, cat: Catalogo): Inimigo[] {
  const adv = outro(eu)
  const r: Inimigo[] = []
  e.jogadores[adv].campo.forEach((u, zona) => {
    if (u) r.push({ zona, posicao: u.posicao, atk: atkEfetivo(e, adv, u, cat), def: defEfetiva(e, adv, u, cat), cartaId: u.cartaId })
  })
  return r
}

/** O atacante projetado vence ao menos um combate (ou o adversário está sem unidades: ataque direto). */
function vence(atk: number, inim: Inimigo[]): boolean {
  return inim.length === 0 || inim.some((t) => atk > (t.posicao === 'ATAQUE' ? t.atk : t.def))
}

/** "Vantagem atual": vence algum combate e não é mais fraca que nenhum atacante inimigo. */
function temVantagem(atk: number, inim: Inimigo[]): boolean {
  return inim.length === 0 || (vence(atk, inim) && inim.filter((t) => t.posicao === 'ATAQUE').every((t) => atk >= t.atk))
}

function contarGrupo(e: EstadoDuelo, dono: IdJogador, grupo: string, cat: Catalogo): number {
  return e.jogadores[dono].campo.filter((u) => u && cat.get(u.cartaId)?.grupo === grupo).length
}

function saldoTerreno(e: EstadoDuelo, eu: IdJogador, carta: Carta | undefined, cat: Catalogo): number {
  const ef = carta?.efeito
  if (!ef || ef.operacao !== 'field_bonus' || !ef.alvo) return 0
  const n = (dono: IdJogador) =>
    ef.alvo === 'qualquer' ? e.jogadores[dono].campo.filter(Boolean).length : contarGrupo(e, dono, ef.alvo as string, cat)
  return (n(eu) - n(outro(eu))) * Math.abs(ef.valor)
}

const PESO_ACAO: Readonly<Record<string, number>> = {
  destruir_grupo: 6,
  debuff_grupo: 5,
  buff_unidade: 4,
  buff_grupo: 4,
  equip_buff_atk: 4,
  equip_buff_def: 4,
  field_bonus: 3,
  cura: 2,
  revelar: 1,
}

interface Candidato {
  cmd: ComandoJogarCarta
  /** 0 = unidade que vence combate; 1 = ação eficaz; 2 = unidade (maior DEF); 3 = armadilha; 4 = demais. */
  nivel: number
  /** Maior = melhor (comparação lexicográfica). */
  chave: number[]
  cartaId: string
}

function compararCandidatos(a: Candidato, b: Candidato): number {
  if (a.nivel !== b.nivel) return a.nivel - b.nivel
  for (let i = 0; i < Math.max(a.chave.length, b.chave.length); i++) {
    const d = (b.chave[i] ?? 0) - (a.chave[i] ?? 0)
    if (d !== 0) return d
  }
  if (a.cartaId !== b.cartaId) return a.cartaId < b.cartaId ? -1 : 1
  if (a.cmd.uid !== b.cmd.uid) return a.cmd.uid < b.cmd.uid ? -1 : 1
  return (a.cmd.alvo ?? -1) - (b.cmd.alvo ?? -1)
}

function avaliar(e: EstadoDuelo, cat: Catalogo, eu: IdJogador, cmd: ComandoJogarCarta, inim: Inimigo[]): Candidato | null {
  const inst = e.jogadores[eu].mao.find((c) => c.uid === cmd.uid)
  const carta = inst ? cat.get(inst.cartaId) : undefined
  if (!inst || !carta) return null
  if (carta.tipo === 'unidade') {
    const bt = bonusTerreno(e, carta.grupo, cat)
    const atk = Math.max(0, (carta.atk ?? 0) + bt)
    const def = Math.max(0, (carta.defesa ?? 0) + bt)
    const desejada: Posicao = temVantagem(atk, inim) ? 'ATAQUE' : 'DEFESA'
    if (cmd.posicao !== desejada) return null
    return vence(atk, inim)
      ? { cmd, nivel: 0, chave: [atk, def], cartaId: carta.id }
      : { cmd, nivel: 2, chave: [def, atk], cartaId: carta.id }
  }
  if (carta.tipo === 'armadilha') return { cmd, nivel: 3, chave: [0], cartaId: carta.id }
  const ef = carta.efeito
  const op = ef?.operacao ?? ''
  const peso = PESO_ACAO[op] ?? 0
  let eficaz = true
  let qualidade = 0
  if (cmd.alvo !== undefined) {
    const a = analisarAcao(e, eu, carta, cat)
    const dono = a.donoAlvo ?? eu
    const u = e.jogadores[dono].campo[cmd.alvo]
    qualidade = u ? atkEfetivo(e, dono, u, cat) : 0
  } else if (op === 'cura') {
    eficaz = e.jogadores[eu].lp <= VIDA_INICIAL - Math.abs(ef?.valor ?? 0)
    qualidade = Math.abs(ef?.valor ?? 0)
  } else if (op === 'revelar') {
    // A IA não usa a informação revelada (não há estratégia que a aproveite): nunca é "eficaz" (nível 4).
    eficaz = false
  } else if (op === 'field_bonus') {
    const saldo = saldoTerreno(e, eu, carta, cat)
    const atual = e.terreno ? saldoTerreno(e, eu, cat.get(e.terreno.cartaId), cat) : 0
    eficaz = saldo > 0 && saldo > atual
    qualidade = saldo
  }
  return eficaz ? { cmd, nivel: 1, chave: [peso, qualidade], cartaId: carta.id } : { cmd, nivel: 4, chave: [peso, qualidade], cartaId: carta.id }
}

function escolherJogada(e: EstadoDuelo, cat: Catalogo, eu: IdJogador): Comando {
  const opcoes = listarJogadas(e, cat)
  const jogar = opcoes.filter((c): c is ComandoJogarCarta => c.tipo === 'jogarCarta')
  if (jogar.length === 0) {
    // descarte forçado: descarta a carta de menor utilidade (unidade fraca primeiro); desempate por ID crescente
    const mao = e.jogadores[eu].mao
    const util = (cartaId: string) => {
      const c = cat.get(cartaId)
      return c?.tipo === 'unidade' ? (c.atk ?? 0) + (c.defesa ?? 0) : 100000
    }
    const ordenada = [...mao].sort((a, b) => util(a.cartaId) - util(b.cartaId) || (a.cartaId < b.cartaId ? -1 : a.cartaId > b.cartaId ? 1 : 0) || (a.uid < b.uid ? -1 : 1))
    return { tipo: 'descartar', jogador: eu, uid: (ordenada[0] as { uid: string }).uid }
  }
  const inim = inimigos(e, eu, cat)
  const cands = jogar.map((c) => avaliar(e, cat, eu, c, inim)).filter((c): c is Candidato => c !== null)
  cands.sort(compararCandidatos)
  const melhor = cands[0]
  // Defesa em profundidade: se a avaliação descartou tudo (não deveria), joga a primeira legal.
  return melhor ? melhor.cmd : (jogar[0] as ComandoJogarCarta)
}

function ajustarPosicao(e: EstadoDuelo, cat: Catalogo, eu: IdJogador): Comando | null {
  const inim = inimigos(e, eu, cat)
  const campo = e.jogadores[eu].campo
  for (let zona = 0; zona < campo.length; zona++) {
    const u = campo[zona]
    if (!u || u.atacou) continue
    const desejada: Posicao = temVantagem(atkEfetivo(e, eu, u, cat), inim) ? 'ATAQUE' : 'DEFESA'
    if (u.posicao !== desejada) return { tipo: 'mudarPosicao', jogador: eu, zona, posicao: desejada }
  }
  return null
}

function escolherAtaque(e: EstadoDuelo, cat: Catalogo, eu: IdJogador): Comando | null {
  if (e.turno === 1) return null
  const inim = inimigos(e, eu, cat)
  const campo = e.jogadores[eu].campo
  let melhor: { cmd: Comando; score: number; cartaId: string; zona: number; alvo: number } | null = null
  for (let zona = 0; zona < campo.length; zona++) {
    const u = campo[zona]
    if (!u || u.posicao !== 'ATAQUE' || u.atacou) continue
    const atk = atkEfetivo(e, eu, u, cat)
    const opcoes: { alvo: number | 'direto'; score: number }[] = []
    if (inim.length === 0) opcoes.push({ alvo: 'direto', score: 100000 + atk })
    for (const t of inim) {
      if (t.posicao === 'ATAQUE') {
        if (atk > t.atk) opcoes.push({ alvo: t.zona, score: 10000 + 2 * t.atk + (atk - t.atk) })
      } else if (atk > t.def) {
        opcoes.push({ alvo: t.zona, score: 5000 + t.atk })
      }
      // nunca ataca quando o resultado é dano ao próprio LP, empate de destruição ou nada
    }
    for (const o of opcoes) {
      const alvoN = o.alvo === 'direto' ? -1 : o.alvo
      const m = melhor
      const melhorQue =
        !m ||
        o.score > m.score ||
        (o.score === m.score && (u.cartaId < m.cartaId || (u.cartaId === m.cartaId && (zona < m.zona || (zona === m.zona && alvoN < m.alvo)))))
      if (melhorQue) melhor = { cmd: { tipo: 'atacar', jogador: eu, atacante: zona, alvo: o.alvo }, score: o.score, cartaId: u.cartaId, zona, alvo: alvoN }
    }
  }
  return (melhor as { cmd: Comando } | null)?.cmd ?? null
}

/** Próximo comando da IA para a visão dada (a perspectiva deve ser o jogador ativo). */
export function decidirComando(visao: VisaoDuelo, catalogo: readonly Carta[] = CATALOGO): Comando {
  const cat = mapaCatalogo(catalogo)
  const e = estadoDeVisao(visao)
  const eu = visao.perspectiva
  if (e.fase === 'PRINCIPAL') {
    if (!e.jogadaFeita && e.jogadores[eu].mao.length > 0) return escolherJogada(e, cat, eu)
    const pos = ajustarPosicao(e, cat, eu)
    if (pos) return pos
    return e.turno === 1 ? { tipo: 'encerrarTurno', jogador: eu } : { tipo: 'avancarFase', jogador: eu }
  }
  if (e.fase === 'COMBATE') return escolherAtaque(e, cat, eu) ?? { tipo: 'encerrarTurno', jogador: eu }
  return { tipo: 'encerrarTurno', jogador: eu }
}

