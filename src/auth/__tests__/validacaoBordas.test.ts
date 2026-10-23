import { describe, expect, it } from 'vitest'
import { TAMANHO_MAXIMO_EMAIL, validarEmail, validarSenha } from '../validacao'

describe('validação de borda (QA)', () => {
  it.each(['a@b', 'a@b.', '@b.com', 'a b@c.com', 'a@@b.com', 'a@b..com', 'a@.com', 'a@b.c', 'a@b.com.', '  '])('rejeita e-mail %j', (v) => {
    expect(validarEmail(v).valido).toBe(false)
  })
  it.each(['a@b.co', 'nome.sobrenome+tag@sub.dominio.com.br', '  a@b.co  ', 'á@b.co'])('aceita e-mail %j', (v) => {
    expect(validarEmail(v).valido).toBe(true)
  })
  it('rejeita e-mail acima de 254 caracteres', () => {
    const longo = 'a'.repeat(TAMANHO_MAXIMO_EMAIL) + '@b.co'
    expect(validarEmail(longo).valido).toBe(false)
  })
  it('senha: vazia e só espaços rejeitadas; com espaços internos e 1 caractere aceitas', () => {
    expect(validarSenha('').valido).toBe(false)
    expect(validarSenha('   ').valido).toBe(false)
    expect(validarSenha('a b').valido).toBe(true)
    expect(validarSenha('x').valido).toBe(true)
  })
})
