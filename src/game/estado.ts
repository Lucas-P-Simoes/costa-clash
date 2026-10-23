// Tipos do estado do duelo e utilitários internos. Tudo aqui é serializável em JSON e sem React/DOM.
import { CATALOGO } from '../data/catalogo'
import { TAMANHO_MAO, VIDA_INICIAL, ZONAS_SUPORTE, ZONAS_UNIDADE } from './tipos'
import type { Carta } from './tipos'

export type IdJogador = 'humano' | 'oponente'
export type Posicao = 'ATAQUE' | 'DEFESA'
/** O estado só repousa em PRINCIPAL ou COMBATE; INICIO e FIM são processados dentro dos comandos. */
export type Fase = 'INICIO' | 'PRINCIPAL' | 'COMBATE' | 'FIM'
export type MotivoFim = 'lp' | 'empate_lp' | 'compra' | 'desistencia' | 'repeticao'

export interface CartaInstancia {
  /** Id único da cópia física (estável durante o duelo). */
  uid: string
  cartaId: string
}

export interface UnidadeEmCampo extends CartaInstancia {
  posicao: Posicao
  atacou: boolean
  /** Soma dos buffs/debuffs de ATK (pode ser negativa; o ATK efetivo é limitado a >= 0 só no cálculo). */
  buffAtk: number
  buffDef: number
  equipamentoUid: string | null
  invocadaNoTurno: number
}

export interface SuporteEmZona extends CartaInstancia {
  tipo: 'armadilha' | 'equipamento'
  colocadaNoTurno: number
  /** Ordem global de colocação (menor = mais antiga). */
  ordem: number
  /** Equipamento: uid da unidade vinculada. */
  vinculadaA: string | null
}

export interface EstadoJogador {
  id: IdJogador
  lp: number
  /** Topo do baralho = índice 0. */
  baralho: CartaInstancia[]
  mao: CartaInstancia[]
  campo: (UnidadeEmCampo | null)[]
  suporte: (SuporteEmZona | null)[]
  descarte: CartaInstancia[]
}

export interface TerrenoAtivo extends CartaInstancia {
  dono: IdJogador
}

export interface Resultado {
  /** null = empate. */
  vencedor: IdJogador | null
  motivo: MotivoFim
}

export interface EstadoDuelo {
  versao: 1
  jogadores: Record<IdJogador, EstadoJogador>
  terreno: TerrenoAtivo | null
  fase: Fase
  ativo: IdJogador
  /** Turno absoluto, começa em 1 (humano); o oponente joga os turnos pares. */
  turno: number
  /** Já fez a jogada da mão (ou descarte) neste turno. */
  jogadaFeita: boolean
  /** Jogador que vê as armadilhas do adversário até o fim do turno atual (efeito `revelar`). */
  revelacao: IdJogador | null
  proximaOrdem: number
  resultado: Resultado | null
  /** Contagem de assinaturas de estado no início dos turnos (salvaguarda de repetição 3x). */
  repeticoes: Record<string, number>
  log: Evento[]
}

// ---------------------------------------------------------------- eventos

export type DadosEvento =
  | { tipo: 'turno_iniciado'; jogador: IdJogador }
  | { tipo: 'compra'; jogador: IdJogador; cartas: CartaInstancia[]; quantidade?: number }
  | {
      tipo: 'carta_jogada'
      jogador: IdJogador
      carta: CartaInstancia
      destino: 'campo' | 'suporte' | 'descarte' | 'terreno'
      zona?: number
      posicao?: Posicao
      alvo?: { jogador: IdJogador; zona: number }
    }
  | { tipo: 'descarte_forcado'; jogador: IdJogador; carta: CartaInstancia }
  | { tipo: 'posicao_alterada'; jogador: IdJogador; zona: number; posicao: Posicao }
  | {
      tipo: 'efeito_aplicado'
      jogador: IdJogador
      cartaId: string
      operacao: string
      valor: number
      alvo?: { jogador: IdJogador; zona: number }
    }
  | { tipo: 'cura'; jogador: IdJogador; valor: number; lp: number }
  | { tipo: 'dano'; jogador: IdJogador; valor: number; lp: number }
  | { tipo: 'unidade_destruida'; jogador: IdJogador; zona: number; carta: CartaInstancia; equipamentoDescartado?: CartaInstancia }
  | { tipo: 'terreno_alterado'; cartaId: string; dono: IdJogador; anterior?: string }
  | { tipo: 'armadilhas_reveladas'; jogador: IdJogador; armadilhas: { zona: number; cartaId: string }[] }
  | { tipo: 'armadilha_ativada'; dono: IdJogador; zona: number; carta: CartaInstancia; gatilho: string; operacao: string; valor: number }
  | { tipo: 'ataque_declarado'; jogador: IdJogador; atacante: number; alvo: number | 'direto' }
  | { tipo: 'ataque_anulado'; jogador: IdJogador; atacante: number }
  | {
      tipo: 'combate_resolvido'
      jogador: IdJogador
      atacante: number
      alvo: number | 'direto'
      resultado: 'direto' | 'atacante_vence' | 'alvo_vence' | 'empate' | 'defesa_destruida' | 'ataque_repelido' | 'defesa_empate'
    }
  | { tipo: 'fase_alterada'; jogador: IdJogador; fase: Fase }
  | { tipo: 'turno_encerrado'; jogador: IdJogador }
  | { tipo: 'desistencia'; jogador: IdJogador }
  | { tipo: 'fim_de_jogo'; vencedor: IdJogador | null; motivo: MotivoFim }
  | { tipo: 'ia_fallback'; jogador: IdJogador; motivo: string }

/** Todo evento carrega o número do turno absoluto e um texto em português para log/animação. */
export type Evento = DadosEvento & { turno: number; texto: string }

// ---------------------------------------------------------------- infraestrutura interna

export type Catalogo = ReadonlyMap<string, Carta>

const CACHE_CATALOGO = new WeakMap<readonly Carta[], Catalogo>()

export function mapaCatalogo(lista: readonly Carta[] = CATALOGO): Catalogo {
  let m = CACHE_CATALOGO.get(lista)
  if (!m) {
    m = new Map(lista.map((c) => [c.id, c]))
    CACHE_CATALOGO.set(lista, m)
  }
  return m
}

/** Violação de regra: capturada na borda pública e convertida em `{ ok: false, erro }`. */
export class ErroRegra extends Error {}

/** Contexto mutável usado internamente sobre um CLONE do estado. */
export interface Ctx {
  e: EstadoDuelo
  ev: Evento[]
  cat: Catalogo
}

export function emitir(ctx: Ctx, dados: DadosEvento, texto: string): void {
  ctx.ev.push({ ...dados, turno: ctx.e.turno, texto } as Evento)
}

export function outro(j: IdJogador): IdJogador {
  return j === 'humano' ? 'oponente' : 'humano'
}

export function nomeJogador(j: IdJogador): string {
  return j === 'humano' ? 'Você' : 'Oponente'
}

export function nomeCarta(cat: Catalogo, cartaId: string): string {
  return cat.get(cartaId)?.nome ?? cartaId
}

/** Clona o estado SEM copiar o log (compartilhado por referência; só é reatribuído, nunca mutado). */
export function clonar(estado: EstadoDuelo): EstadoDuelo {
  const { log, ...resto } = estado
  return { ...structuredClone(resto), log }
}

export function primeiraZonaLivre(zonas: readonly unknown[]): number {
  return zonas.findIndex((z) => z === null)
}

export function zonaValida(n: unknown, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < max
}

// ---------------------------------------------------------------- criação

export function criarEstadoJogador(id: IdJogador, baralhoEmbaralhado: CartaInstancia[]): EstadoJogador {
  const baralho = baralhoEmbaralhado.map((c) => ({ ...c }))
  const mao = baralho.splice(0, TAMANHO_MAO)
  return {
    id,
    lp: VIDA_INICIAL,
    baralho,
    mao,
    campo: Array<UnidadeEmCampo | null>(ZONAS_UNIDADE).fill(null),
    suporte: Array<SuporteEmZona | null>(ZONAS_SUPORTE).fill(null),
    descarte: [],
  }
}

/** Estado logo após a distribuição das mãos iniciais (fase INICIO do turno 1, humano ativo). */
export function criarEstadoInicial(baralhoHumano: CartaInstancia[], baralhoOponente: CartaInstancia[]): EstadoDuelo {
  return {
    versao: 1,
    jogadores: {
      humano: criarEstadoJogador('humano', baralhoHumano),
      oponente: criarEstadoJogador('oponente', baralhoOponente),
    },
    terreno: null,
    fase: 'INICIO',
    ativo: 'humano',
    turno: 1,
    jogadaFeita: false,
    revelacao: null,
    proximaOrdem: 1,
    resultado: null,
    repeticoes: {},
    log: [],
  }
}

// ---------------------------------------------------------------- operações básicas de LP e fim de jogo

export function finalizar(ctx: Ctx, vencedor: IdJogador | null, motivo: MotivoFim): void {
  if (ctx.e.resultado) return
  ctx.e.resultado = { vencedor, motivo }
  const txt =
    vencedor === null
      ? 'A partida terminou em empate.'
      : vencedor === 'humano'
        ? 'Você venceu a partida!'
        : 'O oponente venceu a partida.'
  emitir(ctx, { tipo: 'fim_de_jogo', vencedor, motivo }, txt)
}

/** LP <= 0: derrota; ambos <= 0: empate. Não faz nada se já houver resultado. */
export function verificarResultado(ctx: Ctx): void {
  if (ctx.e.resultado) return
  const h = ctx.e.jogadores.humano.lp <= 0
  const o = ctx.e.jogadores.oponente.lp <= 0
  if (h && o) finalizar(ctx, null, 'empate_lp')
  else if (h) finalizar(ctx, 'oponente', 'lp')
  else if (o) finalizar(ctx, 'humano', 'lp')
}

export function causarDano(ctx: Ctx, jogador: IdJogador, valor: number): void {
  if (valor <= 0) return
  const j = ctx.e.jogadores[jogador]
  const perdido = Math.min(j.lp, valor)
  j.lp -= perdido
  emitir(ctx, { tipo: 'dano', jogador, valor: perdido, lp: j.lp }, `${nomeJogador(jogador)} perde ${perdido} LP (restam ${j.lp}).`)
}

/** Cura limitada a VIDA_INICIAL; devolve quanto foi realmente curado. */
export function curar(ctx: Ctx, jogador: IdJogador, valor: number): number {
  const j = ctx.e.jogadores[jogador]
  const ganho = Math.max(0, Math.min(VIDA_INICIAL - j.lp, valor))
  j.lp += ganho
  emitir(ctx, { tipo: 'cura', jogador, valor: ganho, lp: j.lp }, `${nomeJogador(jogador)} recupera ${ganho} LP (total ${j.lp}).`)
  return ganho
}

/** Remove a unidade do campo, manda para o descarte e leva junto o equipamento vinculado. */
export function destruirUnidade(ctx: Ctx, jogador: IdJogador, zona: number): void {
  const j = ctx.e.jogadores[jogador]
  const u = j.campo[zona]
  if (!u) throw new Error(`destruirUnidade: zona ${zona} vazia`)
  j.campo[zona] = null
  j.descarte.push({ uid: u.uid, cartaId: u.cartaId })
  let equip: CartaInstancia | undefined
  if (u.equipamentoUid) {
    const z = j.suporte.findIndex((s) => s?.uid === u.equipamentoUid)
    if (z >= 0) {
      const s = j.suporte[z] as SuporteEmZona
      equip = { uid: s.uid, cartaId: s.cartaId }
      j.suporte[z] = null
      j.descarte.push(equip)
    }
  }
  const nome = nomeCarta(ctx.cat, u.cartaId)
  emitir(
    ctx,
    { tipo: 'unidade_destruida', jogador, zona, carta: { uid: u.uid, cartaId: u.cartaId }, ...(equip ? { equipamentoDescartado: equip } : {}) },
    `${nome} (${nomeJogador(jogador)}) foi destruída${equip ? ' junto com seu equipamento' : ''}.`,
  )
}

// ---------------------------------------------------------------- repetição e conservação

/** Assinatura canônica (sem log/uids/turno) para a salvaguarda de repetição de estado. */
export function assinatura(e: EstadoDuelo): string {
  const jog = (j: EstadoJogador) =>
    [
      j.lp,
      j.baralho.length,
      j.mao.map((c) => c.cartaId).sort().join(','),
      j.campo.map((u) => (u ? `${u.cartaId}/${u.posicao}/${u.buffAtk}/${u.buffDef}/${u.equipamentoUid ? 'E' : '-'}` : '_')).join(','),
      j.suporte.map((s) => (s ? `${s.cartaId}` : '_')).join(','),
      j.descarte.length,
    ].join('|')
  return [e.ativo, e.terreno?.cartaId ?? '-', jog(e.jogadores.humano), jog(e.jogadores.oponente)].join('#')
}

/** Cartas totais de um jogador (baralho+mão+campo+suporte+descarte+terreno próprio): deve ser constante (40). */
export function totalCartas(e: EstadoDuelo, jogador: IdJogador): number {
  const j = e.jogadores[jogador]
  return (
    j.baralho.length +
    j.mao.length +
    j.campo.filter(Boolean).length +
    j.suporte.filter(Boolean).length +
    j.descarte.length +
    (e.terreno?.dono === jogador ? 1 : 0)
  )
}

/** Verifica invariantes estruturais; devolve a lista de violações (vazia = estado consistente). */
export function invariantes(e: EstadoDuelo, totalEsperado = 40): string[] {
  const erros: string[] = []
  for (const id of ['humano', 'oponente'] as const) {
    const j = e.jogadores[id]
    if (j.lp < 0 || j.lp > VIDA_INICIAL) erros.push(`${id}: LP fora de [0, ${VIDA_INICIAL}]: ${j.lp}`)
    if (j.campo.length !== ZONAS_UNIDADE) erros.push(`${id}: campo com ${j.campo.length} zonas`)
    if (j.suporte.length !== ZONAS_SUPORTE) erros.push(`${id}: suporte com ${j.suporte.length} zonas`)
    if (j.mao.length > TAMANHO_MAO) erros.push(`${id}: mão com ${j.mao.length} cartas`)
    if (totalCartas(e, id) !== totalEsperado) erros.push(`${id}: total de cartas ${totalCartas(e, id)} != ${totalEsperado}`)
    for (const u of j.campo) {
      if (!u) continue
      if (u.equipamentoUid) {
        const s = j.suporte.find((x) => x?.uid === u.equipamentoUid)
        if (!s || s.tipo !== 'equipamento' || s.vinculadaA !== u.uid) erros.push(`${id}: equipamento de ${u.uid} inconsistente`)
      }
    }
    for (const s of j.suporte) {
      if (s?.tipo === 'equipamento' && !j.campo.some((u) => u?.uid === s.vinculadaA)) erros.push(`${id}: equipamento ${s.uid} órfão`)
    }
  }
  const uids = new Set<string>()
  for (const id of ['humano', 'oponente'] as const) {
    const j = e.jogadores[id]
    const todas = [
      ...j.baralho,
      ...j.mao,
      ...j.campo.filter((x): x is UnidadeEmCampo => !!x),
      ...j.suporte.filter((x): x is SuporteEmZona => !!x),
      ...j.descarte,
      ...(e.terreno?.dono === id ? [e.terreno] : []),
    ]
    for (const c of todas) {
      if (uids.has(c.uid)) erros.push(`uid duplicado: ${c.uid}`)
      uids.add(c.uid)
    }
  }
  return erros
}
