import { cabecalhosCors, erro, origensPermitidas, resposta } from './http'
import { cadastro, login, logout, me, putBaralho, saude } from './rotas'
import type { Contexto } from './rotas'
import type { Env } from './tipos'

export interface Opcoes {
  agora?: () => number
}

type Acao = (c: Contexto) => Response | Promise<Response>

const ROTAS: Record<string, Record<string, Acao>> = {
  '/api/saude': { GET: saude },
  '/api/cadastro': { POST: cadastro },
  '/api/login': { POST: login },
  '/api/logout': { POST: logout },
  '/api/me': { GET: me },
  '/api/baralho': { PUT: putBaralho },
}

export async function tratar(request: Request, env: Env, opcoes: Opcoes = {}): Promise<Response> {
  const permitidas = origensPermitidas(env.ORIGENS_PERMITIDAS)
  const origem = request.headers.get('Origin')
  const extra = cabecalhosCors(origem, permitidas)

  // Requisição de navegador vinda de origem não autorizada: recusada.
  if (origem && !permitidas.includes(origem)) return erro(403, 'origem_nao_permitida', 'Origem não permitida.')

  if (request.method === 'OPTIONS') return resposta(204, null, extra)

  try {
    const caminho = new URL(request.url).pathname.replace(/(.)\/+$/, '$1')
    const rota = Object.hasOwn(ROTAS, caminho) ? ROTAS[caminho] : undefined
    if (!rota) return erro(404, 'nao_encontrado', 'Recurso não encontrado.', extra)
    const acao = Object.hasOwn(rota, request.method) ? rota[request.method] : undefined
    if (!acao) return erro(405, 'metodo_nao_permitido', 'Método não permitido.', { ...extra, Allow: Object.keys(rota).join(', ') })
    const ip = request.headers.get('CF-Connecting-IP') ?? 'desconhecido'
    return await acao({ env, request, extra, agora: (opcoes.agora ?? Date.now)(), ip })
  } catch {
    // Nunca devolve nem registra detalhes internos (podem conter dados sensíveis).
    return erro(500, 'erro_interno', 'Erro interno. Tente novamente em instantes.', extra)
  }
}
