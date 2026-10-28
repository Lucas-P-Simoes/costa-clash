import { useEffect, useRef } from 'react'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { MolduraPedra } from '../../components/ui/MolduraPedra'
import { RodapeControles } from '../../components/ui/RodapeControles'
import { PainelCodigo } from './PainelCodigo'
import '../telaSimples.css'
import './recuperacao.css'

interface Props {
  /** Título da tela (h1): "Código de recuperação" no cadastro, "Senha alterada" na recuperação. */
  titulo: string
  /** Frase de abertura (o que aconteceu). */
  introducao: string
  email?: string
  codigo: string
  rotuloContinuar: string
  onContinuar: () => void
}

/**
 * Tela cheia que exibe o código de recuperação (após criar a conta e após trocar a senha).
 * Sem botão voltar nem Esc: o código não pode se perder por acidente.
 */
export function TelaCodigoRecuperacao({ titulo, introducao, email, codigo, rotuloContinuar, onContinuar }: Props) {
  const subtitulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    subtitulo.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div className="tela tela-jogo">
      <CabecalhoTela titulo={titulo} />
      <main className="tela-simples__corpo">
        <MolduraPedra as="section" className="tela-simples__painel recuperacao__painel" aria-labelledby="codigo-subtitulo">
          <MolduraPedra variante="interna" className="tela-simples__miolo recuperacao__miolo">
            <div className="recuperacao__topo">
              <h2 id="codigo-subtitulo" ref={subtitulo} tabIndex={-1} className="recuperacao__subtitulo">
                Guarde seu código de recuperação
              </h2>
              <p className="recuperacao__intro">{introducao}</p>
            </div>
            <PainelCodigo codigo={codigo} email={email} rotuloContinuar={rotuloContinuar} onContinuar={onContinuar} />
          </MolduraPedra>
        </MolduraPedra>
      </main>
      <RodapeControles />
    </div>
  )
}
