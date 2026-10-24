// Decide, por manifesto importado em build, se uma carta tem ilustração exibível.
// Nunca tenta carregar imagem inexistente: só cartas listadas em indiceArte.json (gerado por `npm run arte:manifesto`).
import indiceGerado from './indiceArte.json'

export type EstadoArteExibivel = 'provisoria' | 'gerada' | 'aprovada'

export interface ArteDaCarta {
  url: string
  estado: EstadoArteExibivel
}

type Indice = Readonly<Record<string, { arquivo: string; estado: string }>>

const PASTA = 'assets/cards/art/'

export const INDICE_DE_ARTE: Indice = indiceGerado

/** URL e estado da ilustração da carta, ou null (usa o fallback SVG). `base` é a base do Vite. */
export function arteDaCarta(id: string, indice: Indice = INDICE_DE_ARTE, base: string = import.meta.env.BASE_URL): ArteDaCarta | null {
  const item = indice[id]
  if (!item) return null
  if (item.estado !== 'provisoria' && item.estado !== 'gerada' && item.estado !== 'aprovada') return null
  return { url: `${base}${PASTA}${item.arquivo}`, estado: item.estado }
}

export const ROTULO_ESTADO_ARTE: Readonly<Record<EstadoArteExibivel, string>> = {
  provisoria: 'PROVISÓRIA — recorte da referência, baixa resolução',
  gerada: 'GERADA — aguardando aprovação do dono',
  aprovada: 'APROVADA',
}
