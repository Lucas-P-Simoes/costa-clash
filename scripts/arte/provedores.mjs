// Provedores de geração de imagem (interface extensível). NENHUM é chamado sem `--executar`.
// Interface de um provedor:
//   { id, descricao, variaveis: string[] (env obrigatórias), custoPorImagem(env): number | null,
//     async gerar({ prompt, seed, env, fetch }): Promise<{ bytes: Uint8Array, modelo: string }> }
// Chaves vêm SEMPRE de variáveis de ambiente; nunca do repositório.

/** OpenAI Images API. Tamanhos nativos não incluem 3:4 (1024x1536 é 2:3): sem etapa de recorte, a validação 3:4 recusará o resultado. */
export const openai = {
  id: 'openai',
  descricao: 'OpenAI Images (gpt-image). Requer OPENAI_API_KEY. Modelo em ARTE_MODELO (padrão gpt-image-1), tamanho em ARTE_TAMANHO (padrão 1024x1536; NÃO é 3:4).',
  variaveis: ['OPENAI_API_KEY'],
  custoPorImagem(env) {
    const v = Number(env.ARTE_CUSTO_UNITARIO_USD)
    return Number.isFinite(v) && v > 0 ? v : null
  },
  async gerar({ prompt, env, fetch: f = fetch }) {
    const modelo = env.ARTE_MODELO || 'gpt-image-1'
    const resp = await f('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: modelo, prompt, n: 1, size: env.ARTE_TAMANHO || '1024x1536' }),
    })
    if (!resp.ok) throw new Error(`OpenAI respondeu HTTP ${resp.status}`)
    const json = await resp.json()
    const b64 = json?.data?.[0]?.b64_json
    if (!b64) throw new Error('Resposta da OpenAI sem b64_json')
    return { bytes: new Uint8Array(Buffer.from(b64, 'base64')), modelo }
  },
}

export const PROVEDORES = { openai }

export function obterProvedor(nome, registro = PROVEDORES) {
  if (!nome) throw new Error('Defina ARTE_PROVEDOR (provedores disponíveis: ' + Object.keys(registro).join(', ') + ').')
  const p = registro[nome]
  if (!p) throw new Error(`Provedor desconhecido: ${nome}. Disponíveis: ${Object.keys(registro).join(', ')}.`)
  return p
}

export function variaveisAusentes(provedor, env) {
  return provedor.variaveis.filter((v) => !env[v])
}
