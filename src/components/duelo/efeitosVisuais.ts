import { useEffect, useRef, useState } from 'react'
import type { Evento, IdJogador, Posicao } from '../../game'

/** Duração (ms) dos efeitos temporários; menor que o atraso entre passos da IA (700 ms). */
export const DURACAO_EFEITO_MS = 600

export interface Fantasma {
  lado: IdJogador
  zona: number
  cartaId: string
  /** Posição da unidade antes de cair (o fantasma é desenhado em pé ou deitado como ela estava). */
  posicao: Posicao
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
export function derivarEfeitos(novos: readonly Evento[], posicoes: Readonly<Record<string, Posicao>> = {}): EfeitosVisuais {
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
        r.destruidas.push({ lado: e.jogador, zona: e.zona, cartaId: e.carta.cartaId, posicao: posicoes[chaveZona(e.jogador, e.zona)] ?? 'ATAQUE' })
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
export function useEfeitosVisuais(log: readonly Evento[], posicoes: Readonly<Record<string, Posicao>> = {}, duracao: number = DURACAO_EFEITO_MS): EfeitosVisuais {
  const [fx, setFx] = useState<EfeitosVisuais>(SEM_EFEITOS)
  const vistos = useRef(log.length)
  const timer = useRef<number | undefined>(undefined)
  // posições das unidades na renderização anterior (a unidade destruída já saiu da visão atual)
  const posAnteriores = useRef<Readonly<Record<string, Posicao>>>(posicoes)

  useEffect(() => {
    const novos = log.slice(vistos.current)
    vistos.current = log.length
    if (novos.length === 0 || movimentoReduzido()) return
    const d = derivarEfeitos(novos, posAnteriores.current)
    if (semEfeitos(d)) return
    setFx((atual) => unir(atual, d))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFx(SEM_EFEITOS), duracao)
  }, [log, duracao])

  // roda depois do efeito acima (ordem de declaração): guarda as posições desta renderização para a próxima
  useEffect(() => {
    posAnteriores.current = posicoes
  })

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )
  return fx
}

// ---------------------------------------------------------------- confronto (ataque entre unidades)

/** Duração (ms) da cena de confronto: aproximação, impacto/vibração e, se houver, queima da carta derrotada. */
export const DURACAO_CONFRONTO_MS = 5000

export interface LadoConfronto {
  lado: IdJogador
  zona: number
  /** null = carta continua desconhecida (desenhada pelo verso). */
  cartaId: string | null
  /** A unidade foi destruída neste combate (efeito de queima). */
  destruida: boolean
}

export interface Confronto {
  atacante: LadoConfronto
  alvo: LadoConfronto
}

/**
 * Função pura: entre os eventos novos, o último ataque de unidade contra unidade que não foi anulado.
 * Identidades vêm da revelação no próprio combate ou das cartas visíveis antes dele (`cartasAnteriores`).
 */
export function derivarConfronto(novos: readonly Evento[], cartasAnteriores: Readonly<Record<string, string>> = {}): Confronto | null {
  let r: Confronto | null = null
  for (let i = 0; i < novos.length; i++) {
    const e = novos[i]
    if (e.tipo !== 'ataque_declarado' || e.alvo === 'direto') continue
    const defensor = outroLado(e.jogador)
    const atacante: LadoConfronto = { lado: e.jogador, zona: e.atacante, cartaId: cartasAnteriores[chaveZona(e.jogador, e.atacante)] ?? null, destruida: false }
    const alvo: LadoConfronto = { lado: defensor, zona: e.alvo, cartaId: cartasAnteriores[chaveZona(defensor, e.alvo)] ?? null, destruida: false }
    for (let j = i + 1; j < novos.length; j++) {
      const s = novos[j]
      if (s.tipo === 'ataque_declarado') break
      for (const p of [atacante, alvo]) {
        if (s.tipo === 'unidade_revelada' && s.jogador === p.lado && s.zona === p.zona) p.cartaId = s.carta.cartaId
        if (s.tipo === 'unidade_destruida' && s.jogador === p.lado && s.zona === p.zona) {
          p.destruida = true
          if (s.carta.cartaId !== '?') p.cartaId = s.carta.cartaId
        }
      }
    }
    r = { atacante, alvo }
  }
  return r
}

/**
 * Observa o registro público e devolve a cena de confronto do último ataque entre unidades (com `id`
 * crescente para reiniciar as animações). Só apresentação: expira por timer; sem cena com movimento reduzido.
 */
export function useConfronto(
  log: readonly Evento[],
  cartas: Readonly<Record<string, string>>,
  duracao: number = DURACAO_CONFRONTO_MS,
): (Confronto & { id: number }) | null {
  const [cena, setCena] = useState<(Confronto & { id: number }) | null>(null)
  const vistos = useRef(log.length)
  const timer = useRef<number | undefined>(undefined)
  const cartasAnteriores = useRef(cartas)
  const contador = useRef(0)

  useEffect(() => {
    const novos = log.slice(vistos.current)
    vistos.current = log.length
    if (novos.length === 0 || movimentoReduzido()) return
    const c = derivarConfronto(novos, cartasAnteriores.current)
    if (!c) return
    contador.current += 1
    setCena({ ...c, id: contador.current })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCena(null), duracao)
  }, [log, duracao])

  useEffect(() => {
    cartasAnteriores.current = cartas
  })

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )
  return cena
}
