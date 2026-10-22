export type Grupo = 'ecossistema' | 'fauna' | 'atividade' | 'impacto'
export type TipoCarta = 'unidade' | 'acao' | 'armadilha'
export type SubtipoAcao = 'instantanea' | 'equipamento' | 'terreno'

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

export const VIDA_INICIAL = 8000
export const CARTAS_POR_BARALHO = 40
export const MAX_COPIAS = 3
export const TAMANHO_MAO = 5
export const ZONAS_UNIDADE = 5
export const ZONAS_SUPORTE = 5
