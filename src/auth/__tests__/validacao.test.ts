import { describe, expect, it } from 'vitest'
import { validarEmail, validarLogin, validarSenha } from '../validacao'

describe('validarEmail', () => {
  it.each(['a@b.co', 'nome.sobrenome@exemplo.com.br', ' mar@litoral.org ', 'x+tag@sub.dominio.com'])(
    'aceita %j',
    (v) => expect(validarEmail(v).valido).toBe(true),
  )
  it.each(['', '   ', 'semarroba', '@dominio.com', 'nome@', 'nome@dominio', 'nome@dominio.c', 'no me@dominio.com', 'a@@b.com', 'a@b..com', 'a@.com'])(
    'rejeita %j',
    (v) => expect(validarEmail(v).valido).toBe(false),
  )
  it('vazio tem mensagem própria', () => {
    expect(validarEmail('  ')).toEqual({ valido: false, mensagem: 'Informe seu e-mail.' })
  })
  it('rejeita e-mail acima de 254 caracteres', () => {
    expect(validarEmail(`${'a'.repeat(250)}@b.com`).valido).toBe(false)
  })
})

describe('validarSenha', () => {
  it('aceita senha comum e com espaços internos', () => {
    expect(validarSenha('abc123').valido).toBe(true)
    expect(validarSenha('minha senha').valido).toBe(true)
  })
  it('rejeita vazia e só espaços', () => {
    expect(validarSenha('').valido).toBe(false)
    expect(validarSenha('   ').valido).toBe(false)
  })
})

describe('validarLogin', () => {
  it('retorna erros por campo', () => {
    expect(Object.keys(validarLogin('', ''))).toEqual(['email', 'senha'])
    expect(validarLogin('a@b.co', 'x')).toEqual({})
  })
})
