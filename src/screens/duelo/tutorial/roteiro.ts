// Roteiro do tutorial do Guardião do Mangue. Puro: o passo atual é DERIVADO do estado do duelo (mais os passos
// "Continuar" já confirmados), então não há estado próprio que possa dessincronizar. Não bloqueia nenhuma ação:
// o balão só orienta; o jogador pode jogar fora da ordem e o roteiro simplesmente pula o que já foi feito.
import { LP_GUARDIAO_TUTORIAL } from '../../../data/tutorialGuardiao'
import type { EstadoDuelo } from '../../../game'
import { VIDA_INICIAL } from '../../../game/tipos'

const milhar = (n: number) => n.toLocaleString('pt-BR')

export interface Passo {
  id: string
  titulo: string
  texto: string
  /** Seletor CSS do elemento destacado (opcional). */
  alvo?: string
  /** true = o jogador avança com o botão "Continuar"; false = avança quando a ação acontece. */
  manual: boolean
  /** Passo já superado pelo estado (a ação aconteceu ou o duelo seguiu adiante). */
  feito: (e: EstadoDuelo) => boolean
}

const temUnidade = (e: EstadoDuelo) => e.jogadores.humano.campo.some(Boolean)
const humanoAtacou = (e: EstadoDuelo) => e.log.some((ev) => ev.tipo === 'ataque_declarado' && ev.jogador === 'humano')
const passouDoTurno1 = (e: EstadoDuelo) => e.turno > 1

export const PASSOS: readonly Passo[] = [
  {
    id: 'boas-vindas',
    titulo: 'Bem-vindo ao manguezal!',
    texto: `Eu sou o Guardião do Mangue e vou ensinar o básico. Você começa com ${milhar(VIDA_INICIAL)} pontos de vida (LP) e tem 5 zonas para suas cartas. Quando a vida do adversário chega a zero, você vence. Hoje eu começo com só ${milhar(LP_GUARDIAO_TUTORIAL)} LP, para a lição ser curta.`,
    manual: true,
    feito: temUnidade,
  },
  {
    id: 'baixar',
    titulo: 'Baixe uma carta',
    texto: 'Em cada turno você baixa UMA carta da mão. Arraste uma unidade até uma zona do seu campo (ou clique na carta e escolha a zona). Dica: a Saneamento Integrado, de 2.000 de ataque, é uma boa abertura.',
    alvo: '.duelo-mao__cartas',
    manual: false,
    feito: temUnidade,
  },
  {
    id: 'posicao',
    titulo: 'Ataque ou defesa',
    texto: 'Uma unidade em ATAQUE ataca com o valor de ATK; em DEFESA fica deitada e resiste com o valor de DEF. A setinha no canto da carta alterna a posição, enquanto ela ainda não atacou no turno.',
    alvo: '.zona__girar',
    manual: true,
    feito: passouDoTurno1,
  },
  {
    id: 'encerrar',
    titulo: 'Encerre o turno',
    texto: 'No primeiro turno do jogo ninguém ataca, então é só passar a vez. Clique em ENCERRAR TURNO. Na vez do Guardião eu só baixo uma carta: no tutorial eu não ataco, mas os adversários de verdade atacam!',
    alvo: '#b-encerrar',
    manual: false,
    feito: passouDoTurno1,
  },
  {
    id: 'atacar',
    titulo: 'Hora de atacar',
    texto: 'Primeiro baixe (ou descarte) a carta da sua mão neste turno: só depois disso a seta de ataque funciona. Então arraste da sua unidade em ATAQUE até uma carta do Guardião (ou até a vida dele, se o campo dele estiver vazio). Atacar uma unidade em ATAQUE: quem tem o maior ATK destrói a outra e o perdedor perde a diferença em vida.',
    alvo: '[data-zona-unidade^="humano"] .carta',
    manual: false,
    feito: humanoAtacou,
  },
  {
    id: 'defesa-e-direto',
    titulo: 'Defesa e ataque direto',
    texto: 'Contra uma unidade em DEFESA, só destrói se o seu ATK for maior que a DEF dela; se for menor, você perde a diferença em vida. Se o campo do adversário estiver vazio, o ataque vai direto na vida dele.',
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
