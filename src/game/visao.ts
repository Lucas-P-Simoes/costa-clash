// Visão parcial do estado para um jogador: o que ele PODE saber. É a única entrada da IA (§9) e serve
// também como base para a UI renderizar a perspectiva do humano sem tocar na mão/baralho do adversário.
//
// Nunca inclui: mão do adversário (só o tamanho), ordem/conteúdo do baralho (só o tamanho, nem o próprio),
// armadilhas viradas do adversário (só a ocupação da zona, salvo se `revelar` estiver ativo), o log de eventos
// e a lista de repetições.
import { ZONAS_SUPORTE } from './tipos'
import type { CartaInstancia, EstadoDuelo, Fase, IdJogador, Posicao, Resultado, SuporteEmZona, TerrenoAtivo, UnidadeEmCampo } from './estado'
import { criarEstadoJogador, mapaCatalogo, outro } from './estado'
import type { Evento } from './estado'
import { CATALOGO } from '../data/catalogo'
import type { Carta } from './tipos'

export type SuporteVisivel = ({ oculta: false } & SuporteEmZona) | { oculta: true }
export type UnidadeVisivel = ({ oculta: false } & UnidadeEmCampo) | { oculta: true; posicao: Posicao; atacou: boolean }

export interface VisaoPropria {
  id: IdJogador
  lp: number
  mao: CartaInstancia[]
  baralhoTamanho: number
  campo: (UnidadeEmCampo | null)[]
  suporte: (SuporteEmZona | null)[]
  descarte: CartaInstancia[]
}

export interface VisaoAdversario {
  id: IdJogador
  lp: number
  maoTamanho: number
  baralhoTamanho: number
  campo: (UnidadeVisivel | null)[]
  suporte: (SuporteVisivel | null)[]
  descarte: CartaInstancia[]
}

export interface VisaoDuelo {
  perspectiva: IdJogador
  turno: number
  fase: Fase
  ativo: IdJogador
  jogadaFeita: boolean
  terreno: TerrenoAtivo | null
  /** As armadilhas do adversário estão visíveis para esta perspectiva (efeito `revelar`, até o fim do turno). */
  armadilhasReveladas: boolean
  resultado: Resultado | null
  eu: VisaoPropria
  oponente: VisaoAdversario
}

/** Identificador estável apenas dentro da visão pública; nunca reutiliza o uid real da unidade oculta. */
function uidPublicoUnidadeOculta(zona: number): string {
  return `?u${zona}`
}

export function visaoParaJogador(e: EstadoDuelo, perspectiva: IdJogador): VisaoDuelo {
  const eu = e.jogadores[perspectiva]
  const adv = e.jogadores[outro(perspectiva)]
  const reveladas = e.revelacao === perspectiva
  return structuredClone({
    perspectiva,
    turno: e.turno,
    fase: e.fase,
    ativo: e.ativo,
    jogadaFeita: e.jogadaFeita,
    terreno: e.terreno,
    armadilhasReveladas: reveladas,
    resultado: e.resultado,
    eu: {
      id: eu.id,
      lp: eu.lp,
      mao: eu.mao,
      baralhoTamanho: eu.baralho.length,
      campo: eu.campo,
      suporte: eu.suporte,
      descarte: eu.descarte,
    },
    oponente: {
      id: adv.id,
      lp: adv.lp,
      maoTamanho: adv.mao.length,
      baralhoTamanho: adv.baralho.length,
      campo: adv.campo.map((u): UnidadeVisivel | null => {
        if (!u) return null
        if (u.viradaParaBaixo) return { oculta: true, posicao: u.posicao, atacou: u.atacou }
        return { oculta: false, ...u }
      }),
      suporte: adv.suporte.map((s): SuporteVisivel | null => {
        if (!s) return null
        if (s.tipo === 'equipamento') {
          const zonaOculta = adv.campo.findIndex((u) => u?.viradaParaBaixo && u.uid === s.vinculadaA)
          return {
            oculta: false,
            ...s,
            ...(zonaOculta >= 0 ? { vinculadaA: uidPublicoUnidadeOculta(zonaOculta) } : {}),
          }
        }
        if (reveladas) return { oculta: false, ...s }
        return { oculta: true }
      }),
      descarte: adv.descarte,
    },
  } satisfies VisaoDuelo)
}

/**
 * Reconstrói um estado de PLANEJAMENTO a partir da visão: cartas ocultas viram marcadores (`cartaId: '?'`).
 * Serve só para a IA reutilizar as funções de legalidade do motor; não contém nenhuma informação oculta.
 */
export function estadoDeVisao(v: VisaoDuelo): EstadoDuelo {
  const marcadores = (prefixo: string, n: number): CartaInstancia[] => Array.from({ length: n }, (_, i) => ({ uid: `${prefixo}${i}`, cartaId: '?' }))
  const eu = criarEstadoJogador(v.perspectiva, [])
  eu.lp = v.eu.lp
  eu.mao = v.eu.mao
  eu.baralho = marcadores('?b', v.eu.baralhoTamanho)
  eu.campo = v.eu.campo
  eu.suporte = v.eu.suporte
  eu.descarte = v.eu.descarte
  const advId = v.oponente.id
  const adv = criarEstadoJogador(advId, [])
  adv.lp = v.oponente.lp
  adv.mao = marcadores('?m', v.oponente.maoTamanho)
  adv.baralho = marcadores('?B', v.oponente.baralhoTamanho)
  adv.campo = v.oponente.campo.map((u, i): UnidadeEmCampo | null => {
    if (!u) return null
    if (u.oculta) {
      return {
        uid: uidPublicoUnidadeOculta(i),
        cartaId: '?',
        posicao: u.posicao,
        viradaParaBaixo: true,
        atacou: u.atacou,
        buffAtk: 0,
        buffDef: 0,
        equipamentoUid: null,
        invocadaNoTurno: 0,
      }
    }
    const { oculta: _oculta, ...resto } = u
    return resto
  })
  adv.suporte = Array.from({ length: ZONAS_SUPORTE }, (_, i) => {
    const s = v.oponente.suporte[i] ?? null
    if (!s) return null
    if (s.oculta) return { uid: `?s${i}`, cartaId: '?', tipo: 'armadilha', colocadaNoTurno: 0, ordem: 0, vinculadaA: null }
    const { oculta: _oculta, ...resto } = s
    return resto
  })
  adv.descarte = v.oponente.descarte
  return {
    versao: 1,
    jogadores: { [v.perspectiva]: eu, [advId]: adv } as EstadoDuelo['jogadores'],
    terreno: v.terreno,
    fase: v.fase,
    ativo: v.ativo,
    turno: v.turno,
    jogadaFeita: v.jogadaFeita,
    revelacao: v.armadilhasReveladas ? v.perspectiva : null,
    proximaOrdem: 1,
    resultado: v.resultado,
    repeticoes: {},
    log: [],
  }
}

/**
 * Remove de uma lista de eventos o que `perspectiva` não pode saber: as cartas compradas pelo adversário
 * (fica só a quantidade) e a identidade de armadilhas que o adversário colocou viradas. O restante já é público
 * (cartas jogadas viradas para cima, ataques, danos, armadilhas ativadas, descartes).
 */
export function eventosPublicos(eventos: readonly Evento[], perspectiva: IdJogador, catalogo: readonly Carta[] = CATALOGO): Evento[] {
  const cat = mapaCatalogo(catalogo)
  return eventos.map((ev): Evento => {
    if (ev.tipo === 'compra' && ev.jogador !== perspectiva) {
      return { ...ev, cartas: [], quantidade: ev.cartas.length }
    }
    if (ev.tipo === 'carta_jogada' && ev.jogador !== perspectiva && cat.get(ev.carta.cartaId)?.tipo === 'armadilha') {
      return { ...ev, carta: { uid: '?', cartaId: '?' } }
    }
    if (ev.tipo === 'carta_jogada' && ev.jogador !== perspectiva && ev.destino === 'campo' && ev.viradaParaBaixo) {
      return {
        ...ev,
        carta: { uid: '?', cartaId: '?' },
        texto: `Oponente coloca uma unidade virada para baixo em ${ev.posicao === 'DEFESA' ? 'defesa' : 'ataque'}.`,
      }
    }
    if (ev.tipo === 'posicao_alterada' && ev.jogador !== perspectiva && ev.viradaParaBaixo) {
      return { ...ev, texto: `Uma unidade virada para baixo muda para ${ev.posicao === 'ATAQUE' ? 'ataque' : 'defesa'}.` }
    }
    if (ev.tipo === 'efeito_aplicado') {
      const { alvoViradoParaBaixo: _interno, ...publico } = ev
      if (ev.alvo?.jogador !== perspectiva && ev.alvoViradoParaBaixo) {
        return {
          ...publico,
          cartaId: '?',
          operacao: 'efeito_oculto',
          valor: 0,
          texto: 'Um efeito é aplicado a uma unidade virada para baixo.',
        }
      }
      return publico
    }
    return ev
  })
}

/** Log do estado sem informação oculta para `perspectiva` (use no DOM no lugar de `estado.log`). */
export function logPublico(estado: EstadoDuelo, perspectiva: IdJogador, catalogo: readonly Carta[] = CATALOGO): Evento[] {
  return eventosPublicos(estado.log, perspectiva, catalogo)
}
