// Limitação de tentativas por chave. Janela fixa; o contador é incrementado ANTES de decidir
// (INSERT ... ON CONFLICT ... RETURNING), então requisições paralelas não furam o limite.
import { consumirContagem, devolverContagem, zerarContagem } from './dados'
import { sha256Hex } from './cripto'

export const LOGIN_MAX_TENTATIVAS = 5 // por e-mail+IP
export const LOGIN_IP_MAX_TENTATIVAS = 30 // por IP (contra password spraying)
export const LOGIN_JANELA_MS = 15 * 60 * 1000
export const CADASTRO_MAX = 10
export const CADASTRO_JANELA_MS = 60 * 60 * 1000

export interface Limite {
  chave: string
  janela: number
  max: number
}

export async function criarLimite(escopo: string, dados: string, max: number, janelaMs: number, agora: number): Promise<Limite> {
  return { chave: await sha256Hex(escopo + '|' + dados), janela: Math.floor(agora / janelaMs) * janelaMs, max }
}

/** Consome uma tentativa; true se ainda está dentro do limite (esta tentativa é permitida). */
export async function consumir(db: D1Database, l: Limite, agora: number): Promise<boolean> {
  return (await consumirContagem(db, l.chave, l.janela, agora)) <= l.max
}

export function devolver(db: D1Database, l: Limite): Promise<void> {
  return devolverContagem(db, l.chave, l.janela)
}

export function limpar(db: D1Database, l: Limite): Promise<void> {
  return zerarContagem(db, l.chave)
}
