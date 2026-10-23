// Comandos do duelo. Funções puras: (estado, comando) => { ok: true, estado, eventos } | { ok: false, erro, estado }.
// Jogada ilegal NÃO altera o estado (o mesmo objeto é devolvido). Todas as transições são validadas aqui.
import { reagirInvocacao } from './armadilhas'
import { resolverAtaque, validarAtaque } from './combate'
import { analisarAcao, resolverAcao, validarAcao } from './efeitos'
import {
  ErroRegra,
  assinatura,
  clonar,
  emitir,
  finalizar,
  mapaCatalogo,
  nomeCarta,
  nomeJogador,
  outro,
  primeiraZonaLivre,
  verificarResultado,
  zonaValida,
} from './estado'
import type { Catalogo, CartaInstancia, Ctx, Evento, EstadoDuelo, IdJogador, Posicao, SuporteEmZona, UnidadeEmCampo } from './estado'
import { CATALOGO } from '../data/catalogo'
import { TAMANHO_MAO, ZONAS_SUPORTE, ZONAS_UNIDADE } from './tipos'
import type { Carta } from './tipos'

// ---------------------------------------------------------------- tipos públicos

export interface ComandoJogarCarta {
  tipo: 'jogarCarta'
  jogador: IdJogador
  /** uid da carta na mão. */
  uid: string
  /** Unidade: zona de unidade; armadilha/equipamento: zona de suporte. Omitida = primeira livre. */
  zona?: number
  /** Só para unidades (padrão: ATAQUE). */
  posicao?: Posicao
  /** Zona da unidade-alvo (lado definido pela carta: aliada para buff/equipamento, inimiga para debuff/destruir). */
  alvo?: number
}
export interface ComandoMudarPosicao {
  tipo: 'mudarPosicao'
  jogador: IdJogador
  zona: number
  posicao: Posicao
}
export interface ComandoDescartar {
  tipo: 'descartar'
  jogador: IdJogador
  uid: string
}
export interface ComandoAvancarFase {
  tipo: 'avancarFase'
  jogador: IdJogador
}
export interface ComandoEncerrarTurno {
  tipo: 'encerrarTurno'
  jogador: IdJogador
}
export interface ComandoAtacar {
  tipo: 'atacar'
  jogador: IdJogador
  /** Zona de unidade do atacante. */
  atacante: number
  /** Zona de unidade adversária ou 'direto' (só se o adversário não tem unidades). */
  alvo: number | 'direto'
}
export interface ComandoDesistir {
  tipo: 'desistir'
  jogador: IdJogador
}

export type Comando =
  | ComandoJogarCarta
  | ComandoMudarPosicao
  | ComandoDescartar
  | ComandoAvancarFase
  | ComandoEncerrarTurno
  | ComandoAtacar
  | ComandoDesistir

export type ResultadoComando =
  | { ok: true; estado: EstadoDuelo; eventos: Evento[] }
  | { ok: false; erro: string; estado: EstadoDuelo }

// ---------------------------------------------------------------- turno

/** Início de turno: checa resultado, zera flags de ataque, repõe a mão até 5 (derrota ANTES de comprar se faltar carta). */
export function iniciarTurno(ctx: Ctx): void {
  const e = ctx.e
  const j = e.jogadores[e.ativo]
  e.fase = 'INICIO'
  emitir(ctx, { tipo: 'turno_iniciado', jogador: e.ativo }, `Turno ${e.turno}: ${e.ativo === 'humano' ? 'seu turno' : 'turno do oponente'}.`)
  for (const u of j.campo) if (u) u.atacou = false
  // Buffs temporários: inexistentes no MVP (todos duram enquanto a unidade estiver em campo).
  verificarResultado(ctx)
  if (e.resultado) return
  const falta = Math.max(0, TAMANHO_MAO - j.mao.length)
  if (falta > j.baralho.length) {
    // derrota ANTES de comprar: sem compra parcial
    finalizar(ctx, outro(e.ativo), 'compra')
    return
  }
  if (falta > 0) {
    const cartas = j.baralho.splice(0, falta)
    j.mao.push(...cartas)
    emitir(ctx, { tipo: 'compra', jogador: e.ativo, cartas }, `${nomeJogador(e.ativo)} compra ${falta} carta(s).`)
  }
  e.jogadaFeita = false
  e.revelacao = null
  if (registrarRepeticaoCtx(ctx)) return
  e.fase = 'PRINCIPAL'
  emitir(ctx, { tipo: 'fase_alterada', jogador: e.ativo, fase: 'PRINCIPAL' }, 'Fase principal.')
}

/** Salvaguarda §8: 3 ocorrências da mesma assinatura de estado = empate técnico. Devolve true se encerrou. */
function registrarRepeticaoCtx(ctx: Ctx): boolean {
  const sig = assinatura(ctx.e)
  const n = (ctx.e.repeticoes[sig] ?? 0) + 1
  ctx.e.repeticoes[sig] = n
  if (n >= 3) {
    finalizar(ctx, null, 'repeticao')
    return true
  }
  return false
}

/** Versão pura da salvaguarda de repetição (exposta para testes e para a UI, se necessário). */
export function registrarRepeticao(estado: EstadoDuelo, catalogo: readonly Carta[] = CATALOGO): { estado: EstadoDuelo; eventos: Evento[] } {
  const ctx = novoCtx(estado, catalogo)
  registrarRepeticaoCtx(ctx)
  ctx.e.log = ctx.e.log.concat(ctx.ev)
  return { estado: ctx.e, eventos: ctx.ev }
}

function novoCtx(estado: EstadoDuelo, catalogo: readonly Carta[]): Ctx {
  return { e: clonar(estado), ev: [], cat: mapaCatalogo(catalogo) }
}

function podeSeguir(e: EstadoDuelo): boolean {
  return e.jogadaFeita || e.jogadores[e.ativo].mao.length === 0
}

// ---------------------------------------------------------------- jogar carta

/** Motivo pelo qual a jogada da mão é ilegal (null = legal). Não altera nada. */
export function validarJogarCarta(e: EstadoDuelo, cat: Catalogo, cmd: ComandoJogarCarta): string | null {
  if (e.resultado) return 'A partida já terminou.'
  if (cmd.jogador !== e.ativo) return 'Não é o seu turno.'
  if (e.fase !== 'PRINCIPAL') return 'Cartas só podem ser jogadas na fase principal.'
  if (e.jogadaFeita) return 'Você já fez a jogada da mão neste turno.'
  const j = e.jogadores[cmd.jogador]
  const inst = j.mao.find((c) => c.uid === cmd.uid)
  if (!inst) return 'Essa carta não está na sua mão.'
  const carta = cat.get(inst.cartaId)
  if (!carta) return 'Carta desconhecida.'
  if (carta.tipo === 'unidade') {
    if (cmd.posicao !== undefined && cmd.posicao !== 'ATAQUE' && cmd.posicao !== 'DEFESA') return 'Posição inválida.'
    if (cmd.zona !== undefined) {
      if (!zonaValida(cmd.zona, ZONAS_UNIDADE)) return 'Zona de unidade inválida.'
      if (j.campo[cmd.zona]) return 'A zona de unidade escolhida está ocupada.'
    } else if (primeiraZonaLivre(j.campo) < 0) return 'Não há zona de unidade livre.'
    return null
  }
  if (carta.tipo === 'armadilha') {
    if (cmd.zona !== undefined) {
      if (!zonaValida(cmd.zona, ZONAS_SUPORTE)) return 'Zona de suporte inválida.'
      if (j.suporte[cmd.zona]) return 'A zona de suporte escolhida está ocupada.'
    } else if (primeiraZonaLivre(j.suporte) < 0) return 'Não há zona de suporte livre.'
    return null
  }
  return validarAcao(e, cmd.jogador, carta, cat, cmd.alvo, cmd.zona)
}

/** Parâmetros legais mínimos para uma carta da mão (um por combinação de alvo/posição). */
function opcoesDeCarta(e: EstadoDuelo, cat: Catalogo, jogador: IdJogador, inst: CartaInstancia): ComandoJogarCarta[] {
  const carta = cat.get(inst.cartaId)
  if (!carta) return []
  let base: ComandoJogarCarta[]
  if (carta.tipo === 'unidade') {
    base = [
      { tipo: 'jogarCarta', jogador, uid: inst.uid, posicao: 'ATAQUE' },
      { tipo: 'jogarCarta', jogador, uid: inst.uid, posicao: 'DEFESA' },
    ]
  } else if (carta.tipo === 'armadilha') {
    base = [{ tipo: 'jogarCarta', jogador, uid: inst.uid }]
  } else {
    const a = analisarAcao(e, jogador, carta, cat)
    base = a.exigeAlvo
      ? a.alvos.map((alvo) => ({ tipo: 'jogarCarta', jogador, uid: inst.uid, alvo }) as ComandoJogarCarta)
      : [{ tipo: 'jogarCarta', jogador, uid: inst.uid }]
  }
  return base.filter((c) => validarJogarCarta(e, cat, c) === null)
}

export function existeJogadaLegal(e: EstadoDuelo, cat: Catalogo): boolean {
  if (e.resultado || e.fase !== 'PRINCIPAL' || e.jogadaFeita) return false
  return e.jogadores[e.ativo].mao.some((c) => opcoesDeCarta(e, cat, e.ativo, c).length > 0)
}

/**
 * Jogadas da mão legais para o jogador ativo agora (vazio se não for a fase principal ou se já jogou).
 * Se não houver nenhuma jogada de carta, devolve os descartes possíveis (descarte forçado).
 */
export function jogadasLegais(estado: EstadoDuelo, catalogo: readonly Carta[] = CATALOGO): Comando[] {
  const cat = mapaCatalogo(catalogo)
  return listarJogadas(estado, cat)
}

export function listarJogadas(e: EstadoDuelo, cat: Catalogo): Comando[] {
  if (e.resultado || e.fase !== 'PRINCIPAL' || e.jogadaFeita) return []
  const jogador = e.ativo
  const mao = e.jogadores[jogador].mao
  const jogadas = mao.flatMap((c) => opcoesDeCarta(e, cat, jogador, c))
  if (jogadas.length > 0) return jogadas
  return mao.map((c) => ({ tipo: 'descartar', jogador, uid: c.uid }) as Comando)
}

/** Ataques legais do jogador ativo agora (fase de combate). */
export function ataquesLegais(estado: EstadoDuelo): ComandoAtacar[] {
  const r: ComandoAtacar[] = []
  const jogador = estado.ativo
  const adv = estado.jogadores[outro(jogador)]
  estado.jogadores[jogador].campo.forEach((u, atacante) => {
    if (!u) return
    const alvos: (number | 'direto')[] = adv.campo.some(Boolean) ? adv.campo.flatMap((a, z) => (a ? [z] : [])) : ['direto']
    for (const alvo of alvos) if (validarAtaque(estado, jogador, atacante, alvo) === null) r.push({ tipo: 'atacar', jogador, atacante, alvo })
  })
  return r
}

function executarJogarCarta(ctx: Ctx, cmd: ComandoJogarCarta): void {
  const erro = validarJogarCarta(ctx.e, ctx.cat, cmd)
  if (erro) throw new ErroRegra(erro)
  const e = ctx.e
  const j = e.jogadores[cmd.jogador]
  const idx = j.mao.findIndex((c) => c.uid === cmd.uid)
  const inst = j.mao.splice(idx, 1)[0] as CartaInstancia
  const carta = ctx.cat.get(inst.cartaId) as Carta
  const nome = carta.nome
  e.jogadaFeita = true

  if (carta.tipo === 'unidade') {
    const zona = cmd.zona ?? primeiraZonaLivre(j.campo)
    const posicao: Posicao = cmd.posicao ?? 'ATAQUE'
    const u: UnidadeEmCampo = {
      uid: inst.uid,
      cartaId: inst.cartaId,
      posicao,
      atacou: false,
      buffAtk: 0,
      buffDef: 0,
      equipamentoUid: null,
      invocadaNoTurno: e.turno,
    }
    j.campo[zona] = u
    emitir(
      ctx,
      { tipo: 'carta_jogada', jogador: cmd.jogador, carta: inst, destino: 'campo', zona, posicao },
      `${nomeJogador(cmd.jogador)} invoca ${nome} em ${posicao === 'ATAQUE' ? 'ataque' : 'defesa'}.`,
    )
    reagirInvocacao(ctx, cmd.jogador, zona)
  } else if (carta.tipo === 'armadilha') {
    const zona = cmd.zona ?? primeiraZonaLivre(j.suporte)
    const s: SuporteEmZona = {
      uid: inst.uid,
      cartaId: inst.cartaId,
      tipo: 'armadilha',
      colocadaNoTurno: e.turno,
      ordem: e.proximaOrdem++,
      vinculadaA: null,
    }
    j.suporte[zona] = s
    emitir(ctx, { tipo: 'carta_jogada', jogador: cmd.jogador, carta: inst, destino: 'suporte', zona }, `${nomeJogador(cmd.jogador)} coloca uma carta virada para baixo.`)
  } else {
    const a = analisarAcao(e, cmd.jogador, carta, ctx.cat)
    const destino = a.destino as 'descarte' | 'suporte' | 'terreno'
    const zonaSup = destino === 'suporte' ? (cmd.zona ?? primeiraZonaLivre(j.suporte)) : undefined
    emitir(
      ctx,
      {
        tipo: 'carta_jogada',
        jogador: cmd.jogador,
        carta: inst,
        destino,
        ...(zonaSup !== undefined ? { zona: zonaSup } : {}),
        ...(a.exigeAlvo && a.donoAlvo && cmd.alvo !== undefined ? { alvo: { jogador: a.donoAlvo, zona: cmd.alvo } } : {}),
      },
      `${nomeJogador(cmd.jogador)} usa ${nome}.`,
    )
    resolverAcao(ctx, cmd.jogador, carta, inst, a.exigeAlvo ? cmd.alvo : undefined, zonaSup)
  }
  verificarResultado(ctx)
}

// ---------------------------------------------------------------- demais comandos

function executarDescartar(ctx: Ctx, cmd: ComandoDescartar): void {
  const e = ctx.e
  if (cmd.jogador !== e.ativo) throw new ErroRegra('Não é o seu turno.')
  if (e.fase !== 'PRINCIPAL') throw new ErroRegra('O descarte só é permitido na fase principal.')
  if (e.jogadaFeita) throw new ErroRegra('Você já fez a jogada da mão neste turno.')
  const j = e.jogadores[cmd.jogador]
  const idx = j.mao.findIndex((c) => c.uid === cmd.uid)
  if (idx < 0) throw new ErroRegra('Essa carta não está na sua mão.')
  if (existeJogadaLegal(e, ctx.cat)) throw new ErroRegra('Há jogada legal disponível: o descarte só vale quando não existe jogada possível.')
  const carta = j.mao.splice(idx, 1)[0] as CartaInstancia
  j.descarte.push(carta)
  e.jogadaFeita = true
  emitir(ctx, { tipo: 'descarte_forcado', jogador: cmd.jogador, carta }, `${nomeJogador(cmd.jogador)} descarta ${nomeCarta(ctx.cat, carta.cartaId)} (sem jogada legal).`)
}

function executarMudarPosicao(ctx: Ctx, cmd: ComandoMudarPosicao): void {
  const e = ctx.e
  if (cmd.jogador !== e.ativo) throw new ErroRegra('Não é o seu turno.')
  if (e.fase !== 'PRINCIPAL' && e.fase !== 'COMBATE') throw new ErroRegra('Não é possível mudar a posição agora.')
  if (cmd.posicao !== 'ATAQUE' && cmd.posicao !== 'DEFESA') throw new ErroRegra('Posição inválida.')
  if (!zonaValida(cmd.zona, ZONAS_UNIDADE)) throw new ErroRegra('Zona de unidade inválida.')
  const u = e.jogadores[cmd.jogador].campo[cmd.zona]
  if (!u) throw new ErroRegra('Não há unidade nessa zona.')
  if (u.atacou) throw new ErroRegra('Uma unidade que já atacou não pode mudar de posição neste turno.')
  if (u.posicao === cmd.posicao) throw new ErroRegra('A unidade já está nessa posição.')
  u.posicao = cmd.posicao
  emitir(
    ctx,
    { tipo: 'posicao_alterada', jogador: cmd.jogador, zona: cmd.zona, posicao: cmd.posicao },
    `${nomeCarta(ctx.cat, u.cartaId)} muda para ${cmd.posicao === 'ATAQUE' ? 'ataque' : 'defesa'}.`,
  )
}

function executarAvancarFase(ctx: Ctx, cmd: ComandoAvancarFase): void {
  const e = ctx.e
  if (cmd.jogador !== e.ativo) throw new ErroRegra('Não é o seu turno.')
  if (e.fase !== 'PRINCIPAL') throw new ErroRegra('Só é possível avançar da fase principal para o combate.')
  if (!podeSeguir(e)) throw new ErroRegra('Faça uma jogada da mão (ou descarte) antes de avançar.')
  e.fase = 'COMBATE'
  emitir(ctx, { tipo: 'fase_alterada', jogador: cmd.jogador, fase: 'COMBATE' }, 'Fase de combate.')
}

function executarEncerrarTurno(ctx: Ctx, cmd: ComandoEncerrarTurno): void {
  const e = ctx.e
  if (cmd.jogador !== e.ativo) throw new ErroRegra('Não é o seu turno.')
  if (e.fase !== 'PRINCIPAL' && e.fase !== 'COMBATE') throw new ErroRegra('Não é possível encerrar o turno agora.')
  if (!podeSeguir(e)) throw new ErroRegra('Faça uma jogada da mão (ou descarte) antes de encerrar o turno.')
  e.fase = 'FIM'
  e.revelacao = null
  emitir(ctx, { tipo: 'turno_encerrado', jogador: cmd.jogador }, `${nomeJogador(cmd.jogador)} encerra o turno.`)
  e.ativo = outro(e.ativo)
  e.turno += 1
  iniciarTurno(ctx)
}

function executarAtacar(ctx: Ctx, cmd: ComandoAtacar): void {
  const erro = validarAtaque(ctx.e, cmd.jogador, cmd.atacante, cmd.alvo)
  if (erro) throw new ErroRegra(erro)
  resolverAtaque(ctx, cmd.jogador, cmd.atacante, cmd.alvo)
}

function executarDesistir(ctx: Ctx, cmd: ComandoDesistir): void {
  if (cmd.jogador !== 'humano' && cmd.jogador !== 'oponente') throw new ErroRegra('Jogador inválido.')
  emitir(ctx, { tipo: 'desistencia', jogador: cmd.jogador }, `${nomeJogador(cmd.jogador)} desistiu.`)
  finalizar(ctx, outro(cmd.jogador), 'desistencia')
}

/** Aplica um comando. Nunca altera `estado`; ilegal => `{ ok: false, erro, estado }` com o MESMO objeto recebido. */
export function aplicarComando(estado: EstadoDuelo, comando: Comando, catalogo: readonly Carta[] = CATALOGO): ResultadoComando {
  if (estado.resultado) return { ok: false, erro: 'A partida já terminou.', estado }
  if (comando === null || typeof comando !== 'object') return { ok: false, erro: 'Comando inválido.', estado }
  const ctx = novoCtx(estado, catalogo)
  try {
    switch (comando.tipo) {
      case 'jogarCarta':
        executarJogarCarta(ctx, comando)
        break
      case 'mudarPosicao':
        executarMudarPosicao(ctx, comando)
        break
      case 'descartar':
        executarDescartar(ctx, comando)
        break
      case 'avancarFase':
        executarAvancarFase(ctx, comando)
        break
      case 'encerrarTurno':
        executarEncerrarTurno(ctx, comando)
        break
      case 'atacar':
        executarAtacar(ctx, comando)
        break
      case 'desistir':
        executarDesistir(ctx, comando)
        break
      default:
        throw new ErroRegra('Comando desconhecido.')
    }
  } catch (x) {
    if (x instanceof ErroRegra) return { ok: false, erro: x.message, estado }
    throw x
  }
  ctx.e.log = estado.log.concat(ctx.ev)
  return { ok: true, estado: ctx.e, eventos: ctx.ev }
}
