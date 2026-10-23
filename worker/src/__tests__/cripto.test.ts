import { describe, expect, it } from 'vitest'
import { hashSenha, igualConstante, ITERACOES_PBKDF2, novoToken, sha256Hex, verificarSenha } from '../cripto'

describe('senha (PBKDF2-SHA256)', () => {
  it('usa 100000 iterações, salt aleatório por usuário e não guarda a senha', async () => {
    const a = await hashSenha('minha-senha-segura')
    const b = await hashSenha('minha-senha-segura')
    expect(ITERACOES_PBKDF2).toBe(100_000)
    expect(a.iteracoes).toBe(100_000)
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    expect(JSON.stringify(a)).not.toContain('minha-senha-segura')
  })

  it('verifica senha correta e rejeita incorreta, vazia e quase igual', async () => {
    const h = await hashSenha('Correta123')
    expect(await verificarSenha('Correta123', h)).toBe(true)
    expect(await verificarSenha('correta123', h)).toBe(false)
    expect(await verificarSenha('Correta1234', h)).toBe(false)
    expect(await verificarSenha('', h)).toBe(false)
  })

  it('respeita o número de iterações guardado', async () => {
    const h = await hashSenha('abc12345', 1000)
    expect(await verificarSenha('abc12345', h)).toBe(true)
    expect(await verificarSenha('abc12345', { ...h, iteracoes: 1001 })).toBe(false)
  })
})

describe('utilitários', () => {
  it('igualConstante compara conteúdo e tamanho', () => {
    expect(igualConstante(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
    expect(igualConstante(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false)
    expect(igualConstante(new Uint8Array([1, 2]), new Uint8Array([1, 2, 0]))).toBe(false)
  })

  it('token tem 256 bits em base64url e é único', () => {
    const t = novoToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(novoToken()).not.toBe(t)
  })

  it('sha256Hex é determinístico (vetor conhecido)', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
