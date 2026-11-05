import { useEffect, useMemo, useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/servicoAuth'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { GradeOponentes } from '../../components/ui/GradeOponentes'
import { IconeCartas, IconeEspadas, IconeVoltar } from '../../components/ui/Icones'
import { MenuEngrenagem } from '../../components/ui/MenuEngrenagem'
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
  /** Adversários liberados manualmente (engrenagem). */
  liberados?: readonly string[]
  /** Salva a nova lista de liberados manuais (engrenagem). Ausente: sem engrenagem. */
  onSalvarLiberados?: (ids: string[]) => void
}

type Aviso = { tipo: 'baralho'; n: number } | { tipo: 'bloqueado'; n: number; alvo: string; bloqueado: string } | null

/** Seleção de adversário do Duelo Livre; INICIAR DUELO abre a partida contra o adversário selecionado. */
export function TelaDueloLivre({ usuario, onVoltar, onSair, onDuelo, oponenteInicialId, derrotados, liberados, onSalvarLiberados }: Props) {
  const bloqueados = useMemo(() => (derrotados ? idsBloqueados(derrotados, liberados) : undefined), [derrotados, liberados])
  const [selecionadoId, setSelecionadoId] = useState(() => {
    if (oponenteInicialId && buscarOponente(oponenteInicialId) && !bloqueados?.has(oponenteInicialId)) return oponenteInicialId
    return derrotados ? proximoAdversarioId(derrotados) : OPONENTE_PADRAO_ID
  })
  const [aviso, setAviso] = useState<Aviso>(null)
  const [saindo, setSaindo] = useState(false)
  const [dropsAbertos, setDropsAbertos] = useState(false)
  const [historiaAberta, setHistoriaAberta] = useState(false)
  const [engrenagem, setEngrenagem] = useState(false)
  const fundoInerte = dropsAbertos || historiaAberta
  useAtalhoVoltar(onVoltar)
  const oponente = buscarOponente(selecionadoId) ?? OPONENTES[0]

  function selecionar(id: string) {
    if (id === selecionadoId || bloqueados?.has(id)) return
    setSelecionadoId(id)
    setAviso(null)
  }

  // O alerta vermelho dura poucos segundos (guarda o n do aviso); a mensagem fica até outra ação.
  const [alertaAtivo, setAlertaAtivo] = useState(0)
  useEffect(() => {
    if (!alertaAtivo) return
    const t = setTimeout(() => setAlertaAtivo(0), 3500)
    return () => clearTimeout(t)
  }, [alertaAtivo])

  function aoClicarBloqueado(id: string) {
    const alvo = proximoAdversarioId(derrotados ?? [])
    const n = (aviso?.n ?? 0) + 1
    setAviso({ tipo: 'bloqueado', n, alvo, bloqueado: id })
    setAlertaAtivo(n)
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
  if (aviso?.tipo === 'bloqueado') {
    mensagem = `${buscarOponente(aviso.bloqueado)?.nome ?? 'Este adversário'} está bloqueado. Enfrente ${buscarOponente(aviso.alvo)?.nome ?? 'o adversário anterior'} primeiro.`
  }
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
      {onSalvarLiberados ? (
        <MenuEngrenagem
          aberto={engrenagem}
          onAlternar={() => setEngrenagem((v) => !v)}
          inert={fundoInerte}
          oponentes={OPONENTES}
          bloqueados={bloqueados ?? new Set()}
          liberados={liberados ?? []}
          onSalvar={(ids) => {
            onSalvarLiberados(ids)
            setAviso(null)
            setEngrenagem(false)
          }}
        />
      ) : null}
      <CabecalhoTela titulo="Duelo Livre" variante="duelo-livre" inert={fundoInerte} />
      <main className="tela-duelo__corpo" inert={fundoInerte}>
        <section className="tela-duelo__grade moldura moldura--interna" aria-labelledby="titulo-escolha-oponente">
          <h2 id="titulo-escolha-oponente" className="tela-duelo__chamada">
            Escolha seu adversário
          </h2>
          <GradeOponentes oponentes={OPONENTES} selecionadoId={selecionadoId} onSelecionar={selecionar} bloqueados={bloqueados} onAbrir={(id) => !bloqueados?.has(id) && setHistoriaAberta(true)} onBloqueadoClick={aoClicarBloqueado} alertaId={aviso?.tipo === 'bloqueado' && alertaAtivo === aviso.n ? aviso.alvo : undefined} />
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
