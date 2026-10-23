import { useState } from 'react'
import type { ServicoAuth } from './auth/servicoAuth'
import { TelaLogin } from './screens/login/TelaLogin'
import { ConvidadoInicio, CriarContaPlaceholder, RecuperarSenhaPlaceholder } from './screens/Placeholders'

type Tela = { nome: 'login' } | { nome: 'criarConta' } | { nome: 'recuperarSenha' } | { nome: 'convidado' } | { nome: 'inicioConta'; email: string }

// Navegação por estado simples (sem react-router). `servicoAuth` é injetável para testes.
export default function App({ servicoAuth }: { servicoAuth?: ServicoAuth }) {
  const [tela, setTela] = useState<Tela>({ nome: 'login' })
  const [voltou, setVoltou] = useState(false)
  const irParaLogin = () => {
    setVoltou(true)
    setTela({ nome: 'login' })
  }

  switch (tela.nome) {
    case 'criarConta':
      return <CriarContaPlaceholder onVoltar={irParaLogin} />
    case 'recuperarSenha':
      return <RecuperarSenhaPlaceholder onVoltar={irParaLogin} />
    case 'convidado':
      return <ConvidadoInicio onVoltar={irParaLogin} />
    case 'inicioConta':
      return <ConvidadoInicio onVoltar={irParaLogin} email={tela.email} />
    default:
      return (
        <TelaLogin
          servicoAuth={servicoAuth}
          focarAoMontar={voltou}
          onAutenticado={(u) => setTela({ nome: 'inicioConta', email: u.email })}
          onCriarConta={() => setTela({ nome: 'criarConta' })}
          onRecuperarSenha={() => setTela({ nome: 'recuperarSenha' })}
          onConvidado={() => setTela({ nome: 'convidado' })}
        />
      )
  }
}
