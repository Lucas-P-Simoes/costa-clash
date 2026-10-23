import { TelaSimples } from './TelaSimples'

export function CriarContaPlaceholder({ onVoltar }: { onVoltar: () => void }) {
  return (
    <TelaSimples titulo="Criar conta" onVoltar={onVoltar}>
      <p className="tela-simples__destaque">Em breve</p>
      <p>O cadastro de contas ainda não está disponível. Nenhum dado é coletado ou guardado por enquanto.</p>
      <p className="tela-simples__nota">Você já pode jogar como convidado na tela de login.</p>
    </TelaSimples>
  )
}

export function RecuperarSenhaPlaceholder({ onVoltar }: { onVoltar: () => void }) {
  return (
    <TelaSimples titulo="Recuperar senha" onVoltar={onVoltar}>
      <p className="tela-simples__destaque">Em breve</p>
      <p>A recuperação de senha ainda não está disponível, pois as contas ainda não existem.</p>
      <p className="tela-simples__nota">Você já pode jogar como convidado na tela de login.</p>
    </TelaSimples>
  )
}

export function ConvidadoInicio({ onVoltar, email }: { onVoltar: () => void; email?: string }) {
  return (
    <TelaSimples titulo={email ? 'Início' : 'Convidado'} onVoltar={onVoltar}>
      <p className="tela-simples__destaque">{email ? `Conectado como ${email}` : 'Você está jogando como convidado'}</p>
      <p>Esta é uma tela inicial provisória. Os duelos serão liberados em uma próxima etapa.</p>
      <p className="tela-simples__nota">
        {email ? 'Nada foi salvo neste dispositivo.' : 'Sem conta: nenhum progresso é salvo.'}
      </p>
    </TelaSimples>
  )
}
