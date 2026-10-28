import { useState } from 'react'
import type { ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { BotaoRetro } from '../../components/ui/BotaoRetro'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { IconeCadeado, IconeEspadas, IconeVoltar } from '../../components/ui/Icones'
import { MolduraPedra } from '../../components/ui/MolduraPedra'
import { RodapeControles } from '../../components/ui/RodapeControles'
import '../telaSimples.css'
import { DialogoNovoCodigo } from './DialogoNovoCodigo'

interface Props {
  usuario: UsuarioAutenticado
  /** Chama o logout do serviço e volta ao login. */
  onSair: () => Promise<void> | void
  /** Abre a seleção de adversário do Duelo Livre. */
  onDueloLivre?: () => void
  /** Serviço de conta (para gerar novo código de recuperação). Sem ele, o botão mostra o aviso de indisponível. */
  servicoAuth?: ServicoAuth
  /** O servidor recusou a sessão ao gerar o código: volta ao login com o aviso. */
  onSessaoExpirada?: (mensagem: string) => void
}

/** Tela provisória pós-login: dados da conta e SAIR. O restante do jogo ainda não existe. */
export function TelaConta({ usuario, onSair, onDueloLivre, servicoAuth, onSessaoExpirada }: Props) {
  const [saindo, setSaindo] = useState(false)
  const [dialogo, setDialogo] = useState(false)
  const [temCodigo, setTemCodigo] = useState(usuario.temCodigoRecuperacao)
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
    <div className="tela tela-jogo">
      <CabecalhoTela titulo="Conta" inert={dialogo} />
      <main className="tela-simples__corpo" inert={dialogo || undefined}>
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
              <div>
                <dt>Código de recuperação</dt>
                <dd className={temCodigo ? 'conta__codigo-ativo' : 'conta__codigo-ausente'}>{temCodigo ? 'ativo' : 'não configurado'}</dd>
              </div>
            </dl>
            {temCodigo === false ? (
              <p className="tela-simples__nota" role="note">
                Sua conta ainda não tem código de recuperação. Gere um e guarde-o: sem ele não dá para recuperar a senha.
              </p>
            ) : temCodigo ? (
              <p className="tela-simples__nota" role="note">
                Se você não guardou o código, gere um novo abaixo.
              </p>
            ) : null}
            <p>Esta é uma tela provisória. Os duelos, a montagem de baralho e as recompensas ainda não existem.</p>
            {onDueloLivre ? (
              <BotaoRetro variante="primario" icone={<IconeEspadas />} onClick={onDueloLivre}>
                Duelo livre
              </BotaoRetro>
            ) : null}
            <BotaoRetro className="conta__gerar" icone={<IconeCadeado />} onClick={() => setDialogo(true)}>
              {temCodigo ? 'Gerar novo código de recuperação' : 'Gerar código de recuperação'}
            </BotaoRetro>
            <BotaoRetro icone={<IconeVoltar />} ocupado={saindo} onClick={sair} autoFocus>
              {saindo ? 'Saindo…' : 'Sair'}
            </BotaoRetro>
          </MolduraPedra>
        </MolduraPedra>
      </main>
      <RodapeControles inert={dialogo} />
      {dialogo ? (
        <DialogoNovoCodigo
          servicoAuth={servicoAuth}
          onSessaoExpirada={onSessaoExpirada}
          email={usuario.email}
          onFechar={(gerou) => {
            if (gerou) setTemCodigo(true)
            setDialogo(false)
          }}
        />
      ) : null}
    </div>
  )
}
