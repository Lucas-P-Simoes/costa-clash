import { CATALOGO } from '../../data/catalogo'
import { atkEfetivo, defEfetiva, mapaCatalogo } from '../../game'
import type { EstadoDuelo, UnidadeEmCampo, VisaoDuelo } from '../../game'
import type { ConteudoInspecao } from './InspecaoCarta'

const catalogo = mapaCatalogo(CATALOGO)

/**
 * Resolve uma chave de inspeção exclusivamente contra a visão pública atual.
 * `planoVisivel` deve ser o estado reconstruído dessa mesma visão, nunca o
 * estado bruto do duelo, para atributos efetivos não ampliarem informação.
 */
export function resolverConteudoInspecao(chave: string, visao: VisaoDuelo, planoVisivel: EstadoDuelo): ConteudoInspecao | null {
  const partes = chave.split(':')
  if (partes[0] === 'mao') {
    const instancia = visao.eu.mao.find((item) => item.uid === partes[1])
    const carta = instancia ? catalogo.get(instancia.cartaId) : undefined
    return carta ? { oculta: false, carta } : null
  }
  if (partes[0] === 'mao-oponente') {
    const indice = Number(partes[1])
    return Number.isInteger(indice) && indice >= 0 && indice < visao.oponente.maoTamanho ? { oculta: true } : null
  }
  if (partes[0] !== 'unidade' && partes[0] !== 'suporte') return null
  const lado = partes[1]
  const zona = Number(partes[2])
  if ((lado !== 'humano' && lado !== 'oponente') || !Number.isInteger(zona) || zona < 0 || zona > 4) return null

  if (partes[0] === 'unidade') {
    const unidadeVisivel = (lado === 'humano' ? visao.eu.campo : visao.oponente.campo)[zona]
    if (!unidadeVisivel) return null
    if ('oculta' in unidadeVisivel && unidadeVisivel.oculta) return { oculta: true, posicao: unidadeVisivel.posicao }
    const unidade = unidadeVisivel as UnidadeEmCampo
    const carta = catalogo.get(unidade.cartaId)
    if (!carta) return null
    return {
      oculta: false,
      carta,
      atk: atkEfetivo(planoVisivel, lado, unidade, catalogo),
      def: defEfetiva(planoVisivel, lado, unidade, catalogo),
      posicao: unidade.posicao,
    }
  }

  const suporteVisivel = (lado === 'humano' ? visao.eu.suporte : visao.oponente.suporte)[zona]
  if (!suporteVisivel) return null
  if ('oculta' in suporteVisivel && suporteVisivel.oculta) return { oculta: true }
  const carta = catalogo.get((suporteVisivel as { cartaId: string }).cartaId)
  return carta ? { oculta: false, carta } : null
}
