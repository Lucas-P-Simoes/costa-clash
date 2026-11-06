// Cálculo de atributos efetivos e resolução de ataques.
import { causarDano, destruirUnidade, emitir, nomeCarta, outro, verificarResultado, zonaValida } from './estado'
import type { Catalogo, Ctx, EstadoDuelo, IdJogador, UnidadeEmCampo } from './estado'
import { ZONAS_UNIDADE } from './tipos'
import type { Grupo } from './tipos'

/** Bônus do terreno global para um grupo (vale para os dois lados). */
export function bonusTerreno(e: EstadoDuelo, grupo: Grupo | undefined, cat: Catalogo): number {
  if (!e.terreno || !grupo) return 0
  const ef = cat.get(e.terreno.cartaId)?.efeito
  if (!ef || ef.operacao !== 'field_bonus') return 0
  return ef.alvo === 'qualquer' || ef.alvo === grupo ? ef.valor : 0
}

/** ATK_EFETIVO = max(0, ATK_BASE + buffs + terreno). */
export function atkEfetivo(e: EstadoDuelo, _dono: IdJogador, u: UnidadeEmCampo, cat: Catalogo): number {
  const c = cat.get(u.cartaId)
  const base = c?.atk ?? 0
  return Math.max(0, base + u.buffAtk + bonusTerreno(e, c?.grupo, cat))
}

/** DEF_EFETIVA = max(0, DEF_BASE + buffs + terreno). */
export function defEfetiva(e: EstadoDuelo, _dono: IdJogador, u: UnidadeEmCampo, cat: Catalogo): number {
  const c = cat.get(u.cartaId)
  const base = c?.defesa ?? 0
  return Math.max(0, base + u.buffDef + bonusTerreno(e, c?.grupo, cat))
}

/** Motivo pelo qual o ataque é ilegal (null = legal). Não altera nada. */
export function validarAtaque(e: EstadoDuelo, jogador: IdJogador, atacante: number, alvo: number | 'direto'): string | null {
  if (e.resultado) return 'A partida já terminou.'
  if (jogador !== e.ativo) return 'Não é o seu turno.'
  if (e.fase !== 'COMBATE') return 'Ataques só podem ser feitos na fase de combate.'
  if (e.turno === 1) return 'No primeiro turno da partida ninguém pode atacar.'
  if (!zonaValida(atacante, ZONAS_UNIDADE)) return 'Zona de atacante inválida.'
  const u = e.jogadores[jogador].campo[atacante]
  if (!u) return 'Não há unidade nessa zona para atacar.'
  if (u.posicao !== 'ATAQUE') return 'Só unidades em posição de ataque podem atacar.'
  if (u.atacou) return 'Essa unidade já atacou neste turno.'
  const adv = e.jogadores[outro(jogador)]
  if (alvo === 'direto') {
    if (adv.campo.some(Boolean)) return 'O adversário tem unidades em campo: ataque uma delas.'
    return null
  }
  if (!zonaValida(alvo, ZONAS_UNIDADE) || !adv.campo[alvo]) return 'Alvo de ataque inválido.'
  return null
}

/** Resolve o ataque (já validado): revelação, combate, dano, destruição e checagem de vitória. */
export function resolverAtaque(ctx: Ctx, jogador: IdJogador, zonaAtk: number, alvo: number | 'direto'): void {
  const e = ctx.e
  const def = outro(jogador)
  const atacante = e.jogadores[jogador].campo[zonaAtk] as UnidadeEmCampo
  atacante.atacou = true
  const nomeAtk = nomeCarta(ctx.cat, atacante.cartaId)
  const alvoInicial = alvo === 'direto' ? null : (e.jogadores[def].campo[alvo] as UnidadeEmCampo)
  const atacanteOculto = atacante.viradaParaBaixo
  const alvoOculto = !!alvoInicial?.viradaParaBaixo
  emitir(
    ctx,
    { tipo: 'ataque_declarado', jogador, atacante: zonaAtk, alvo },
    alvo === 'direto'
      ? atacanteOculto
        ? 'Uma unidade virada para baixo ataca diretamente.'
        : `${nomeAtk} ataca diretamente.`
      : atacanteOculto
        ? `Uma unidade virada para baixo ataca ${alvoOculto ? 'outra unidade virada para baixo' : nomeCarta(ctx.cat, alvoInicial!.cartaId)}.`
        : alvoOculto
          ? `${nomeAtk} ataca uma unidade virada para baixo.`
          : `${nomeAtk} ataca ${nomeCarta(ctx.cat, alvoInicial!.cartaId)}.`,
  )

  if (atacante.viradaParaBaixo) {
    atacante.viradaParaBaixo = false
    emitir(
      ctx,
      { tipo: 'unidade_revelada', jogador, zona: zonaAtk, carta: { uid: atacante.uid, cartaId: atacante.cartaId } },
      `${nomeCarta(ctx.cat, atacante.cartaId)} é revelada antes do cálculo de combate.`,
    )
  }
  const atk = atkEfetivo(e, jogador, atacante, ctx.cat)
  if (alvo === 'direto') {
    causarDano(ctx, def, atk)
    emitir(ctx, { tipo: 'combate_resolvido', jogador, atacante: zonaAtk, alvo, resultado: 'direto' }, 'Ataque direto resolvido.')
  } else {
    const alvoU = e.jogadores[def].campo[alvo] as UnidadeEmCampo
    if (alvoU.viradaParaBaixo) {
      alvoU.viradaParaBaixo = false
      emitir(
        ctx,
        { tipo: 'unidade_revelada', jogador: def, zona: alvo, carta: { uid: alvoU.uid, cartaId: alvoU.cartaId } },
        `${nomeCarta(ctx.cat, alvoU.cartaId)} é revelada antes do cálculo de combate.`,
      )
    }
    if (alvoU.posicao === 'ATAQUE') {
      const atkAlvo = atkEfetivo(e, def, alvoU, ctx.cat)
      if (atk > atkAlvo) {
        causarDano(ctx, def, atk - atkAlvo)
        destruirUnidade(ctx, def, alvo)
        emitir(ctx, { tipo: 'combate_resolvido', jogador, atacante: zonaAtk, alvo, resultado: 'atacante_vence' }, 'O atacante venceu o combate.')
      } else if (atk < atkAlvo) {
        causarDano(ctx, jogador, atkAlvo - atk)
        destruirUnidade(ctx, jogador, zonaAtk)
        emitir(ctx, { tipo: 'combate_resolvido', jogador, atacante: zonaAtk, alvo, resultado: 'alvo_vence' }, 'O defensor venceu o combate.')
      } else {
        destruirUnidade(ctx, jogador, zonaAtk)
        destruirUnidade(ctx, def, alvo)
        emitir(ctx, { tipo: 'combate_resolvido', jogador, atacante: zonaAtk, alvo, resultado: 'empate' }, 'Empate: as duas unidades foram destruídas.')
      }
    } else {
      const defAlvo = defEfetiva(e, def, alvoU, ctx.cat)
      if (atk > defAlvo) {
        destruirUnidade(ctx, def, alvo)
        emitir(ctx, { tipo: 'combate_resolvido', jogador, atacante: zonaAtk, alvo, resultado: 'defesa_destruida' }, 'A unidade em defesa foi destruída, sem dano aos LP.')
      } else if (atk < defAlvo) {
        causarDano(ctx, jogador, defAlvo - atk)
        emitir(ctx, { tipo: 'combate_resolvido', jogador, atacante: zonaAtk, alvo, resultado: 'ataque_repelido' }, 'A defesa repeliu o ataque; o atacante sofre dano.')
      } else {
        emitir(ctx, { tipo: 'combate_resolvido', jogador, atacante: zonaAtk, alvo, resultado: 'defesa_empate' }, 'A defesa resistiu: nada acontece.')
      }
    }
  }
  verificarResultado(ctx)
}
