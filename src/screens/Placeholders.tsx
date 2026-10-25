import { TelaSimples } from './TelaSimples'

export function RecuperarSenhaPlaceholder({ onVoltar }: { onVoltar: () => void }) {
  return (
    <TelaSimples titulo="Recuperar senha" onVoltar={onVoltar}>
      <p className="tela-simples__destaque">Em breve</p>
      <p>A recuperação de senha ainda não está disponível: ela depende de um provedor de e-mail, que ainda não foi configurado.</p>
    </TelaSimples>
  )
}
