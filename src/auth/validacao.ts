// Validação pura dos campos de login (sem React). Mensagens em português.

export const TAMANHO_MAXIMO_EMAIL = 254
export const TAMANHO_MINIMO_SENHA = 8
export const TAMANHO_MAXIMO_SENHA = 128

/** Forma canônica do e-mail (identidade da conta): NFKC, sem espaços nas pontas e em minúsculas. */
export function normalizarEmail(valor: string): string {
  return valor.normalize('NFKC').trim().toLowerCase()
}

// Formato prático: parte local sem espaços/@, domínio com ponto e TLD de 2+ letras.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/

export type ResultadoValidacao = { valido: true } | { valido: false; mensagem: string }

const OK: ResultadoValidacao = { valido: true }

export function validarEmail(valor: string): ResultadoValidacao {
  const email = normalizarEmail(valor)
  if (email === '') return { valido: false, mensagem: 'Informe seu e-mail.' }
  if (email.length > TAMANHO_MAXIMO_EMAIL || !FORMATO_EMAIL.test(email)) {
    return { valido: false, mensagem: 'Digite um e-mail válido, como nome@exemplo.com.' }
  }
  // Domínios internacionalizados (não ASCII) não são aceitos por enquanto.
  if (Array.from(email.slice(email.lastIndexOf('@') + 1)).some((ch) => ch.charCodeAt(0) > 127)) {
    return { valido: false, mensagem: 'Use um e-mail com domínio em caracteres comuns (sem acentos ou símbolos especiais).' }
  }
  return OK
}

/** Senha não pode ser vazia nem composta só de espaços; espaços internos são permitidos e a senha nunca é "trimada". */
export function validarSenha(valor: string): ResultadoValidacao {
  if (valor === '') return { valido: false, mensagem: 'Informe sua senha.' }
  if (valor.trim() === '') return { valido: false, mensagem: 'A senha não pode ter apenas espaços.' }
  if (valor.length > TAMANHO_MAXIMO_SENHA) return { valido: false, mensagem: 'A senha pode ter no máximo 128 caracteres.' }
  return OK
}

/** Regras de uma senha NOVA (cadastro). Iguais às do servidor. */
export function validarSenhaNova(valor: string): ResultadoValidacao {
  if (valor === '') return { valido: false, mensagem: 'Crie uma senha.' }
  if (valor.trim() === '') return { valido: false, mensagem: 'A senha não pode ter apenas espaços.' }
  if (valor.length < TAMANHO_MINIMO_SENHA) return { valido: false, mensagem: 'A senha precisa ter pelo menos 8 caracteres.' }
  if (valor.length > TAMANHO_MAXIMO_SENHA) return { valido: false, mensagem: 'A senha pode ter no máximo 128 caracteres.' }
  return OK
}

export function validarConfirmacao(senha: string, confirmacao: string): ResultadoValidacao {
  if (confirmacao === '') return { valido: false, mensagem: 'Repita a senha para confirmar.' }
  if (confirmacao !== senha) return { valido: false, mensagem: 'As senhas não coincidem.' }
  return OK
}

export interface ErrosCadastro extends ErrosLogin {
  confirmacao?: string
}

export function validarCadastro(email: string, senha: string, confirmacao: string): ErrosCadastro {
  const erros: ErrosCadastro = {}
  const e = validarEmail(email)
  const s = validarSenhaNova(senha)
  const c = validarConfirmacao(senha, confirmacao)
  if (!e.valido) erros.email = e.mensagem
  if (!s.valido) erros.senha = s.mensagem
  if (!c.valido) erros.confirmacao = c.mensagem
  return erros
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
