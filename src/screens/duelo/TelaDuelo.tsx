import { useMemo, useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/servicoAuth'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { IconeVoltar } from '../../components/ui/Icones'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { buscarOponente } from '../../data/oponentes'
import { criarDuelo } from '../../game'
import { Partida } from './Partida'

interface Props {
  oponenteId: string
  /** Usuário logado: usa o baralho do perfil; ausente (ou perfil sem baralho) usa o baralho inicial. */
  usuario?: UsuarioAutenticado
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
export function TelaDuelo({ oponenteId, usuario, onVoltar, seedInicial, atrasoIA }: Props) {
  // A seed fica no estado da tela (depuração); JOGAR NOVAMENTE gera outra e remonta a partida (key).
  const [seed, setSeed] = useState<number>(() => seedInicial ?? novaSeed())
  const oponente = buscarOponente(oponenteId)
  const baralhoOponente = BARALHOS_OPONENTES[oponenteId]
  const baralhoJogador = usuario?.baralho ?? BARALHO_INICIAL
  const atraso = useMemo(() => atrasoIA ?? atrasoPadrao(), [atrasoIA])

  const criado = useMemo(() => {
    if (!oponente || !baralhoOponente) return { ok: false as const, erros: ['Adversário não encontrado.'] }
    return criarDuelo({ baralhoJogador, baralhoOponente, seed })
  }, [oponente, baralhoOponente, baralhoJogador, seed])

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
  return <Partida key={seed} estadoInicial={criado.estado} oponente={oponente} atrasoIA={atraso} onVoltar={onVoltar} onNovamente={() => setSeed((s) => { const n = novaSeed(); return n === s ? s + 1 : n })} />
}
