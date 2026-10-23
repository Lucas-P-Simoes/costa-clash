import type { ReactNode } from 'react'
import { BotaoRetro } from '../components/ui/BotaoRetro'
import { CabecalhoTela } from '../components/ui/CabecalhoTela'
import { IconeVoltar } from '../components/ui/Icones'
import { MolduraPedra } from '../components/ui/MolduraPedra'
import { RodapeControles } from '../components/ui/RodapeControles'
import { useAtalhoVoltar } from '../components/ui/useAtalhoVoltar'
import './telaSimples.css'

interface Props {
  titulo: string
  children: ReactNode
  rotuloVoltar?: string
  onVoltar: () => void
}

/** Layout das telas provisórias: cabeçalho, mensagem honesta e botão voltar (Esc também volta). */
export function TelaSimples({ titulo, children, rotuloVoltar = 'Voltar ao login', onVoltar }: Props) {
  useAtalhoVoltar(onVoltar)
  return (
    <div className="tela">
      <CabecalhoTela titulo={titulo} />
      <main className="tela-simples__corpo">
        <MolduraPedra as="section" className="tela-simples__painel">
          <MolduraPedra variante="interna" className="tela-simples__miolo">
            {children}
            <BotaoRetro icone={<IconeVoltar />} onClick={onVoltar} autoFocus>
              {rotuloVoltar}
            </BotaoRetro>
          </MolduraPedra>
        </MolduraPedra>
      </main>
      <RodapeControles />
    </div>
  )
}
