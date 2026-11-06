export type Grupo = 'ecossistema' | 'fauna' | 'atividade' | 'impacto'
export type TipoCarta = 'unidade' | 'acao'
export type SubtipoAcao = 'instantanea' | 'terreno'

export interface Efeito {
  gatilho?: string
  operacao: string
  alvo?: string
  valor: number
}

export interface Carta {
  id: string
  nome: string
  tipo: TipoCarta
  grupo?: Grupo
  subtipo?: SubtipoAcao
  atk: number | null
  defesa: number | null
  efeito: Efeito | null
  educacao: string
}

export const VIDA_INICIAL = 5000
/** Tamanho do baralho montado/validado (perfil, adversários). */
export const CARTAS_POR_BARALHO = 40
/** Cartas de cada lado em um duelo: o baralho é embaralhado e só as 30 primeiras entram na partida. */
export const CARTAS_NO_DUELO = 30
export const MAX_COPIAS = 3
export const TAMANHO_MAO = 5
export const ZONAS_UNIDADE = 5
