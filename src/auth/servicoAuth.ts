// Contrato de autenticação. Ainda NÃO existe backend: a implementação padrão
// (servicoAuthNaoConfigurado) nunca autentica ninguém.

export interface Credenciais {
  email: string
  senha: string
}

export interface UsuarioAutenticado {
  id: string
  email: string
}

export type CodigoErroAuth = 'nao_configurado' | 'credenciais_invalidas' | 'indisponivel'

export type ResultadoAuth =
  | { ok: true; usuario: UsuarioAutenticado }
  | { ok: false; codigo: CodigoErroAuth; mensagem: string }

export interface ServicoAuth {
  entrar(credenciais: Credenciais): Promise<ResultadoAuth>
}

export const MENSAGEM_AUTH_NAO_CONFIGURADA =
  'Login com conta ainda não está disponível. Você pode jogar como convidado.'

export const servicoAuthNaoConfigurado: ServicoAuth = {
  entrar() {
    return Promise.resolve({
      ok: false,
      codigo: 'nao_configurado',
      mensagem: MENSAGEM_AUTH_NAO_CONFIGURADA,
    })
  },
}
