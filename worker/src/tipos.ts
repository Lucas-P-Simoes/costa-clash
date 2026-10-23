export interface Env {
  DB: D1Database
  /** Origens CORS permitidas, separadas por vírgula. */
  ORIGENS_PERMITIDAS?: string
}

export interface ItemColecao {
  cartaId: string
  quantidade: number
}

export interface Perfil {
  id: string
  email: string
  baralho: string[]
  colecao: ItemColecao[]
}
