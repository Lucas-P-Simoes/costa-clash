// Validação pura dos campos de login (sem React). Mensagens em português.

export const TAMANHO_MAXIMO_EMAIL = 254

// Formato prático: parte local sem espaços/@, domínio com ponto e TLD de 2+ letras.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/

export type ResultadoValidacao = { valido: true } | { valido: false; mensagem: string }

const OK: ResultadoValidacao = { valido: true }

export function validarEmail(valor: string): ResultadoValidacao {
  const email = valor.trim()
  if (email === '') return { valido: false, mensagem: 'Informe seu e-mail.' }
  if (email.length > TAMANHO_MAXIMO_EMAIL || !FORMATO_EMAIL.test(email)) {
    return { valido: false, mensagem: 'Digite um e-mail válido, como nome@exemplo.com.' }
  }
  return OK
}

/** Senha não pode ser vazia nem composta só de espaços; espaços internos são permitidos e a senha nunca é "trimada". */
export function validarSenha(valor: string): ResultadoValidacao {
  if (valor === '') return { valido: false, mensagem: 'Informe sua senha.' }
  if (valor.trim() === '') return { valido: false, mensagem: 'A senha não pode ter apenas espaços.' }
  return OK
}

export interface ErrosLogin {
  email?: string
  senha?: string
}

export function validarLogin(email: string, senha: string): ErrosLogin {
  const erros: ErrosLogin = {}
  const e = validarEmail(email)
  const s = validarSenha(senha)
  if (!e.valido) erros.email = e.mensagem
  if (!s.valido) erros.senha = s.mensagem
  return erros
}
