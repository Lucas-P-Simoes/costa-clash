import { useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/servicoAuth'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { GradeOponentes } from '../../components/ui/GradeOponentes'
import { IconeCartas, IconeEspadas, IconeVoltar } from '../../components/ui/Icones'
import { PainelOponente } from '../../components/ui/PainelOponente'
import { RodapeControles } from '../../components/ui/RodapeControles'
import { useAtalhoVoltar } from '../../components/ui/useAtalhoVoltar'
import { OPONENTES, OPONENTE_PADRAO_ID, buscarOponente } from '../../data/oponentes'
import './dueloLivre.css'

interface Props {
  /** Usuário logado (resumo do baralho vem do perfil já carregado); ausente = convidado. */
  usuario?: UsuarioAutenticado
  onVoltar: () => void
}

type Aviso = { tipo: 'duelo' | 'baralho'; n: number } | null

/** Seleção de adversário do Duelo Livre. O duelo ainda não existe: DUELO só mostra um aviso honesto. */
export function TelaDueloLivre({ usuario, onVoltar }: Props) {
  const [selecionadoId, setSelecionadoId] = useState(OPONENTE_PADRAO_ID)
  const [aviso, setAviso] = useState<Aviso>(null)
  useAtalhoVoltar(onVoltar)
  const oponente = buscarOponente(selecionadoId) ?? OPONENTES[0]

  function selecionar(id: string) {
    if (id === selecionadoId) return
    setSelecionadoId(id)
    setAviso(null)
  }

  let mensagem: string | undefined
  if (aviso?.tipo === 'duelo') mensagem = `Em breve — o duelo contra ${oponente.nome} ainda está em desenvolvimento.`
  else if (aviso?.tipo === 'baralho') {
    const qtd = usuario?.baralho?.length
    mensagem = !usuario
      ? 'Em breve — baralhos ficarão disponíveis para quem entrar com uma conta.'
      : qtd === undefined
        ? 'Em breve — a montagem de baralho ainda está em desenvolvimento.'
        : `Seu baralho atual tem ${qtd} cartas. A montagem de baralho ainda está em desenvolvimento.`
  }

  return (
    <div className="tela tela-duelo">
      <CabecalhoTela titulo="Duelo Livre" />
      <main className="tela-duelo__corpo">
        <div className="tela-duelo__grade">
          <GradeOponentes oponentes={OPONENTES} selecionadoId={selecionadoId} onSelecionar={selecionar} />
        </div>
        {/* A chave força nova leitura quando o mesmo aviso é pedido de novo. */}
        <PainelOponente oponente={oponente} aviso={mensagem ? <span key={aviso?.n}>{mensagem}</span> : undefined}>
          <BotaoRetro variante="primario" icone={<IconeEspadas />} onClick={() => setAviso((a) => ({ tipo: 'duelo', n: (a?.n ?? 0) + 1 }))}>
            Duelo
          </BotaoRetro>
          <BotaoRetro icone={<IconeCartas />} onClick={() => setAviso((a) => ({ tipo: 'baralho', n: (a?.n ?? 0) + 1 }))}>
            Baralho
          </BotaoRetro>
          <BotaoRetro icone={<IconeVoltar />} onClick={onVoltar}>
            Voltar
          </BotaoRetro>
        </PainelOponente>
      </main>
      <RodapeControles />
    </div>
  )
}
