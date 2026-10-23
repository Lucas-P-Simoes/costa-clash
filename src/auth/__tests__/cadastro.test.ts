import { describe, expect, it } from 'vitest'
import { normalizarEmail, validarEmail, validarCadastro, validarConfirmacao, validarSenha, validarSenhaNova } from '../validacao'

describe('cadastro: validação (mesmas regras do servidor)', () => {
  it('normaliza e-mail (trim + minúsculas)', () => {
    expect(normalizarEmail('  Ana@Exemplo.COM ')).toBe('ana@exemplo.com')
  })

  it('normaliza com NFKC e rejeita domínio não ASCII', () => {
    expect(normalizarEmail('Ａna@Exemplo.com')).toBe('ana@exemplo.com')
    expect(validarEmail('ana@exêmplo.com').valido).toBe(false)
    expect(validarEmail('ana@exemplo.com').valido).toBe(true)
  })

  it('senha nova: 8 a 128 caracteres, sem ser só espaços', () => {
    expect(validarSenhaNova('').valido).toBe(false)
    expect(validarSenhaNova('1234567').valido).toBe(false)
    expect(validarSenhaNova('12345678').valido).toBe(true)
    expect(validarSenhaNova('x'.repeat(128)).valido).toBe(true)
    expect(validarSenhaNova('x'.repeat(129)).valido).toBe(false)
    expect(validarSenhaNova('        ').valido).toBe(false)
    expect(validarSenhaNova(' com espaço ').valido).toBe(true)
  })

  it('login aceita senhas curtas já existentes, mas não acima de 128', () => {
    expect(validarSenha('abc').valido).toBe(true)
    expect(validarSenha('x'.repeat(129)).valido).toBe(false)
  })

  it('confirmação precisa coincidir exatamente', () => {
    expect(validarConfirmacao('abcdefgh', '').valido).toBe(false)
    expect(validarConfirmacao('abcdefgh', 'abcdefgH').valido).toBe(false)
    expect(validarConfirmacao('abcdefgh', 'abcdefgh').valido).toBe(true)
  })

  it('validarCadastro agrega erros por campo', () => {
    expect(validarCadastro('a@b.co', 'abcdefgh', 'abcdefgh')).toEqual({})
    const e = validarCadastro('x', 'curta', 'outra')
    expect(Object.keys(e).sort()).toEqual(['confirmacao', 'email', 'senha'])
  })
})
