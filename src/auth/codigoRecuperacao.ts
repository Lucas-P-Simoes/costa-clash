import { validarConfirmacao, validarEmail, validarSenhaNova } from './validacao'

// Código de recuperação de senha: formato, normalização e validação puras (sem React, sem rede).
// Compartilhado pelo front e pelo worker (import relativo), como validacao.ts.
// Formato: 20 símbolos de um alfabeto de 31 caracteres SEM ambiguidade (sem 0, O, 1, I, L), agrupados 4 x 5:
// XXXXX-XXXXX-XXXXX-XXXXX (20 * log2(31) ~ 99 bits de entropia).

export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const TAMANHO_CODIGO = 20
export const TAMANHO_GRUPO_CODIGO = 5

const FORMATO = new RegExp(`^[${ALFABETO_CODIGO}]{${TAMANHO_CODIGO}}$`)
// Espaços e todos os tipos de hífen/traço que o usuário pode digitar ou colar.
const SEPARADORES = /[\s\-‐-―−]/g

/** Forma canônica: NFKC, maiúsculas, sem espaços nem hífens. Não corrige caracteres inválidos. */
export function normalizarCodigo(valor: string): string {
  return valor.normalize('NFKC').replace(SEPARADORES, '').toUpperCase()
}

/** O texto (já normalizado ou não) tem exatamente o formato de um código válido? */
export function codigoComFormatoValido(valor: string): boolean {
  return FORMATO.test(normalizarCodigo(valor))
}

/** Agrupa em blocos de 5 separados por hífen (aceita código parcial). */
export function formatarCodigo(valor: string): string {
  const n = normalizarCodigo(valor)
  const grupos: string[] = []
  for (let i = 0; i < n.length; i += TAMANHO_GRUPO_CODIGO) grupos.push(n.slice(i, i + TAMANHO_GRUPO_CODIGO))
  return grupos.join('-')
}

export const MENSAGEM_CODIGO_FORMATO = 'O código tem 20 letras e números, como ABCDE-FGHJK-MNPQR-STUVW.'

export type ResultadoValidacaoCodigo = { valido: true } | { valido: false; mensagem: string }

export function validarCodigoRecuperacao(valor: string): ResultadoValidacaoCodigo {
  if (normalizarCodigo(valor) === '') return { valido: false, mensagem: 'Informe o código de recuperação.' }
  if (!codigoComFormatoValido(valor)) return { valido: false, mensagem: MENSAGEM_CODIGO_FORMATO }
  return { valido: true }
}

// ----- formulário "Esqueci a senha" -----

export interface ErrosRecuperacao {
  email?: string
  codigo?: string
  senha?: string
  confirmacao?: string
}

export function validarRecuperacao(v: { email: string; codigo: string; senha: string; confirmacao: string }): ErrosRecuperacao {
  const erros: ErrosRecuperacao = {}
  const e = validarEmail(v.email)
  const c = validarCodigoRecuperacao(v.codigo)
  const s = validarSenhaNova(v.senha)
  const k = validarConfirmacao(v.senha, v.confirmacao)
  if (!e.valido) erros.email = e.mensagem
  if (!c.valido) erros.codigo = c.mensagem
  if (!s.valido) erros.senha = s.mensagem
  if (!k.valido) erros.confirmacao = k.mensagem
  return erros
}
