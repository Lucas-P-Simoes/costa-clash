import { useEffect, useState } from 'react'
import type { ResultadoAuth, ServicoAuth, UsuarioAutenticado } from './auth/servicoAuth'
import { MENSAGEM_RECONEXAO } from './auth/servicoAuth'
import { servicoAuthPadrao } from './auth/servicoPadrao'
import { CabecalhoTela } from './components/ui/CabecalhoTela'
import { TelaDueloLivre } from './screens/dueloLivre/TelaDueloLivre'
import { TelaDuelo } from './screens/duelo/TelaDuelo'
import { TelaCriarConta } from './screens/criarConta/TelaCriarConta'
import { TelaLogin } from './screens/login/TelaLogin'
import { RecuperarSenhaPlaceholder } from './screens/Placeholders'

type Tela =
  | { nome: 'restaurando' }
  | { nome: 'login' }
  | { nome: 'criarConta' }
  | { nome: 'recuperarSenha' }
  | { nome: 'dueloLivre'; usuario?: UsuarioAutenticado; oponenteId?: string }
  | { nome: 'duelo'; oponenteId: string; usuario?: UsuarioAutenticado }

// Navegação por estado simples (sem react-router). `servicoAuth` é injetável para testes;
// o padrão depende de VITE_API_URL (ausente -> "não configurado").
export default function App({ servicoAuth = servicoAuthPadrao }: { servicoAuth?: ServicoAuth }) {
  // Com token salvo, abre em "restaurando" para não piscar a tela de login.
  const [tela, setTela] = useState<Tela>(() => (servicoAuth.temSessaoSalva?.() ? { nome: 'restaurando' } : { nome: 'login' }))
  const [voltou, setVoltou] = useState(false)
  const [aviso, setAviso] = useState<string | undefined>()
  const irParaLogin = () => {
    setVoltou(true)
    setAviso(undefined)
    setTela({ nome: 'login' })
  }

  useEffect(() => {
    if (tela.nome !== 'restaurando') return
    let ativo = true
    const restaurar = servicoAuth.restaurarSessao
    const promessa = restaurar ? restaurar.call(servicoAuth) : Promise.resolve<ResultadoAuth>({ ok: false, codigo: 'nao_configurado', mensagem: '' })
    promessa
      .then((r) => {
        if (!ativo) return
        if (r.ok) setTela({ nome: 'dueloLivre', usuario: r.usuario })
        else {
          // Falha de rede (token mantido): avisa no login; sessão inválida volta sem aviso.
          if (r.codigo === 'indisponivel') setAviso(MENSAGEM_RECONEXAO)
          setTela({ nome: 'login' })
        }
      })
      .catch(() => {
        if (ativo) setTela({ nome: 'login' })
      })
    return () => {
      ativo = false
    }
  }, [tela.nome, servicoAuth])

  async function sair() {
    try {
      await servicoAuth.sair?.()
    } catch {
      /* o serviço já limpa o token local; seguimos para o login */
    }
    irParaLogin()
  }

  switch (tela.nome) {
    case 'restaurando':
      return (
        <div className="tela tela-jogo">
          <CabecalhoTela titulo="Costa Clash" />
          <main className="tela-simples__corpo">
            <p role="status">Carregando sua sessão…</p>
          </main>
        </div>
      )
    case 'criarConta':
      return (
        <TelaCriarConta
          servicoAuth={servicoAuth}
          onAutenticado={(usuario) => setTela({ nome: 'dueloLivre', usuario })}
          onVoltar={irParaLogin}
        />
      )
    case 'recuperarSenha':
      return <RecuperarSenhaPlaceholder onVoltar={irParaLogin} />
    case 'dueloLivre': {
      const usuario = tela.usuario
      return (
        <TelaDueloLivre
          usuario={usuario}
          oponenteInicialId={tela.oponenteId}
          onVoltar={usuario ? undefined : irParaLogin}
          onSair={usuario ? sair : undefined}
          onDuelo={(oponenteId) => setTela({ nome: 'duelo', oponenteId, usuario })}
        />
      )
    }
    case 'duelo': {
      const usuario = tela.usuario
      return <TelaDuelo oponenteId={tela.oponenteId} usuario={usuario} onVoltar={() => setTela({ nome: 'dueloLivre', usuario, oponenteId: tela.oponenteId })} />
    }
    default:
      return (
        <TelaLogin
          servicoAuth={servicoAuth}
          focarAoMontar={voltou}
          aviso={aviso}
          onAutenticado={(usuario) => setTela({ nome: 'dueloLivre', usuario })}
          onCriarConta={() => setTela({ nome: 'criarConta' })}
          onRecuperarSenha={() => setTela({ nome: 'recuperarSenha' })}
        />
      )
  }
}
