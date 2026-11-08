import { useMemo, useState } from 'react'
import type { ItemColecao, ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { IconeVoltar } from '../../components/ui/Icones'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { CATALOGO } from '../../data/catalogo'
import { BARALHO_GUARDIAO_TUTORIAL, BARALHO_JOGADOR_TUTORIAL, ID_OPONENTE_TUTORIAL, LP_GUARDIAO_TUTORIAL } from '../../data/tutorialGuardiao'
import { buscarOponente } from '../../data/oponentes'
import { criarDuelo, mapaCatalogo } from '../../game'
import { Partida } from './Partida'
import { useRecompensaDuelo } from './recompensa'

interface Props {
  oponenteId: string
  /** Usuário logado: usa o baralho do perfil; ausente (ou perfil sem baralho) usa o baralho inicial. */
  usuario?: UsuarioAutenticado
  /** Serviço da conta: registra o duelo e resgata o drop de carta da vitória (só com usuário logado). */
  servicoAuth?: ServicoAuth
  /** Coleção nova devolvida pelo servidor após um drop. */
  onColecaoAtualizada?: (colecao: ItemColecao[]) => void
  /** Vitória do jogador nesta partida (alimenta a progressão de adversários). */
  onVitoriaOponente?: (oponenteId: string) => void
  onVoltar: () => void
  /** Seed da primeira partida (testes/depuração); padrão: relógio. */
  seedInicial?: number
  /** Atraso (ms) entre passos do turno da IA. Padrão: 700, ou 0 com prefers-reduced-motion. */
  atrasoIA?: number
}

function novaSeed(): number {
  return Date.now() % 2147483647
}

function atrasoPadrao(): number {
  const reduzido = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduzido ? 0 : 700
}

/** Inicia o duelo contra o adversário escolhido; erros de baralho ou de adversário aparecem sem quebrar a navegação. */
export function TelaDuelo({ oponenteId, usuario, servicoAuth, onColecaoAtualizada, onVitoriaOponente, onVoltar, seedInicial, atrasoIA }: Props) {
  // A seed fica no estado da tela (depuração); JOGAR NOVAMENTE gera outra e remonta a partida (key).
  const [seed, setSeed] = useState<number>(() => seedInicial ?? novaSeed())
  // Tutorial do Guardião do Mangue: abre sempre no duelo 1; "Pular tutorial" vira um duelo normal (baralho embaralhado).
  const [tutorialPulado, setTutorialPulado] = useState(false)
  const tutorialAtivo = oponenteId === ID_OPONENTE_TUTORIAL && !tutorialPulado
  const oponente = buscarOponente(oponenteId)
  const baralhoOponente = BARALHOS_OPONENTES[oponenteId]
  // Baralho salvo vazio, ou com cartas que saíram do catálogo (ex.: suportes removidos), cai no baralho inicial.
  const baralhoSalvoUsavel = !!usuario?.baralho?.length && usuario.baralho.every((id) => mapaCatalogo(CATALOGO).has(id))
  const baralhoJogador = baralhoSalvoUsavel ? (usuario?.baralho as string[]) : BARALHO_INICIAL
  const atraso = useMemo(() => atrasoIA ?? atrasoPadrao(), [atrasoIA])
  const { recompensa, aoVencer } = useRecompensaDuelo(oponenteId, seed, usuario, servicoAuth, onColecaoAtualizada)

  const criado = useMemo(() => {
    if (!oponente || !baralhoOponente) return { ok: false as const, erros: ['Adversário não encontrado.'] }
    if (tutorialAtivo) {
      return criarDuelo({ baralhoJogador: BARALHO_JOGADOR_TUTORIAL, baralhoOponente: BARALHO_GUARDIAO_TUTORIAL, seed, ordemFixa: true, lpOponente: LP_GUARDIAO_TUTORIAL })
    }
    return criarDuelo({ baralhoJogador, baralhoOponente, seed })
  }, [oponente, baralhoOponente, baralhoJogador, seed, tutorialAtivo])

  if (!oponente || !criado.ok) {
    const erros = criado.ok ? [] : criado.erros
    return (
      <div className="tela tela-jogo">
        <CabecalhoTela titulo="Duelo" />
        <main className="tela-simples__corpo">
          <p role="alert">Não foi possível iniciar o duelo. {erros.join(' ')}</p>
          <BotaoRetro icone={<IconeVoltar />} onClick={onVoltar}>
            Voltar
          </BotaoRetro>
        </main>
      </div>
    )
  }
  return (
    <Partida
      key={`${seed}:${tutorialAtivo ? 't' : 'n'}`}
      estadoInicial={criado.estado}
      oponente={oponente}
      atrasoIA={atraso}
      recompensa={recompensa}
      onVitoria={() => {
        aoVencer()
        onVitoriaOponente?.(oponenteId)
      }}
      tutorial={tutorialAtivo ? { onPular: () => setTutorialPulado(true) } : undefined}
      onVoltar={onVoltar}
      onNovamente={() => setSeed((s) => { const n = novaSeed(); return n === s ? s + 1 : n })}
    />
  )
}
