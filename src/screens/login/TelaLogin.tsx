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
}

export function TelaLogin({ servicoAuth, focarAoMontar, aviso, onAutenticado, onCriarConta, onRecuperarSenha }: Props) {
  return (
    <div className="tela tela-jogo tela-login">
      <CabecalhoTela />
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
        />
        <PainelInformativo />
      </main>
      <RodapeControles />
    </div>
  )
}
