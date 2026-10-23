import { useState } from 'react'
import type { UsuarioAutenticado } from '../../auth/servicoAuth'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { IconeVoltar } from '../../components/ui/Icones'
import { MolduraPedra } from '../../components/ui/MolduraPedra'
import { RodapeControles } from '../../components/ui/RodapeControles'
import '../telaSimples.css'

interface Props {
  usuario: UsuarioAutenticado
  /** Chama o logout do serviço e volta ao login. */
  onSair: () => Promise<void> | void
}

/** Tela provisória pós-login: dados da conta e SAIR. O restante do jogo ainda não existe. */
export function TelaConta({ usuario, onSair }: Props) {
  const [saindo, setSaindo] = useState(false)
  const totalColecao = usuario.colecao?.reduce((s, i) => s + i.quantidade, 0)
  const informado = (n: number | undefined) => (n === undefined ? 'não informado' : String(n))

  async function sair() {
    if (saindo) return
    setSaindo(true)
    try {
      await onSair()
    } finally {
      setSaindo(false)
    }
  }

  return (
    <div className="tela">
      <CabecalhoTela titulo="Conta" />
      <main className="tela-simples__corpo">
        <MolduraPedra as="section" className="tela-simples__painel" aria-label="Sua conta">
          <MolduraPedra variante="interna" className="tela-simples__miolo">
            <p className="tela-simples__destaque">Conectado como {usuario.email}</p>
            <dl className="conta__dados">
              <div>
                <dt>Cartas na coleção</dt>
                <dd>{informado(totalColecao)}</dd>
              </div>
              <div>
                <dt>Cartas no baralho atual</dt>
                <dd>{informado(usuario.baralho?.length)}</dd>
              </div>
            </dl>
            <p>Esta é uma tela provisória. Os duelos, a montagem de baralho e as recompensas ainda não existem.</p>
            <BotaoRetro icone={<IconeVoltar />} ocupado={saindo} onClick={sair} autoFocus>
              {saindo ? 'Saindo…' : 'Sair'}
            </BotaoRetro>
          </MolduraPedra>
        </MolduraPedra>
      </main>
      <RodapeControles />
    </div>
  )
}
