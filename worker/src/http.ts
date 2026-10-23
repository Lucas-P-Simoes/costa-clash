// Respostas JSON, cabeçalhos seguros, CORS e leitura limitada do corpo.

export const LIMITE_CORPO_BYTES = 8 * 1024

const CABECALHOS_SEGUROS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Resource-Policy': 'cross-origin',
}

export function origensPermitidas(valor: string | undefined): string[] {
  return (valor ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => o !== '')
}

/** Cabeçalhos CORS para uma origem permitida; vazio se não houver Origin. */
export function cabecalhosCors(origem: string | null, permitidas: string[]): Record<string, string> {
  if (!origem || !permitidas.includes(origem)) return {}
  return {
    'Access-Control-Allow-Origin': origem,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

export function resposta(status: number, corpo: unknown, extra: Record<string, string> = {}): Response {
  const cab: Record<string, string> = { ...CABECALHOS_SEGUROS, ...extra }
  if (corpo !== null) cab['Content-Type'] = 'application/json; charset=utf-8'
  return new Response(corpo === null ? null : JSON.stringify(corpo), { status, headers: cab })
}

export function erro(status: number, codigo: string, mensagem: string, extra: Record<string, string> = {}, campos?: Record<string, string>): Response {
  return resposta(status, { erro: { codigo, mensagem, ...(campos ? { campos } : {}) } }, extra)
}

export type CorpoLido = { ok: true; json: unknown } | { ok: false; resposta: Response }

/** Exige application/json, limita o tamanho (declarado e real) e faz o parse. */
export async function lerJson(request: Request, extra: Record<string, string>): Promise<CorpoLido> {
  const tipo = request.headers.get('Content-Type') ?? ''
  if (!/^application\/json\s*(;|$)/i.test(tipo)) {
    return { ok: false, resposta: erro(415, 'tipo_invalido', 'Envie o corpo como application/json.', extra) }
  }
  const declarado = Number(request.headers.get('Content-Length') ?? '0')
  if (declarado > LIMITE_CORPO_BYTES) {
    return { ok: false, resposta: erro(413, 'corpo_grande', 'Corpo da requisição grande demais.', extra) }
  }
  const partes: Uint8Array[] = []
  let total = 0
  if (request.body) {
    const leitor = request.body.getReader()
    for (;;) {
      const { done, value } = await leitor.read()
      if (done) break
      total += value.byteLength
      if (total > LIMITE_CORPO_BYTES) {
        await leitor.cancel()
        return { ok: false, resposta: erro(413, 'corpo_grande', 'Corpo da requisição grande demais.', extra) }
      }
      partes.push(value)
    }
  }
  const bytes = new Uint8Array(total)
  let pos = 0
  for (const p of partes) {
    bytes.set(p, pos)
    pos += p.byteLength
  }
  try {
    return { ok: true, json: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, resposta: erro(400, 'json_invalido', 'Corpo JSON inválido.', extra) }
  }
}
