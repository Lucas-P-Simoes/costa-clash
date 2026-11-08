// Roteiro do tutorial do Guardião do Mangue. Puro: o passo atual é DERIVADO do estado do duelo (mais os passos
// "Continuar" já confirmados), então não há estado próprio que possa dessincronizar. Não bloqueia nenhuma ação:
// o balão só orienta; o jogador pode jogar fora da ordem e o roteiro simplesmente pula o que já foi feito.
import { LP_GUARDIAO_TUTORIAL } from '../../../data/tutorialGuardiao'
import type { EstadoDuelo } from '../../../game'
import { VIDA_INICIAL } from '../../../game/tipos'

const milhar = (n: number) => n.toLocaleString('pt-BR')

/** Pontas (seletores CSS) do arrasto demonstrado; `carta` = o dedo leva uma carta (baixar da mão). */
export interface Arrasto {
  de: string
  para: string
  carta: boolean
}

/** Balão de fala apontado para um elemento do tabuleiro (seletor CSS do primeiro elemento que casar). */
export interface Balao {
  alvo: string
  texto: string
  /** Número do passo do arrasto (1 = pegar, 2 = soltar), mostrado numa bolinha. */
  numero?: 1 | 2
  /** De que lado do elemento o balão aparece (padrão: onde couber, preferindo em cima). */
  lado?: 'cima' | 'baixo' | 'esquerda'
}

export interface Passo {
  id: string
  titulo: string
  texto: string
  /** Seletor CSS (aceita vírgulas) do que pulsa em vermelho: onde clicar ou as duas pontas do arrasto (opcional). */
  alvo?: string | ((e: EstadoDuelo) => string)
  /** Demonstração animada de um arrasto (um "dedo" vai de `de` até `para`). */
  arrasto?: (e: EstadoDuelo) => Arrasto | null
  /** Balões curtos apontados para os elementos do tabuleiro ("Pegue esta carta", "Solte aqui"...). */
  balaos?: (e: EstadoDuelo) => Balao[]
  /** true = o jogador avança com o botão "Continuar"; false = avança quando a ação acontece. */
  manual: boolean
  /** Passo já superado pelo estado (a ação aconteceu ou o duelo seguiu adiante). */
  feito: (e: EstadoDuelo) => boolean
}

const temUnidade = (e: EstadoDuelo) => e.jogadores.humano.campo.some(Boolean)
const humanoAtacou = (e: EstadoDuelo) => e.log.some((ev) => ev.tipo === 'ataque_declarado' && ev.jogador === 'humano')
const passouDoTurno1 = (e: EstadoDuelo) => e.turno > 1

// ---- alvos da demonstração (seletores do tabuleiro; ver Partida.tsx)
const MAO_1 = '.duelo-mao__item:first-child .carta'
const zonaHumana = (z: number) => `[data-zona-unidade="humano:${z}"]` // zona ocupada
const zonaLivreHumana = (z: number) => `[data-destino="zona:humano:${z}"]` // zona vazia

/** Da primeira carta da mão até a primeira zona livre do seu campo. */
const arrastoBaixar = (e: EstadoDuelo): Arrasto => {
  const livre = e.jogadores.humano.campo.findIndex((u) => !u)
  // Campo cheio: a carta nova substitui a da zona 1.
  return { de: MAO_1, para: livre >= 0 ? zonaLivreHumana(livre) : '[data-destino="unidade:humano:0"]', carta: true }
}

/** Da sua unidade em ATAQUE até uma carta do Guardião (ou até a vida dele se o campo dele estiver vazio). */
function arrastoAtacar(e: EstadoDuelo): Arrasto | null {
  // O ataque só funciona depois da jogada da mão do turno: demonstra primeiro essa jogada.
  if (e.fase === 'PRINCIPAL' && !e.jogadaFeita && e.jogadores.humano.mao.length > 0) return arrastoBaixar(e)
  const z = e.jogadores.humano.campo.findIndex((u) => u?.posicao === 'ATAQUE')
  if (z < 0) return null
  const alvo = e.jogadores.oponente.campo.findIndex(Boolean)
  return { de: `${zonaHumana(z)} .carta`, para: alvo >= 0 ? `[data-zona-unidade="oponente:${alvo}"] .carta` : '[aria-label^="Vida do oponente"]', carta: false }
}

const pontas = (fn: (e: EstadoDuelo) => Arrasto | null) => (e: EstadoDuelo) => {
  const a = fn(e)
  return a ? `${a.de}, ${a.para}` : ''
}

const VIDA_OPONENTE = '[aria-label^="Vida do oponente"]'
const VIDA_VOCE = '[aria-label^="Sua vida"]'

/** Balões "1 / 2" de um arrasto: o 1º na ponta de partida, o 2º no destino. */
const balaoArrasto = (textoDe: (a: Arrasto) => string, textoPara: (a: Arrasto) => string) => (e: EstadoDuelo, arrasto: ((e: EstadoDuelo) => Arrasto | null) | undefined): Balao[] => {
  const a = arrasto?.(e)
  return a
    ? [
        { alvo: a.de, texto: textoDe(a), numero: 1 },
        { alvo: a.para, texto: textoPara(a), numero: 2 },
      ]
    : []
}

export const PASSOS: readonly Passo[] = [
  {
    id: 'boas-vindas',
    titulo: 'Bem-vindo ao manguezal!',
    texto: `Eu sou o Guardião do Mangue e vou te ensinar a jogar. Cada lado tem pontos de vida (LP): quando os do adversário chegam a zero, você vence. Você tem 5 zonas no campo para colocar suas cartas.`,
    balaos: () => [
      { alvo: VIDA_VOCE, texto: `Sua vida: ${milhar(VIDA_INICIAL)} LP`, lado: 'baixo' },
      { alvo: VIDA_OPONENTE, texto: `Minha vida: ${milhar(LP_GUARDIAO_TUTORIAL)} LP (só no tutorial, para ser rápido)`, lado: 'baixo' },
    ],
    manual: true,
    feito: temUnidade,
  },
  {
    id: 'baixar',
    titulo: 'Baixe uma carta',
    texto: 'A cada turno você baixa UMA carta da mão para o campo. Arraste a carta destacada até a zona vazia (ou clique na carta e depois na zona). A Saneamento Integrado, de 2.000 de ataque, é uma boa abertura.',
    alvo: pontas(arrastoBaixar),
    arrasto: arrastoBaixar,
    balaos: (e) => balaoArrasto(() => 'Pegue esta carta', () => 'Solte aqui')(e, arrastoBaixar),
    manual: false,
    feito: temUnidade,
  },
  {
    id: 'posicao',
    titulo: 'Ataque ou defesa',
    texto: 'Cada unidade fica em ATAQUE (ataca com o valor de ATK) ou em DEFESA (deitada, resiste com o valor de DEF). Clique na setinha da carta para alternar, enquanto ela ainda não atacou no turno.',
    alvo: '.zona__girar',
    balaos: () => [{ alvo: '.zona__girar', texto: 'Clique aqui para virar entre ataque e defesa', lado: 'baixo' }],
    manual: true,
    feito: passouDoTurno1,
  },
  {
    id: 'encerrar',
    titulo: 'Encerre o turno',
    texto: 'No primeiro turno do jogo ninguém ataca, então é só passar a vez. Na vez do Guardião eu só baixo uma carta: no tutorial eu não ataco, mas os adversários de verdade atacam!',
    alvo: '#b-encerrar',
    balaos: () => [{ alvo: '#b-encerrar', texto: 'Clique aqui para passar a vez', lado: 'esquerda' }],
    manual: false,
    feito: passouDoTurno1,
  },
  {
    id: 'atacar',
    titulo: 'Hora de atacar',
    texto: 'Primeiro baixe (ou descarte) a carta da sua mão neste turno: só depois disso a seta de ataque funciona. Então arraste da sua unidade em ATAQUE até uma carta minha (ou até a minha vida, se meu campo estiver vazio). Quem tem o maior ATK destrói a outra, e o perdedor perde a diferença em vida.',
    alvo: pontas(arrastoAtacar),
    arrasto: arrastoAtacar,
    balaos: (e) =>
      balaoArrasto(
        (a) => (a.carta ? 'Primeiro, pegue esta carta' : 'Arraste sua unidade'),
        (a) => (a.carta ? 'e solte aqui' : a.para === VIDA_OPONENTE ? 'até a vida do Guardião' : 'até esta carta'),
      )(e, arrastoAtacar),
    manual: false,
    feito: humanoAtacou,
  },
  {
    id: 'defesa-e-direto',
    titulo: 'Defesa e ataque direto',
    texto: 'Contra uma unidade em DEFESA, você só a destrói se o seu ATK for maior que a DEF dela; se for menor, você perde a diferença em vida. Se o campo do adversário estiver vazio, o ataque vai direto na vida dele.',
    balaos: () => [{ alvo: VIDA_OPONENTE, texto: 'Sem cartas em campo, o ataque tira vida daqui', lado: 'baixo' }],
    manual: true,
    feito: (e) => !!e.resultado,
  },
  {
    id: 'finalizar',
    titulo: 'Continue até vencer',
    texto: 'Baixe cartas, ataque e encerre o turno. Quando eu chegar a zero de vida, você vence este duelo. E lembre: o manguezal serve de berçário para peixes, caranguejos e aves e ajuda a proteger as margens.',
    manual: true,
    feito: (e) => !!e.resultado,
  },
]

/** Passo a mostrar agora (ou null se o tutorial acabou). `confirmados` = ids dos passos "Continuar" já aceitos. */
export function passoAtual(estado: EstadoDuelo, confirmados: ReadonlySet<string>): Passo | null {
  if (estado.resultado) return null
  for (const p of PASSOS) {
    if (confirmados.has(p.id) || p.feito(estado)) continue
    return p
  }
  return null
}
