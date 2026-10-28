// Serviço de conta real: fala com a API (Cloudflare Worker) em `baseUrl`.
// O token fica em localStorage (try/catch: pode falhar em modo privado); a senha nunca é guardada.
import type { CodigoErroAuth, Credenciais, ItemColecao, ResultadoAuth, ResultadoBaralho, ResultadoCodigo, ResultadoDrop, ResultadoInicioDuelo, ServicoAuth, UsuarioAutenticado } from './servicoAuth'

export const CHAVE_TOKEN = 'costa-clash:sessao'
const MENSAGEM_REDE = 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.'
const MENSAGEM_SESSAO = 'Sua sessão expirou. Entre novamente.'
const TEMPO_LIMITE_MS = 8_000

type Armazenamento = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

interface Opcoes {
  fetch?: typeof fetch
  armazenamento?: Armazenamento | null
}

function armazenamentoPadrao(): Armazenamento | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const CODIGOS_POR_STATUS: Record<number, CodigoErroAuth> = {
  400: 'dados_invalidos',
  401: 'credenciais_invalidas',
  409: 'email_em_uso',
  413: 'dados_invalidos',
  415: 'dados_invalidos',
  429: 'muitas_tentativas',
}

function texto(v: unknown): v is string {
  return typeof v === 'string' && v !== ''
}

function lerColecao(v: unknown[]): ItemColecao[] {
  return v.filter((i): i is ItemColecao => {
    const o = (i ?? {}) as Record<string, unknown>
    return typeof o.cartaId === 'string' && Number.isInteger(o.quantidade)
  })
}

function lerUsuario(v: unknown): UsuarioAutenticado | null {
  const o = (v ?? {}) as Record<string, unknown>
  if (!texto(o.id) || !texto(o.email)) return null
  const u: UsuarioAutenticado = { id: o.id, email: o.email }
  if (typeof o.temCodigoRecuperacao === 'boolean') u.temCodigoRecuperacao = o.temCodigoRecuperacao
  if (Array.isArray(o.baralho)) u.baralho = o.baralho.filter((x): x is string => typeof x === 'string')
  if (Array.isArray(o.colecao)) u.colecao = lerColecao(o.colecao)
  return u
}

export function criarServicoAuthHttp(baseUrl: string, opcoes: Opcoes = {}): ServicoAuth {
  const base = baseUrl.replace(/\/+$/, '')
  const buscar = opcoes.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const mem = opcoes.armazenamento === undefined ? armazenamentoPadrao() : opcoes.armazenamento

  const lerToken = (): string | null => {
    try {
      return mem?.getItem(CHAVE_TOKEN) || null
    } catch {
      return null
    }
  }
  const guardarToken = (t: string) => {
    try {
      mem?.setItem(CHAVE_TOKEN, t)
    } catch {
      /* modo privado/sem espaço: a sessão vale só até recarregar */
    }
  }
  const apagarToken = () => {
    try {
      mem?.removeItem(CHAVE_TOKEN)
    } catch {
      /* ignora */
    }
  }

  async function chamar(caminho: string, init: { metodo: string; corpo?: unknown; token?: string | null }) {
    const headers: Record<string, string> = {}
    if (init.corpo !== undefined) headers['Content-Type'] = 'application/json'
    if (init.token) headers.Authorization = `Bearer ${init.token}`
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), TEMPO_LIMITE_MS)
    try {
      const r = await buscar(`${base}${caminho}`, {
        method: init.metodo,
        headers,
        body: init.corpo === undefined ? undefined : JSON.stringify(init.corpo),
        signal: ctl.signal,
        credentials: 'omit',
      })
      let json: Record<string, unknown> | null = null
      try {
        json = (await r.json()) as Record<string, unknown>
      } catch {
        json = null
      }
      return { status: r.status, ok: r.ok, json }
    } finally {
      clearTimeout(timer)
    }
  }

  function falha(status: number, json: Record<string, unknown> | null, padrao: string) {
    const e = (json?.erro ?? {}) as { mensagem?: unknown; campos?: { email?: unknown; senha?: unknown } }
    const campos = e.campos
      ? { email: texto(e.campos.email) ? e.campos.email : undefined, senha: texto(e.campos.senha) ? e.campos.senha : undefined }
      : undefined
    return {
      ok: false as const,
      codigo: CODIGOS_POR_STATUS[status] ?? ('indisponivel' as const),
      mensagem: texto(e.mensagem) ? e.mensagem : padrao,
      ...(campos ? { campos } : {}),
    }
  }

  function falhaCodigo(status: number, json: Record<string, unknown> | null, padrao: string): Extract<ResultadoCodigo, { ok: false }> {
    const f = falha(status, json, padrao)
    return { ok: false, codigo: status === 403 ? 'senha_incorreta' : f.codigo, mensagem: f.mensagem, ...(f.campos?.senha ? { campos: { senha: f.campos.senha } } : {}) }
  }

  async function autenticar(caminho: string, c: Credenciais, padrao: string): Promise<ResultadoAuth> {
    try {
      const { status, ok, json } = await chamar(caminho, { metodo: 'POST', corpo: { email: c.email, senha: c.senha } })
      const usuario = ok ? lerUsuario(json?.usuario) : null
      if (!ok || !usuario || !texto(json?.token)) return falha(ok ? 500 : status, json, padrao)
      guardarToken(json.token as string)
      return texto(json.codigoRecuperacao) ? { ok: true, usuario, codigoRecuperacao: json.codigoRecuperacao } : { ok: true, usuario }
    } catch {
      return { ok: false, codigo: 'indisponivel', mensagem: MENSAGEM_REDE }
    }
  }

  return {
    entrar: (c) => autenticar('/api/login', c, 'Não foi possível entrar agora. Tente novamente em instantes.'),
    cadastrar: (c) => autenticar('/api/cadastro', c, 'Não foi possível criar a conta agora. Tente novamente em instantes.'),

    temSessaoSalva: () => lerToken() !== null,

    async restaurarSessao() {
      const token = lerToken()
      if (!token) return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
      try {
        const { status, ok, json } = await chamar('/api/me', { metodo: 'GET', token })
        if (status === 401) {
          apagarToken()
          return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
        }
        const usuario = ok ? lerUsuario(json?.usuario) : null
        if (!usuario) return { ok: false, codigo: 'indisponivel', mensagem: MENSAGEM_REDE }
        return { ok: true, usuario }
      } catch {
        // Falha de rede: mantém o token para tentar de novo depois.
        return { ok: false, codigo: 'indisponivel', mensagem: MENSAGEM_REDE }
      }
    },

    async sair() {
      const token = lerToken()
      apagarToken()
      if (!token) return
      try {
        await chamar('/api/logout', { metodo: 'POST', token })
      } catch {
        /* o token local já foi removido; a sessão expira no servidor */
      }
    },

    async recuperarSenha(dados): Promise<ResultadoCodigo> {
      try {
        const { status, ok, json } = await chamar('/api/senha/recuperar', {
          metodo: 'POST',
          corpo: { email: dados.email, codigo: dados.codigo, novaSenha: dados.novaSenha },
        })
        if (!ok || !texto(json?.codigoRecuperacao)) return falhaCodigo(ok ? 500 : status, json, 'Não foi possível trocar a senha agora. Tente novamente em instantes.')
        return { ok: true, codigoRecuperacao: json.codigoRecuperacao as string }
      } catch {
        return { ok: false, codigo: 'indisponivel', mensagem: MENSAGEM_REDE }
      }
    },

    async gerarNovoCodigo({ senhaAtual }): Promise<ResultadoCodigo> {
      const token = lerToken()
      if (!token) return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
      try {
        const { status, ok, json } = await chamar('/api/conta/codigo-recuperacao', { metodo: 'POST', corpo: { senhaAtual }, token })
        if (status === 401) {
          apagarToken()
          return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
        }
        if (!ok || !texto(json?.codigoRecuperacao)) return falhaCodigo(ok ? 500 : status, json, 'Não foi possível gerar o código agora. Tente novamente em instantes.')
        return { ok: true, codigoRecuperacao: json.codigoRecuperacao as string }
      } catch {
        return { ok: false, codigo: 'indisponivel', mensagem: MENSAGEM_REDE }
      }
    },

    async iniciarDuelo(oponenteId): Promise<ResultadoInicioDuelo> {
      const token = lerToken()
      if (!token) return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
      try {
        const { status, ok, json } = await chamar('/api/duelo/iniciar', { metodo: 'POST', corpo: { oponenteId }, token })
        if (status === 401) {
          apagarToken()
          return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
        }
        if (!ok || !texto(json?.dueloId)) {
          const f = falha(ok ? 500 : status, json, 'Não foi possível registrar o duelo.')
          return { ok: false, codigo: f.codigo, mensagem: f.mensagem }
        }
        return { ok: true, dueloId: json.dueloId as string }
      } catch {
        return { ok: false, codigo: 'indisponivel', mensagem: MENSAGEM_REDE }
      }
    },

    async resgatarVitoria(dueloId): Promise<ResultadoDrop> {
      const token = lerToken()
      if (!token) return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
      try {
        const { status, ok, json } = await chamar('/api/duelo/vitoria', { metodo: 'POST', corpo: { dueloId }, token })
        if (status === 401) {
          apagarToken()
          return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
        }
        const carta = json?.carta
        if (!ok || !(carta === null || texto(carta)) || !Number.isInteger(json?.quantidade) || !Array.isArray(json?.colecao)) {
          const f = falha(ok ? 500 : status, json, 'Não foi possível entregar a recompensa.')
          return { ok: false, codigo: f.codigo, mensagem: f.mensagem }
        }
        return { ok: true, carta, quantidade: json.quantidade as number, colecao: lerColecao(json.colecao as unknown[]) }
      } catch {
        return { ok: false, codigo: 'indisponivel', mensagem: MENSAGEM_REDE }
      }
    },

    async salvarBaralho(cartas): Promise<ResultadoBaralho> {
      const token = lerToken()
      if (!token) return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
      try {
        const { status, ok, json } = await chamar('/api/baralho', { metodo: 'PUT', corpo: { cartas }, token })
        if (status === 401) {
          apagarToken()
          return { ok: false, codigo: 'sessao_invalida', mensagem: MENSAGEM_SESSAO }
        }
        if (!ok || !Array.isArray(json?.baralho)) {
          const f = falha(ok ? 500 : status, json, 'Não foi possível salvar o baralho.')
          return { ok: false, codigo: f.codigo, mensagem: f.mensagem }
        }
        return { ok: true, baralho: (json.baralho as unknown[]).filter((x): x is string => typeof x === 'string') }
      } catch {
        return { ok: false, codigo: 'indisponivel', mensagem: MENSAGEM_REDE }
      }
    },
  }
}
