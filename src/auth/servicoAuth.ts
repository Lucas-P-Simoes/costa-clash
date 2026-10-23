// Contrato de autenticação/conta. Sem VITE_API_URL a implementação padrão é
// servicoAuthNaoConfigurado, que nunca autentica nem simula sucesso.

export interface Credenciais {
  email: string
  senha: string
}

export interface ItemColecao {
  cartaId: string
  quantidade: number
}

export interface UsuarioAutenticado {
  id: string
  email: string
  /** IDs das 40 cartas do baralho atual (quando o serviço informa). */
  baralho?: string[]
  /** Coleção do usuário: cartas com quantidade (autoridade: servidor). */
  colecao?: ItemColecao[]
}

export type CodigoErroAuth =
  | 'nao_configurado'
  | 'credenciais_invalidas'
  | 'email_em_uso'
  | 'dados_invalidos'
  | 'muitas_tentativas'
  | 'sessao_invalida'
  | 'indisponivel'

export type ResultadoAuth =
  | { ok: true; usuario: UsuarioAutenticado }
  | { ok: false; codigo: CodigoErroAuth; mensagem: string; campos?: { email?: string; senha?: string } }

export type ResultadoBaralho = { ok: true; baralho: string[] } | { ok: false; codigo: CodigoErroAuth; mensagem: string }

/**
 * Apenas `entrar` é obrigatório (compatível com serviços injetados em testes);
 * os demais são opcionais e a UI trata a ausência como "não configurado".
 */
export interface ServicoAuth {
  entrar(credenciais: Credenciais): Promise<ResultadoAuth>
  cadastrar?(credenciais: Credenciais): Promise<ResultadoAuth>
  /** Encerra a sessão. Sempre limpa o token local, mesmo se a rede falhar. */
  sair?(): Promise<void>
  /** Há token salvo neste navegador? (síncrono, para não piscar o login ao abrir). */
  temSessaoSalva?(): boolean
  /** Restaura a sessão salva chamando GET /me; remove o token se for inválido (401). */
  restaurarSessao?(): Promise<ResultadoAuth>
  salvarBaralho?(cartas: string[]): Promise<ResultadoBaralho>
}

export const MENSAGEM_AUTH_NAO_CONFIGURADA =
  'Login com conta ainda não está disponível. Você pode jogar como convidado.'
export const MENSAGEM_RECONEXAO = 'Não foi possível reconectar à sua conta; tente novamente.'
export const MENSAGEM_CADASTRO_NAO_CONFIGURADO =
  'Criar conta ainda não está disponível. Você pode jogar como convidado.'

const naoConfigurado = (mensagem: string) =>
  Promise.resolve({ ok: false as const, codigo: 'nao_configurado' as const, mensagem })

export const servicoAuthNaoConfigurado: ServicoAuth = {
  entrar: () => naoConfigurado(MENSAGEM_AUTH_NAO_CONFIGURADA),
  cadastrar: () => naoConfigurado(MENSAGEM_CADASTRO_NAO_CONFIGURADO),
  sair: () => Promise.resolve(),
  temSessaoSalva: () => false,
  restaurarSessao: () => naoConfigurado(MENSAGEM_AUTH_NAO_CONFIGURADA),
  salvarBaralho: () => naoConfigurado(MENSAGEM_AUTH_NAO_CONFIGURADA),
}
