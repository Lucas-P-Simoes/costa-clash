// Código de recuperação de senha: geração (servidor) e hash. Formato/normalização em src/auth/codigoRecuperacao.ts.
import { ALFABETO_CODIGO, formatarCodigo, normalizarCodigo, TAMANHO_CODIGO } from '../../src/auth/codigoRecuperacao'
import { aleatorio, igualConstante, paraBase64, sha256Hex } from './cripto'

const enc = new TextEncoder()
// Amostragem por rejeição: 248 = 8 * 31, então byte % 31 é uniforme (sem viés de módulo).
const LIMITE_BYTE = 248

/** 20 símbolos uniformes do alfabeto sem ambiguidade, via crypto.getRandomValues, agrupados XXXXX-XXXXX-XXXXX-XXXXX. */
export function gerarCodigoRecuperacao(): string {
  let saida = ''
  while (saida.length < TAMANHO_CODIGO) {
    for (const b of aleatorio(TAMANHO_CODIGO * 2)) {
      if (b < LIMITE_BYTE && saida.length < TAMANHO_CODIGO) saida += ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]
    }
  }
  return formatarCodigo(saida)
}

export interface CodigoGuardado {
  hash: string
  salt: string
}

/** SHA-256 com salt por código. O código tem ~99 bits, então um hash rápido basta (não há o que adivinhar offline). */
export function hashCodigo(codigo: string, salt: string): Promise<string> {
  return sha256Hex(`cc-recuperacao-v1|${salt}|${normalizarCodigo(codigo)}`)
}

export async function protegerCodigo(codigo: string): Promise<CodigoGuardado> {
  const salt = paraBase64(aleatorio(16))
  return { salt, hash: await hashCodigo(codigo, salt) }
}

/** Comparação em tempo constante do hash informado com o guardado. */
export function hashesIguais(a: string, b: string): boolean {
  return igualConstante(enc.encode(a), enc.encode(b))
}

// Valores fictícios: quando a conta não existe (ou não tem código) executa-se o mesmo trabalho e o resultado é descartado.
const SALT_FICTICIO = 'AAAAAAAAAAAAAAAAAAAAAA=='
let hashFicticio: Promise<string> | undefined
export const guardadoFicticio = (): Promise<CodigoGuardado> =>
  (hashFicticio ??= hashCodigo('ficticio-ficticio-ficticio', SALT_FICTICIO)).then((hash) => ({ hash, salt: SALT_FICTICIO }))
