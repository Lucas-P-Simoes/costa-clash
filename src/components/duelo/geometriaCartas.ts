export interface RetanguloCarta {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export interface EstiloLeque {
  angulo: number
  deslocamentoY: number
  sobreposicao: number
  zIndex: number
}

/**
 * Distribuição puramente visual da mão. O centro fica mais alto e reto; as
 * bordas descem/inclinam de forma simétrica. Não altera a ordem nem as regras.
 */
export function calcularEstiloLeque(indice: number, total: number): EstiloLeque {
  const quantidade = Math.max(1, Math.floor(total))
  const i = Math.max(0, Math.min(quantidade - 1, Math.floor(indice)))
  const centro = (quantidade - 1) / 2
  const normalizado = centro === 0 ? 0 : (i - centro) / centro
  const amplitude = Math.min(6, 2.5 + quantidade * 0.75)
  return {
    angulo: normalizado * amplitude,
    deslocamentoY: normalizado * normalizado * 0.55,
    sobreposicao: quantidade <= 2 ? 0 : Math.min(2.25, 0.55 + quantidade * 0.31),
    zIndex: 20 - Math.round(Math.abs(i - centro) * 2),
  }
}

export interface LimitesInspecao {
  left: number
  top: number
  right: number
  bottom: number
}

export interface PosicaoInspecao {
  left: number
  top: number
  lado: 'acima' | 'abaixo' | 'limitado'
}

export interface OpcoesDimensoesInspecao {
  larguraOrigem: number
  larguraDisponivel: number
  alturaDisponivel: number
  alturaViewport: number
  toque: boolean
  comDetalhes: boolean
  rem?: number
}

export interface DimensoesInspecao {
  larguraCarta: number
  larguraPainel: number
  escala: number
  layout: 'coluna' | 'linha'
}

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(Math.max(valor, minimo), Math.max(minimo, maximo))

/**
 * Dimensiona a carta ampliada a partir da carta real, não de um mínimo fixo.
 * Em viewport baixa os detalhes passam para a coluna lateral; nas demais ficam
 * abaixo da carta. Os limites recebidos já representam a área útil do tabuleiro.
 */
export function calcularDimensoesInspecao({
  larguraOrigem,
  larguraDisponivel,
  alturaDisponivel,
  alturaViewport,
  toque,
  comDetalhes,
  rem = 16,
}: OpcoesDimensoesInspecao): DimensoesInspecao {
  const origem = Math.max(1, larguraOrigem)
  const larguraUtil = Math.max(1, larguraDisponivel)
  const alturaUtil = Math.max(1, alturaDisponivel)
  const unidade = Math.max(1, rem)
  const compacto = alturaViewport <= 559
  // A prévia baixa usa 1 px de padding por lado; nas demais alturas mantém
  // 0,375rem. Os 2 px adicionais são as duas bordas do painel.
  const moldura = compacto ? unidade * 0.125 + 2 : unidade * 0.75 + 2
  const gap = compacto ? unidade * 0.25 : unidade * 0.375
  const layout = comDetalhes && compacto ? 'linha' : 'coluna'
  const alvo = origem * (toque ? 1.7 : 1.8)

  let limiteLarguraCarta = Math.max(1, larguraUtil - moldura)
  let limiteAlturaCarta: number
  let larguraPainel: number

  if (layout === 'linha') {
    const detalhesMinimos = Math.min(15 * unidade, Math.max(8 * unidade, larguraUtil * 0.28))
    limiteLarguraCarta = Math.max(1, limiteLarguraCarta - gap - detalhesMinimos)
    limiteAlturaCarta = Math.max(1, (alturaUtil - moldura) * 0.75)
    const larguraCarta = Math.min(alvo, limiteLarguraCarta, limiteAlturaCarta)
    const espacoDetalhes = Math.max(0, larguraUtil - moldura - gap - larguraCarta)
    const larguraDetalhes = Math.min(15 * unidade, espacoDetalhes)
    larguraPainel = Math.min(larguraUtil, larguraCarta + gap + larguraDetalhes + moldura)
    return { larguraCarta, larguraPainel, escala: larguraCarta / origem, layout }
  }

  // Na paisagem baixa o rótulo visual do verso é redundante e fica oculto;
  // portanto não deve reduzir a carta. A origem continua com rótulo acessível.
  const reservaDetalhes = comDetalhes ? Math.min(10 * unidade, alturaUtil * 0.38) : compacto ? 0 : Math.min(3 * unidade, alturaUtil * 0.2)
  limiteAlturaCarta = Math.max(1, (alturaUtil - moldura - reservaDetalhes) * 0.75)
  const larguraCarta = Math.min(alvo, limiteLarguraCarta, limiteAlturaCarta)
  larguraPainel = Math.min(larguraUtil, larguraCarta + moldura)
  return { larguraCarta, larguraPainel, escala: larguraCarta / origem, layout }
}

/** Posiciona a prévia sem sair da área útil. Prefere acima da carta de origem. */
export function calcularPosicaoInspecao(origem: RetanguloCarta, largura: number, altura: number, limites: LimitesInspecao, margem = 12, distancia = 10): PosicaoInspecao {
  const esquerda = limites.left + margem
  const direita = limites.right - margem
  const topo = limites.top + margem
  const base = limites.bottom - margem
  const left = limitar(origem.left + origem.width / 2 - largura / 2, esquerda, direita - largura)
  const acima = origem.top - distancia - altura
  if (acima >= topo) return { left, top: acima, lado: 'acima' }
  const abaixo = origem.bottom + distancia
  if (abaixo + altura <= base) return { left, top: abaixo, lado: 'abaixo' }
  return { left, top: limitar(acima, topo, base - altura), lado: 'limitado' }
}
