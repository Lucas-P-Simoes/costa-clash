// IA determinística (§9). Recebe APENAS uma VisaoDuelo (sem mão/baralho do adversário nem ordem futura)
// e devolve o próximo comando. Sem aleatoriedade: desempates por ID de carta crescente (depois uid/zona).
import { CATALOGO } from '../data/catalogo'
import { atkEfetivo, bonusTerreno, defEfetiva } from './combate'
import { analisarAcao } from './efeitos'
import { ataquesLegais, listarJogadas, simularAtaque } from './acoes'
import type { Comando, ComandoAtacar, ComandoJogarCarta } from './acoes'
import { mapaCatalogo, outro } from './estado'
import type { Catalogo, EstadoDuelo, IdJogador, Posicao } from './estado'
import { estadoDeVisao } from './visao'
import type { VisaoDuelo } from './visao'
import { VIDA_INICIAL } from './tipos'
import type { Carta } from './tipos'

interface Inimigo {
  zona: number
  posicao: Posicao
  atk: number | null
  def: number | null
  cartaId: string | null
  oculta: boolean
}

function inimigos(e: EstadoDuelo, eu: IdJogador, cat: Catalogo): Inimigo[] {
  const adv = outro(eu)
  const r: Inimigo[] = []
  e.jogadores[adv].campo.forEach((u, zona) => {
    if (!u) return
    if (u.viradaParaBaixo || u.cartaId === '?') r.push({ zona, posicao: u.posicao, atk: null, def: null, cartaId: null, oculta: true })
    else r.push({ zona, posicao: u.posicao, atk: atkEfetivo(e, adv, u, cat), def: defEfetiva(e, adv, u, cat), cartaId: u.cartaId, oculta: false })
  })
  return r
}

/** O atacante projetado vence ao menos um combate (ou o adversário está sem unidades: ataque direto). */
function vence(atk: number, inim: Inimigo[]): boolean {
  return inim.length === 0 || inim.some((t) => !t.oculta && atk > (t.posicao === 'ATAQUE' ? (t.atk as number) : (t.def as number)))
}

/** "Vantagem atual": vence algum combate e não é mais fraca que nenhum atacante inimigo. */
function temVantagem(atk: number, inim: Inimigo[]): boolean {
  return (
    inim.length === 0 ||
    (vence(atk, inim) && inim.filter((t) => t.posicao === 'ATAQUE').every((t) => !t.oculta && atk >= (t.atk as number)))
  )
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
    const faceOculta = desejada === 'DEFESA'
    if ((cmd.viradaParaBaixo ?? false) !== faceOculta) return null
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

export interface PesosAtaqueIA {
  vitoriaImediata: number
  danoCausado: number
  danoSofrido: number
  unidadeInimigaDestruida: number
  ameacaRemovida: number
  unidadePropriaPerdida: number
  valorAtacantePerdido: number
  riscoAlvoOculto: number
  fatorFuturo: number
  profundidadeMaxima: number
}

/** Pesos ficam concentrados e podem ser substituídos em testes/níveis futuros. */
export const PESOS_ATAQUE_IA: Readonly<PesosAtaqueIA> = {
  vitoriaImediata: 1_000_000,
  danoCausado: 2,
  danoSofrido: 3,
  unidadeInimigaDestruida: 3_000,
  ameacaRemovida: 10,
  unidadePropriaPerdida: 8_000,
  valorAtacantePerdido: 5,
  riscoAlvoOculto: 250,
  fatorFuturo: 0.9,
  profundidadeMaxima: 3,
}

export interface AvaliacaoAtaque {
  comando: ComandoAtacar
  score: number
  motivo: string
  estadoSimulado: EstadoDuelo | null
}

function valorUnidade(e: EstadoDuelo, dono: IdJogador, zona: number, cat: Catalogo): number {
  const u = e.jogadores[dono].campo[zona]
  return u ? atkEfetivo(e, dono, u, cat) + defEfetiva(e, dono, u, cat) : 0
}

function avaliarAtaqueComCatalogo(
  estado: EstadoDuelo,
  comando: ComandoAtacar,
  catalogo: readonly Carta[],
  cat: Catalogo,
  pesos: Readonly<PesosAtaqueIA>,
  legalidadeConhecida: boolean,
): AvaliacaoAtaque {
  const eu = comando.jogador
  const adv = outro(eu)
  const atacante = estado.jogadores[eu].campo[comando.atacante]
  if (!atacante || (!legalidadeConhecida && !ataquesLegais(estado).some((c) => c.atacante === comando.atacante && c.alvo === comando.alvo))) {
    return { comando, score: Number.NEGATIVE_INFINITY, motivo: 'Ataque ilegal.', estadoSimulado: null }
  }

  if (comando.alvo !== 'direto') {
    const alvo = estado.jogadores[adv].campo[comando.alvo]
    // O marcador '?' vem de estadoDeVisao: jamais simular como se seus atributos fossem zero.
    if (alvo?.cartaId === '?' || alvo?.viradaParaBaixo) {
      const forcaPublica = atkEfetivo(estado, eu, atacante, cat)
      return {
        comando,
        score: forcaPublica / 5 - pesos.riscoAlvoOculto,
        motivo: 'Assume risco contra uma unidade de atributos ocultos.',
        estadoSimulado: null,
      }
    }
  }

  const lpEu = estado.jogadores[eu].lp
  const lpAdv = estado.jogadores[adv].lp
  const alvoAntes =
    comando.alvo === 'direto'
      ? 0
      : (() => {
          const alvo = estado.jogadores[adv].campo[comando.alvo]
          return alvo ? atkEfetivo(estado, adv, alvo, cat) : 0
        })()
  const atacanteAntes = valorUnidade(estado, eu, comando.atacante, cat)
  const r = simularAtaque(estado, comando, catalogo)
  if (!r.ok) return { comando, score: Number.NEGATIVE_INFINITY, motivo: r.erro, estadoSimulado: null }

  const perdeuAtacante = !r.estado.jogadores[eu].campo[comando.atacante]
  const removeuAlvo = comando.alvo !== 'direto' && !r.estado.jogadores[adv].campo[comando.alvo]
  const danoCausado = lpAdv - r.estado.jogadores[adv].lp
  const danoSofrido = lpEu - r.estado.jogadores[eu].lp
  const venceu = r.estado.resultado?.vencedor === eu
  const score =
    (venceu ? pesos.vitoriaImediata : 0) +
    danoCausado * pesos.danoCausado -
    danoSofrido * pesos.danoSofrido +
    (removeuAlvo ? pesos.unidadeInimigaDestruida + alvoAntes * pesos.ameacaRemovida : 0) -
    (perdeuAtacante ? pesos.unidadePropriaPerdida + atacanteAntes * pesos.valorAtacantePerdido : 0)
  const motivo = venceu
    ? 'Conclui a vitória.'
    : removeuAlvo && !perdeuAtacante
      ? 'Elimina uma ameaça sem perder o atacante.'
      : danoCausado > 0
        ? `Causa ${danoCausado} de dano líquido.`
        : danoSofrido > 0
          ? `Causaria ${danoSofrido} de dano aos próprios pontos de vida.`
          : 'Não gera vantagem imediata.'
  return { comando, score, motivo, estadoSimulado: r.estado }
}

/** Avalia um ataque sem mutar o estado. O estado deve conter somente informação acessível à IA. */
export function avaliarAtaque(
  estado: EstadoDuelo,
  comando: ComandoAtacar,
  catalogo: readonly Carta[] = CATALOGO,
  pesos: Readonly<PesosAtaqueIA> = PESOS_ATAQUE_IA,
): AvaliacaoAtaque {
  return avaliarAtaqueComCatalogo(estado, comando, catalogo, mapaCatalogo(catalogo), pesos, false)
}

function desempateAtaque(e: EstadoDuelo, a: ComandoAtacar, b: ComandoAtacar): number {
  const ca = e.jogadores[a.jogador].campo[a.atacante]?.cartaId ?? ''
  const cb = e.jogadores[b.jogador].campo[b.atacante]?.cartaId ?? ''
  if (ca !== cb) return ca < cb ? -1 : 1
  if (a.atacante !== b.atacante) return a.atacante - b.atacante
  const aa = a.alvo === 'direto' ? -1 : a.alvo
  const ab = b.alvo === 'direto' ? -1 : b.alvo
  return aa - ab
}

interface PlanoAtaque {
  primeiro: ComandoAtacar
  score: number
}

function planejarAtaques(
  estado: EstadoDuelo,
  catalogo: readonly Carta[],
  cat: Catalogo,
  pesos: Readonly<PesosAtaqueIA>,
  profundidade: number,
): PlanoAtaque | null {
  const opcoes = ataquesLegais(estado)
  let melhor: PlanoAtaque | null = null
  for (const comando of opcoes) {
    const avaliacao = avaliarAtaqueComCatalogo(estado, comando, catalogo, cat, pesos, true)
    let total = avaliacao.score
    if (avaliacao.estadoSimulado && profundidade > 1 && !avaliacao.estadoSimulado.resultado) {
      const futuro = planejarAtaques(avaliacao.estadoSimulado, catalogo, cat, pesos, profundidade - 1)
      if (futuro && futuro.score > 0) total += futuro.score * pesos.fatorFuturo
    }
    if (!melhor || total > melhor.score || (total === melhor.score && desempateAtaque(estado, comando, melhor.primeiro) < 0)) {
      melhor = { primeiro: comando, score: total }
    }
  }
  return melhor
}

/** Escolhe a primeira ação da melhor sequência limitada; null significa preservar o campo. */
export function escolherMelhorAtaque(
  estado: EstadoDuelo,
  catalogo: readonly Carta[] = CATALOGO,
  pesos: Readonly<PesosAtaqueIA> = PESOS_ATAQUE_IA,
): ComandoAtacar | null {
  const plano = planejarAtaques(estado, catalogo, mapaCatalogo(catalogo), pesos, Math.max(1, Math.floor(pesos.profundidadeMaxima)))
  return plano && plano.score > 0 ? plano.primeiro : null
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
  if (e.fase === 'COMBATE') return escolherMelhorAtaque(e, catalogo) ?? { tipo: 'encerrarTurno', jogador: eu }
  return { tipo: 'encerrarTurno', jogador: eu }
}

