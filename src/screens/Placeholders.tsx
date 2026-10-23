import { TelaSimples } from './TelaSimples'

export function RecuperarSenhaPlaceholder({ onVoltar }: { onVoltar: () => void }) {
  return (
    <TelaSimples titulo="Recuperar senha" onVoltar={onVoltar}>
      <p className="tela-simples__destaque">Em breve</p>
      <p>A recuperação de senha ainda não está disponível: ela depende de um provedor de e-mail, que ainda não foi configurado.</p>
      <p className="tela-simples__nota">Você já pode jogar como convidado na tela de login.</p>
    </TelaSimples>
  )
}

export function ConvidadoInicio({ onVoltar }: { onVoltar: () => void }) {
  return (
    <TelaSimples titulo="Convidado" onVoltar={onVoltar}>
      <p className="tela-simples__destaque">Você está jogando como convidado</p>
      <p>Esta é uma tela inicial provisória. Os duelos serão liberados em uma próxima etapa.</p>
      <p className="tela-simples__nota">Sem conta: nenhum progresso é salvo.</p>
    </TelaSimples>
  )
}
