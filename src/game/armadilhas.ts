// Armadilhas: elegibilidade, ordem de ativação (mais antiga primeiro) e disparo. Uma por evento.
import { emitir, nomeCarta, outro } from './estado'
import type { Catalogo, Ctx, EstadoDuelo, IdJogador } from './estado'

export type Gatilho = 'ataque_recebido' | 'ataque_direto' | 'invocacao_impacto'

export interface EfeitoArmadilha {
  operacao: string
  valor: number
}

/**
 * Zona (de suporte) da armadilha elegível mais antiga para o gatilho, ou -1.
 * Elegível = virada para baixo, com o gatilho certo e colocada em turno ANTERIOR ao atual
 * (só ativa a partir do turno seguinte ao da colocação). Desempate por `ordem` e depois `uid`.
 */
export function armadilhaMaisAntiga(e: EstadoDuelo, dono: IdJogador, gatilho: Gatilho, cat: Catalogo): number {
  let melhor = -1
  const suporte = e.jogadores[dono].suporte
  suporte.forEach((s, i) => {
    if (!s || s.tipo !== 'armadilha' || s.colocadaNoTurno >= e.turno) return
    if (cat.get(s.cartaId)?.efeito?.gatilho !== gatilho) return
    const m = melhor >= 0 ? suporte[melhor] : null
    if (!m || s.ordem < m.ordem || (s.ordem === m.ordem && s.uid < m.uid)) melhor = i
  })
  return melhor
}

/** Dispara a armadilha da zona: remove-a do suporte, manda ao descarte e emite o evento. */
export function ativarArmadilha(ctx: Ctx, dono: IdJogador, zona: number, gatilho: Gatilho): EfeitoArmadilha {
  const j = ctx.e.jogadores[dono]
  const s = j.suporte[zona]
  if (!s) throw new Error(`ativarArmadilha: zona ${zona} vazia`)
  const ef = ctx.cat.get(s.cartaId)?.efeito
  if (!ef) throw new Error(`ativarArmadilha: ${s.cartaId} sem efeito`)
  j.suporte[zona] = null
  j.descarte.push({ uid: s.uid, cartaId: s.cartaId })
  emitir(
    ctx,
    { tipo: 'armadilha_ativada', dono, zona, carta: { uid: s.uid, cartaId: s.cartaId }, gatilho, operacao: ef.operacao, valor: ef.valor },
    `${dono === 'humano' ? 'Sua armadilha foi ativada' : 'Armadilha do oponente ativada'}: ${nomeCarta(ctx.cat, s.cartaId)}.`,
  )
  return { operacao: ef.operacao, valor: ef.valor }
}

/** Procura e dispara (no máximo uma) armadilha do `dono` para o gatilho; null se nenhuma elegível. */
export function dispararPorEvento(ctx: Ctx, dono: IdJogador, gatilho: Gatilho): EfeitoArmadilha | null {
  const z = armadilhaMaisAntiga(ctx.e, dono, gatilho, ctx.cat)
  return z < 0 ? null : ativarArmadilha(ctx, dono, z, gatilho)
}

/**
 * Gatilho `invocacao_impacto`: ao invocar unidade do grupo `impacto`, a armadilha mais antiga do adversário
 * aplica debuff permanente em ATK e DEF (valor positivo no catálogo = redução).
 */
export function reagirInvocacao(ctx: Ctx, invocador: IdJogador, zonaUnidade: number): void {
  const u = ctx.e.jogadores[invocador].campo[zonaUnidade]
  if (!u || ctx.cat.get(u.cartaId)?.grupo !== 'impacto') return
  const dono = outro(invocador)
  const ef = dispararPorEvento(ctx, dono, 'invocacao_impacto')
  if (!ef || ef.operacao !== 'debuff_invocada') return
  const m = Math.abs(ef.valor)
  u.buffAtk -= m
  u.buffDef -= m
  emitir(
    ctx,
    { tipo: 'efeito_aplicado', jogador: dono, cartaId: u.cartaId, operacao: 'debuff_invocada', valor: -m, alvo: { jogador: invocador, zona: zonaUnidade } },
    `${nomeCarta(ctx.cat, u.cartaId)} perde ${m} de ATK e DEF.`,
  )
}
