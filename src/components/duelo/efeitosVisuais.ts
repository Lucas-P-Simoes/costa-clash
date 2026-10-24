import { useEffect, useRef, useState } from 'react'
import type { Evento, IdJogador } from '../../game'

/** Duração (ms) dos efeitos temporários; menor que o atraso entre passos da IA (700 ms). */
export const DURACAO_EFEITO_MS = 600

export interface Fantasma {
  lado: IdJogador
  zona: number
  cartaId: string
}

/** Efeitos visuais temporários derivados de eventos públicos. Chaves de zona: `${lado}:${zona}`. */
export interface EfeitosVisuais {
  /** Unidade recém-invocada (carta indo da mão ao campo). */
  entrando: string[]
  /** Atacante recém-declarado. */
  atacando: string[]
  /** Unidade atacada (impacto). */
  impacto: string[]
  /** Dano recebido por lado (soma dos eventos). */
  dano: Partial<Record<IdJogador, number>>
  cura: Partial<Record<IdJogador, number>>
  /** Unidades destruídas: o elemento permanece até o fim da animação. */
  destruidas: Fantasma[]
  /** O turno acabou de mudar. */
  turnoMudou: boolean
}

export const SEM_EFEITOS: EfeitosVisuais = { entrando: [], atacando: [], impacto: [], dano: {}, cura: {}, destruidas: [], turnoMudou: false }

export const chaveZona = (lado: IdJogador, zona: number) => `${lado}:${zona}`
const outroLado = (l: IdJogador): IdJogador => (l === 'humano' ? 'oponente' : 'humano')

export function semEfeitos(e: EfeitosVisuais): boolean {
  return (
    !e.turnoMudou &&
    e.entrando.length === 0 &&
    e.atacando.length === 0 &&
    e.impacto.length === 0 &&
    e.destruidas.length === 0 &&
    Object.keys(e.dano).length === 0 &&
    Object.keys(e.cura).length === 0
  )
}

/** Função pura: eventos públicos novos -> efeitos visuais. Não decide nada do jogo; só apresentação. */
export function derivarEfeitos(novos: readonly Evento[]): EfeitosVisuais {
  const r: EfeitosVisuais = { entrando: [], atacando: [], impacto: [], dano: {}, cura: {}, destruidas: [], turnoMudou: false }
  for (const e of novos) {
    switch (e.tipo) {
      case 'carta_jogada':
        if (e.destino === 'campo' && e.zona !== undefined) r.entrando.push(chaveZona(e.jogador, e.zona))
        break
      case 'ataque_declarado':
        r.atacando.push(chaveZona(e.jogador, e.atacante))
        if (e.alvo !== 'direto') r.impacto.push(chaveZona(outroLado(e.jogador), e.alvo))
        break
      case 'dano':
        r.dano[e.jogador] = (r.dano[e.jogador] ?? 0) + e.valor
        break
      case 'cura':
        r.cura[e.jogador] = (r.cura[e.jogador] ?? 0) + e.valor
        break
      case 'unidade_destruida':
        r.destruidas.push({ lado: e.jogador, zona: e.zona, cartaId: e.carta.cartaId })
        break
      case 'turno_iniciado':
        r.turnoMudou = true
        break
    }
  }
  return r
}

function unir(a: EfeitosVisuais, b: EfeitosVisuais): EfeitosVisuais {
  const somar = (x: Partial<Record<IdJogador, number>>, y: Partial<Record<IdJogador, number>>) => {
    const s = { ...x }
    for (const k of Object.keys(y) as IdJogador[]) s[k] = (s[k] ?? 0) + (y[k] ?? 0)
    return s
  }
  return {
    entrando: [...a.entrando, ...b.entrando],
    atacando: [...a.atacando, ...b.atacando],
    impacto: [...a.impacto, ...b.impacto],
    dano: somar(a.dano, b.dano),
    cura: somar(a.cura, b.cura),
    destruidas: [...a.destruidas, ...b.destruidas],
    turnoMudou: a.turnoMudou || b.turnoMudou,
  }
}

export function movimentoReduzido(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Observa o registro público e devolve os efeitos temporários dos eventos novos (classes de animação).
 * Nunca altera o fluxo: o estado do jogo já foi atualizado; os efeitos expiram sozinhos por um timer
 * limpo ao desmontar. Com `prefers-reduced-motion: reduce` não há efeitos (nenhuma classe temporária).
 */
export function useEfeitosVisuais(log: readonly Evento[], duracao: number = DURACAO_EFEITO_MS): EfeitosVisuais {
  const [fx, setFx] = useState<EfeitosVisuais>(SEM_EFEITOS)
  const vistos = useRef(log.length)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const novos = log.slice(vistos.current)
    vistos.current = log.length
    if (novos.length === 0 || movimentoReduzido()) return
    const d = derivarEfeitos(novos)
    if (semEfeitos(d)) return
    setFx((atual) => unir(atual, d))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFx(SEM_EFEITOS), duracao)
  }, [log, duracao])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )
  return fx
}
