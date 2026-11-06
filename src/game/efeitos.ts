// Efeitos das ações, resolvidos por `operacao` do catálogo (tabela operação -> comportamento).
//
// Normalização de sinais (decisão registrada em REGRAS_DO_JOGO.md): o sinal do catálogo NÃO é usado
// diretamente. `debuff_grupo` e `debuff_invocada` SEMPRE reduzem (|valor|); `buff_*` SEMPRE aumentam (|valor|).
import { curar, destruirUnidade, emitir, nomeCarta, outro, zonaValida } from './estado'
import type { Catalogo, CartaInstancia, Ctx, EstadoDuelo, IdJogador } from './estado'
import { ZONAS_UNIDADE, VIDA_INICIAL } from './tipos'
import type { Carta, Grupo } from './tipos'

const GRUPOS: ReadonlySet<string> = new Set(['ecossistema', 'fauna', 'atividade', 'impacto'])

type Destino = 'descarte' | 'terreno'

interface Operacao {
  /** De quem é a unidade alvo (null = sem alvo). */
  lado: 'aliada' | 'inimiga' | null
  destino: Destino
  bloqueio?: (e: EstadoDuelo, jogador: IdJogador) => string | null
  aplicar: (ctx: Ctx, jogador: IdJogador, carta: Carta, inst: CartaInstancia, alvo: number | undefined) => void
}

function grupoFiltro(carta: Carta): Grupo | null {
  const a = carta.efeito?.alvo
  return a && GRUPOS.has(a) ? (a as Grupo) : null
}

function alterarAtributos(ctx: Ctx, jogador: IdJogador, carta: Carta, lado: IdJogador, zona: number, delta: number): void {
  const u = ctx.e.jogadores[lado].campo[zona]
  if (!u) throw new Error('alterarAtributos: alvo ausente')
  u.buffAtk += delta
  u.buffDef += delta
  const sinal = delta >= 0 ? '+' : ''
  emitir(
    ctx,
    {
      tipo: 'efeito_aplicado',
      jogador,
      cartaId: carta.id,
      operacao: carta.efeito?.operacao ?? '',
      valor: delta,
      alvo: { jogador: lado, zona },
      ...(u.viradaParaBaixo ? { alvoViradoParaBaixo: true } : {}),
    },
    `${u.viradaParaBaixo ? 'Uma unidade virada para baixo' : nomeCarta(ctx.cat, u.cartaId)}: ${sinal}${delta} de ATK e DEF.`,
  )
}

const OPERACOES: Readonly<Record<string, Operacao>> = {
  debuff_grupo: {
    lado: 'inimiga',
    destino: 'descarte',
    aplicar: (ctx, jogador, carta, _i, alvo) => alterarAtributos(ctx, jogador, carta, outro(jogador), alvo as number, -Math.abs(carta.efeito?.valor ?? 0)),
  },
  buff_grupo: {
    lado: 'aliada',
    destino: 'descarte',
    aplicar: (ctx, jogador, carta, _i, alvo) => alterarAtributos(ctx, jogador, carta, jogador, alvo as number, Math.abs(carta.efeito?.valor ?? 0)),
  },
  buff_unidade: {
    lado: 'aliada',
    destino: 'descarte',
    aplicar: (ctx, jogador, carta, _i, alvo) => alterarAtributos(ctx, jogador, carta, jogador, alvo as number, Math.abs(carta.efeito?.valor ?? 0)),
  },
  destruir_grupo: {
    lado: 'inimiga',
    destino: 'descarte',
    aplicar: (ctx, jogador, carta, _i, alvo) => {
      emitir(
        ctx,
        { tipo: 'efeito_aplicado', jogador, cartaId: carta.id, operacao: 'destruir_grupo', valor: 0, alvo: { jogador: outro(jogador), zona: alvo as number } },
        `${carta.nome} atinge uma unidade inimiga.`,
      )
      destruirUnidade(ctx, outro(jogador), alvo as number)
    },
  },
  cura: {
    lado: null,
    destino: 'descarte',
    bloqueio: (e, jogador) => (e.jogadores[jogador].lp >= VIDA_INICIAL ? 'Seus LP já estão no máximo.' : null),
    aplicar: (ctx, jogador, carta) => {
      curar(ctx, jogador, Math.abs(carta.efeito?.valor ?? 0))
    },
  },
  field_bonus: {
    lado: null,
    destino: 'terreno',
    aplicar: (ctx, jogador, carta, inst) => {
      const anterior = ctx.e.terreno
      if (anterior) ctx.e.jogadores[anterior.dono].descarte.push({ uid: anterior.uid, cartaId: anterior.cartaId })
      ctx.e.terreno = { uid: inst.uid, cartaId: inst.cartaId, dono: jogador }
      emitir(
        ctx,
        { tipo: 'terreno_alterado', cartaId: carta.id, dono: jogador, ...(anterior ? { anterior: anterior.cartaId } : {}) },
        `Novo terreno: ${carta.nome}${anterior ? ` (substitui ${nomeCarta(ctx.cat, anterior.cartaId)})` : ''}.`,
      )
    },
  },
}

export interface AnaliseAcao {
  /** Motivo pelo qual a ação não pode ser jogada agora (null = jogável). */
  bloqueio: string | null
  /** Zonas de unidade válidas como alvo (vazio se a carta não exige alvo). */
  alvos: number[]
  exigeAlvo: boolean
  destino: Destino | null
  /** Dono das unidades-alvo (null se não exige alvo). */
  donoAlvo: IdJogador | null
}

/** Quais alvos e restrições valem para uma carta de ação no estado atual (sem alterar nada). */
export function analisarAcao(e: EstadoDuelo, jogador: IdJogador, carta: Carta, cat: Catalogo): AnaliseAcao {
  const op = carta.efeito ? OPERACOES[carta.efeito.operacao] : undefined
  if (!op) return { bloqueio: 'Efeito desconhecido.', alvos: [], exigeAlvo: false, destino: null, donoAlvo: null }
  const dono = op.lado === null ? null : op.lado === 'aliada' ? jogador : outro(jogador)
  const bloqueioGeral = op.bloqueio?.(e, jogador) ?? null
  if (bloqueioGeral) return { bloqueio: bloqueioGeral, alvos: [], exigeAlvo: op.lado !== null, destino: op.destino, donoAlvo: dono }
  if (dono === null) return { bloqueio: null, alvos: [], exigeAlvo: false, destino: op.destino, donoAlvo: null }
  const grupo = grupoFiltro(carta)
  const alvos: number[] = []
  e.jogadores[dono].campo.forEach((u, z) => {
    if (!u) return
    // Não use grupo/identidade ocultos para oferecer ao adversário um alvo que ele não poderia conhecer.
    if (dono !== jogador && u.viradaParaBaixo) return
    if (grupo && cat.get(u.cartaId)?.grupo !== grupo) return
    alvos.push(z)
  })
  return {
    bloqueio: alvos.length === 0 ? 'Não há alvo válido para esta carta.' : null,
    alvos,
    exigeAlvo: true,
    destino: op.destino,
    donoAlvo: dono,
  }
}

/** Validação completa dos parâmetros de uma ação da mão (null = ok). */
export function validarAcao(e: EstadoDuelo, jogador: IdJogador, carta: Carta, cat: Catalogo, alvo: number | undefined): string | null {
  const a = analisarAcao(e, jogador, carta, cat)
  if (a.bloqueio) return a.bloqueio
  if (a.exigeAlvo) {
    if (alvo === undefined) return 'Escolha uma unidade como alvo.'
    if (!zonaValida(alvo, ZONAS_UNIDADE) || !a.alvos.includes(alvo)) return 'Alvo inválido para esta carta.'
  }
  return null
}

/** Aplica a ação (já validada) e coloca a carta no destino correto. */
export function resolverAcao(ctx: Ctx, jogador: IdJogador, carta: Carta, inst: CartaInstancia, alvo: number | undefined): Destino {
  const op = OPERACOES[carta.efeito?.operacao ?? ''] as Operacao
  op.aplicar(ctx, jogador, carta, inst, alvo)
  if (op.destino === 'descarte') ctx.e.jogadores[jogador].descarte.push({ ...inst })
  return op.destino
}
