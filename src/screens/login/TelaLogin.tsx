import cenaMangue from '../../assets/login/cena-mangue.png'
import { CabecalhoTela } from '../../components/ui/CabecalhoTela'
import { RodapeControles } from '../../components/ui/RodapeControles'
import type { ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { PainelFormulario } from './PainelFormulario'
import { PainelInformativo } from './PainelInformativo'
import './login.css'

interface Props {
  servicoAuth?: ServicoAuth
  focarAoMontar?: boolean
  aviso?: string
  onAutenticado: (usuario: UsuarioAutenticado) => void
  onCriarConta: () => void
  onRecuperarSenha: () => void
  onConvidado: () => void
}

export function TelaLogin({ servicoAuth, focarAoMontar, aviso, onAutenticado, onCriarConta, onRecuperarSenha, onConvidado }: Props) {
  return (
    <div className="tela tela-login">
      <CabecalhoTela titulo="Login" />
      <main className="tela-login__corpo">
        <div className="tela-login__cena-caixa" aria-hidden="true">
          <img className="tela-login__cena" src={cenaMangue} alt="" />
        </div>
        <PainelFormulario
          servicoAuth={servicoAuth}
          focarAoMontar={focarAoMontar}
          aviso={aviso}
          onAutenticado={onAutenticado}
          onCriarConta={onCriarConta}
          onRecuperarSenha={onRecuperarSenha}
          onConvidado={onConvidado}
        />
        <PainelInformativo />
      </main>
      <RodapeControles />
    </div>
  )
}
