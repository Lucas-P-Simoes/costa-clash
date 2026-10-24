// Manifesto das ilustrações das cartas (lógica pura; a leitura de arquivos fica em scripts/arte/*.mjs).
// Importa só com extensão .ts para poder ser carregado direto pelo Node.

/** pendente: sem arte. provisoria: recorte/rascunho só para avaliar o estilo (nunca final).
 *  gerada: arquivo existe, aguarda aprovação. aprovada: aprovada pelo dono (nunca substituir sem autorização).
 *  rejeitada: reprovada pelo dono. */
export type EstadoArte = 'pendente' | 'provisoria' | 'gerada' | 'aprovada' | 'rejeitada'

export const ESTADOS_ARTE: readonly EstadoArte[] = ['pendente', 'provisoria', 'gerada', 'aprovada', 'rejeitada']

/** Estados em que o jogo mostra a ilustração (se o arquivo existir). */
export const ESTADOS_EXIBIVEIS: readonly EstadoArte[] = ['provisoria', 'gerada', 'aprovada']

export interface VerificacaoArquivo {
  largura: number | null
  altura: number | null
  bytes: number | null
  sha256: string | null
}

export interface EntradaManifesto {
  id: string
  nome: string
  /** Nome de arquivo estável baseado no número do ID (001.webp; 001.png se for PNG). */
  arquivo: string
  estado: EstadoArte
  /** Prompt completo em português (canônico). */
  prompt: string
  promptHash: string
  /** Hash do prompt usado quando a arte foi gerada pelo script (null se desconhecido ou pendente). */
  promptHashGerado: string | null
  /** De onde veio a arte quando não foi gerada pelo script (ex.: recorte da referência). */
  origem: string | null
  observacao: string | null
  verificacao: VerificacaoArquivo
}

export interface Manifesto {
  versao: 1
  descricao: string
  estados: readonly EstadoArte[]
  entradas: EntradaManifesto[]
}

export interface InfoArquivo {
  arquivo: string
  largura: number | null
  altura: number | null
  bytes: number
  sha256: string
}

export interface CartaParaManifesto {
  id: string
  nome: string
  prompt: string
  promptHash: string
}

export const DESCRICAO_MANIFESTO =
  'Manifesto das ilustrações das cartas. Gerado e sincronizado por `npm run arte:manifesto`; não editar à mão exceto observacao. Regra: arte aprovada nunca é substituída sem autorização do dono. Ver docs/ARTE_DAS_CARTAS.md.'

const VAZIA: VerificacaoArquivo = { largura: null, altura: null, bytes: null, sha256: null }

export function nomeDeArquivo(id: string, extensao: 'webp' | 'png' = 'webp'): string {
  const m = /^CC-(\d{3})$/.exec(id)
  if (!m) throw new Error(`ID de carta inválido: ${id}`)
  return `${m[1]}.${extensao}`
}

function verificacaoDe(i: InfoArquivo): VerificacaoArquivo {
  return { largura: i.largura, altura: i.altura, bytes: i.bytes, sha256: i.sha256 }
}

export interface ResultadoSincronia {
  manifesto: Manifesto
  alertas: string[]
}

/**
 * Sincroniza o manifesto com o catálogo e com os arquivos encontrados (por ID).
 * Preserva estados, origem, observação e hashes existentes. Arte aprovada/rejeitada nunca é reescrita.
 */
export function sincronizarManifesto(entrada: {
  existente?: Manifesto | null
  cartas: readonly CartaParaManifesto[]
  arquivos: Readonly<Record<string, InfoArquivo | undefined>>
}): ResultadoSincronia {
  const alertas: string[] = []
  const porId = new Map((entrada.existente?.entradas ?? []).map((e) => [e.id, e]))
  const entradas = entrada.cartas.map<EntradaManifesto>((c) => {
    const antiga = porId.get(c.id)
    const arq = entrada.arquivos[c.id]
    const base: EntradaManifesto = {
      id: c.id,
      nome: c.nome,
      arquivo: arq?.arquivo ?? antiga?.arquivo ?? nomeDeArquivo(c.id),
      estado: antiga?.estado ?? 'pendente',
      prompt: c.prompt,
      promptHash: c.promptHash,
      promptHashGerado: antiga?.promptHashGerado ?? null,
      origem: antiga?.origem ?? null,
      observacao: antiga?.observacao ?? null,
      verificacao: antiga?.verificacao ?? VAZIA,
    }
    switch (base.estado) {
      case 'pendente':
        if (arq) {
          alertas.push(`${c.id}: arquivo ${arq.arquivo} encontrado; marcado como gerada (aguarda aprovação do dono).`)
          return { ...base, estado: 'gerada', verificacao: verificacaoDe(arq) }
        }
        return { ...base, arquivo: nomeDeArquivo(c.id), verificacao: VAZIA }
      case 'provisoria':
      case 'gerada':
        if (arq) return { ...base, verificacao: verificacaoDe(arq) }
        alertas.push(`${c.id}: arquivo ${base.arquivo} ausente; estado ${base.estado} voltou para pendente.`)
        return { ...base, estado: 'pendente', arquivo: nomeDeArquivo(c.id), origem: null, promptHashGerado: null, verificacao: VAZIA }
      case 'aprovada':
        if (!arq) alertas.push(`${c.id}: ERRO arte APROVADA sem arquivo ${base.arquivo}; estado mantido, restaure o arquivo.`)
        else if (base.verificacao.sha256 && base.verificacao.sha256 !== arq.sha256)
          alertas.push(`${c.id}: ERRO arte APROVADA foi alterada (sha256 diferente do registrado); registro mantido, restaure o arquivo aprovado.`)
        else if (!base.verificacao.sha256) return { ...base, verificacao: verificacaoDe(arq) }
        return base
      case 'rejeitada':
        return arq ? { ...base, verificacao: verificacaoDe(arq) } : base
    }
  })
  return {
    manifesto: { versao: 1, descricao: DESCRICAO_MANIFESTO, estados: ESTADOS_ARTE, entradas },
    alertas,
  }
}

export interface ItemIndiceArte {
  arquivo: string
  estado: Exclude<EstadoArte, 'pendente' | 'rejeitada'>
}

/** Índice enxuto importado no build do jogo: só cartas com arte exibível. */
export function gerarIndice(m: Manifesto): Record<string, ItemIndiceArte> {
  const indice: Record<string, ItemIndiceArte> = {}
  for (const e of m.entradas) {
    if (e.estado === 'provisoria' || e.estado === 'gerada' || e.estado === 'aprovada') indice[e.id] = { arquivo: e.arquivo, estado: e.estado }
  }
  return indice
}

export function contarPorEstado(m: Manifesto): Record<EstadoArte, number> {
  const c: Record<EstadoArte, number> = { pendente: 0, provisoria: 0, gerada: 0, aprovada: 0, rejeitada: 0 }
  for (const e of m.entradas) c[e.estado]++
  return c
}
