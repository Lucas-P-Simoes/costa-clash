import { useMemo, useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/servicoAuth'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { GradeOponentes } from '../../components/ui/GradeOponentes'
import { IconeCartas, IconeEspadas, IconeVoltar } from '../../components/ui/Icones'
import { DialogoHistoriaOponente } from '../../components/ui/DialogoHistoriaOponente'
import { DialogoDropsOponente } from '../../components/ui/DialogoDropsOponente'
import { PainelOponente } from '../../components/ui/PainelOponente'
import { RodapeControles } from '../../components/ui/RodapeControles'
import { useAtalhoVoltar } from '../../components/ui/useAtalhoVoltar'
import { OPONENTES, OPONENTE_PADRAO_ID, buscarOponente } from '../../data/oponentes'
import { idsBloqueados, proximoAdversarioId } from '../../data/progressoOponentes'
import './dueloLivre.css'

interface Props {
  /** Usuário logado (resumo do baralho vem do perfil já carregado); ausente: sem resumo de baralho. */
  usuario?: UsuarioAutenticado
  /** Caminho de retorno em usos independentes/sem sessão. Ausente na tela inicial autenticada. */
  onVoltar?: () => void
  /** Encerra a sessão do usuário autenticado. Não é acionado por Esc. */
  onSair?: () => Promise<void> | void
  /** Inicia o duelo contra o adversário selecionado. */
  onDuelo: (oponenteId: string) => void
  /** Adversário pré-selecionado (ao voltar do duelo). */
  oponenteInicialId?: string
  /** Ids de adversários já derrotados; define quem está bloqueado. Ausente: sem bloqueio (usos independentes). */
  derrotados?: readonly string[]
}

type Aviso = { tipo: 'baralho'; n: number } | null

/** Seleção de adversário do Duelo Livre; INICIAR DUELO abre a partida contra o adversário selecionado. */
export function TelaDueloLivre({ usuario, onVoltar, onSair, onDuelo, oponenteInicialId, derrotados }: Props) {
  const bloqueados = useMemo(() => (derrotados ? idsBloqueados(derrotados) : undefined), [derrotados])
  const [selecionadoId, setSelecionadoId] = useState(() => {
    if (oponenteInicialId && buscarOponente(oponenteInicialId) && !bloqueados?.has(oponenteInicialId)) return oponenteInicialId
    return derrotados ? proximoAdversarioId(derrotados) : OPONENTE_PADRAO_ID
  })
  const [aviso, setAviso] = useState<Aviso>(null)
  const [saindo, setSaindo] = useState(false)
  const [dropsAbertos, setDropsAbertos] = useState(false)
  const [historiaAberta, setHistoriaAberta] = useState(false)
  const fundoInerte = dropsAbertos || historiaAberta
  useAtalhoVoltar(onVoltar)
  const oponente = buscarOponente(selecionadoId) ?? OPONENTES[0]

  function selecionar(id: string) {
    if (id === selecionadoId || bloqueados?.has(id)) return
    setSelecionadoId(id)
    setAviso(null)
  }

  async function sair() {
    if (!onSair || saindo) return
    setSaindo(true)
    try {
      await onSair()
    } finally {
      setSaindo(false)
    }
  }

  let mensagem: string | undefined
  if (aviso?.tipo === 'baralho') {
    const qtd = usuario?.baralho?.length
    mensagem = !usuario
      ? 'Em breve — baralhos ficarão disponíveis para quem entrar com uma conta.'
      : qtd === undefined
        ? 'Em breve — a montagem de baralho ainda está em desenvolvimento.'
        : `Seu baralho atual tem ${qtd} cartas. A montagem de baralho ainda está em desenvolvimento.`
  }

  return (
    <div className="tela tela-jogo tela-duelo">
      <CabecalhoTela titulo="Duelo Livre" variante="duelo-livre" inert={fundoInerte} />
      <main className="tela-duelo__corpo" inert={fundoInerte}>
        <section className="tela-duelo__grade moldura moldura--interna" aria-labelledby="titulo-escolha-oponente">
          <h2 id="titulo-escolha-oponente" className="tela-duelo__chamada">
            Escolha seu adversário
          </h2>
          <GradeOponentes oponentes={OPONENTES} selecionadoId={selecionadoId} onSelecionar={selecionar} bloqueados={bloqueados} onAbrir={(id) => !bloqueados?.has(id) && setHistoriaAberta(true)} />
        </section>
        {/* A chave força nova leitura quando o mesmo aviso é pedido de novo. */}
        <PainelOponente oponente={oponente} aviso={mensagem ? <span key={aviso?.n}>{mensagem}</span> : undefined} onVerDrops={() => setDropsAbertos(true)}>
          <BotaoRetro variante="primario" icone={<IconeEspadas />} onClick={() => onDuelo(oponente.id)}>
            Iniciar duelo
          </BotaoRetro>
          <BotaoRetro icone={<IconeCartas />} onClick={() => setAviso((a) => ({ tipo: 'baralho', n: (a?.n ?? 0) + 1 }))}>
            Baralho
          </BotaoRetro>
          {onSair ? (
            <BotaoRetro icone={<IconeVoltar />} ocupado={saindo} onClick={sair}>
              {saindo ? 'Saindo…' : 'Sair'}
            </BotaoRetro>
          ) : onVoltar ? (
            <BotaoRetro icone={<IconeVoltar />} onClick={onVoltar}>
              Voltar
            </BotaoRetro>
          ) : null}
        </PainelOponente>
      </main>
      <RodapeControles inert={fundoInerte} />
      {historiaAberta ? <DialogoHistoriaOponente oponente={oponente} onDuelar={() => onDuelo(oponente.id)} onFechar={() => setHistoriaAberta(false)} /> : null}
      {dropsAbertos ? <DialogoDropsOponente oponente={oponente} colecao={usuario?.colecao} onFechar={() => setDropsAbertos(false)} /> : null}
    </div>
  )
}
