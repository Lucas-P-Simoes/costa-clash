// Utilidades de criptografia (WebCrypto): senha com PBKDF2-SHA256, tokens e hashes.

/** O runtime Workers aceita no máximo 100000 iterações de PBKDF2. */
export const ITERACOES_PBKDF2 = 100_000

const enc = new TextEncoder()

export function paraBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

export function deBase64(texto: string): Uint8Array {
  const s = atob(texto)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

function paraHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function aleatorio(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

export async function sha256Hex(texto: string): Promise<string> {
  return paraHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(texto))))
}

/** Comparação em tempo constante (não encerra no primeiro byte diferente). */
export function igualConstante(a: Uint8Array, b: Uint8Array): boolean {
  let dif = a.length ^ b.length
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return dif === 0
}

async function derivar(senha: string, salt: Uint8Array, iteracoes: number): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: iteracoes }, chave, 256)
  return new Uint8Array(bits)
}

export interface SenhaHash {
  hash: string
  salt: string
  iteracoes: number
}

export async function hashSenha(senha: string, iteracoes = ITERACOES_PBKDF2): Promise<SenhaHash> {
  const salt = aleatorio(16)
  return { hash: paraBase64(await derivar(senha, salt, iteracoes)), salt: paraBase64(salt), iteracoes }
}

export async function verificarSenha(senha: string, guardado: SenhaHash): Promise<boolean> {
  const calculado = await derivar(senha, deBase64(guardado.salt), guardado.iteracoes)
  return igualConstante(calculado, deBase64(guardado.hash))
}

/** Token de sessão: 256 bits aleatórios em base64url. Só o hash SHA-256 vai ao banco. */
export function novoToken(): string {
  return paraBase64(aleatorio(32)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
