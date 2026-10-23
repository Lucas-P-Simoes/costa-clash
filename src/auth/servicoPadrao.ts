import { criarServicoAuthHttp } from './servicoAuthHttp'
import { servicoAuthNaoConfigurado } from './servicoAuth'
import type { ServicoAuth } from './servicoAuth'

/** VITE_API_URL definida -> API real; ausente -> "não configurado" (nunca simula sucesso). */
export function escolherServico(apiUrl: string | undefined): ServicoAuth {
  const url = apiUrl?.trim()
  return url ? criarServicoAuthHttp(url) : servicoAuthNaoConfigurado
}

export const servicoAuthPadrao: ServicoAuth = escolherServico(import.meta.env.VITE_API_URL)
