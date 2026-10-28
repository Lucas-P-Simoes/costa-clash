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
  /** A conta tem código de recuperação ativo? (informado pelo servidor; nunca o código em si) */
  temCodigoRecuperacao?: boolean
}

export type CodigoErroAuth =
  | 'nao_configurado'
  | 'credenciais_invalidas'
  | 'email_em_uso'
  | 'dados_invalidos'
  | 'muitas_tentativas'
  | 'sessao_invalida'
  | 'senha_incorreta'
  | 'indisponivel'

export type ResultadoAuth =
  /** `codigoRecuperacao` só vem no cadastro e deve ser mostrado UMA vez (nunca guardado). */
  | { ok: true; usuario: UsuarioAutenticado; codigoRecuperacao?: string }
  | { ok: false; codigo: CodigoErroAuth; mensagem: string; campos?: { email?: string; senha?: string } }

/** Resultado de recuperarSenha / gerarNovoCodigo: o NOVO código, exibido uma única vez. */
export type ResultadoCodigo =
  | { ok: true; codigoRecuperacao: string }
  | { ok: false; codigo: CodigoErroAuth; mensagem: string; campos?: { senha?: string } }

export interface DadosRecuperacao {
  email: string
  /** Como o usuário digitou (o servidor normaliza maiúsculas, hífens e espaços). */
  codigo: string
  novaSenha: string
}

export type ResultadoBaralho = { ok: true; baralho: string[] } | { ok: false; codigo: CodigoErroAuth; mensagem: string }

export type ResultadoInicioDuelo = { ok: true; dueloId: string } | { ok: false; codigo: CodigoErroAuth; mensagem: string }

/** Drop de uma vitória: `carta` null = nenhuma carta disponível (todas as do adversário já no teto da coleção). */
export type ResultadoDrop =
  | { ok: true; carta: string | null; quantidade: number; colecao: ItemColecao[] }
  | { ok: false; codigo: CodigoErroAuth; mensagem: string }

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
  /** Troca a senha com o código de recuperação (não autentica). Devolve o NOVO código. */
  recuperarSenha?(dados: DadosRecuperacao): Promise<ResultadoCodigo>
  /** Logado: gera outro código de recuperação (exige a senha atual) e invalida o anterior. */
  gerarNovoCodigo?(dados: { senhaAtual: string }): Promise<ResultadoCodigo>
  /** Logado: registra no servidor o início de um duelo contra `oponenteId` (necessário para o drop da vitória). */
  iniciarDuelo?(oponenteId: string): Promise<ResultadoInicioDuelo>
  /** Logado: resgata a vitória do duelo iniciado; o servidor sorteia a carta e devolve a coleção atualizada. */
  resgatarVitoria?(dueloId: string): Promise<ResultadoDrop>
}

export const MENSAGEM_AUTH_NAO_CONFIGURADA =
  'Login com conta ainda não está disponível.'
export const MENSAGEM_RECONEXAO = 'Não foi possível reconectar à sua conta; tente novamente.'
export const MENSAGEM_CADASTRO_NAO_CONFIGURADO =
  'Criar conta ainda não está disponível.'
export const MENSAGEM_RECUPERACAO_NAO_CONFIGURADA = 'A recuperação de senha ainda não está disponível.'

const naoConfigurado = (mensagem: string) =>
  Promise.resolve({ ok: false as const, codigo: 'nao_configurado' as const, mensagem })

export const servicoAuthNaoConfigurado: ServicoAuth = {
  entrar: () => naoConfigurado(MENSAGEM_AUTH_NAO_CONFIGURADA),
  cadastrar: () => naoConfigurado(MENSAGEM_CADASTRO_NAO_CONFIGURADO),
  sair: () => Promise.resolve(),
  temSessaoSalva: () => false,
  restaurarSessao: () => naoConfigurado(MENSAGEM_AUTH_NAO_CONFIGURADA),
  salvarBaralho: () => naoConfigurado(MENSAGEM_AUTH_NAO_CONFIGURADA),
  recuperarSenha: () => naoConfigurado(MENSAGEM_RECUPERACAO_NAO_CONFIGURADA),
  gerarNovoCodigo: () => naoConfigurado(MENSAGEM_RECUPERACAO_NAO_CONFIGURADA),
}
