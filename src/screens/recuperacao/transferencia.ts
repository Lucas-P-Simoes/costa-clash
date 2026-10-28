// Copiar e baixar o código de recuperação. Nada é guardado (nem localStorage): o texto só vive no clique.

export const NOME_ARQUIVO_CODIGO = 'costa-clash-codigo-recuperacao.txt'

export function montarArquivoCodigo(email: string | undefined, codigo: string): string {
  return [
    'Costa Clash - código de recuperação de senha',
    '',
    ...(email ? [`E-mail da conta: ${email}`] : []),
    `Código de recuperação: ${codigo}`,
    '',
    'Guarde este arquivo em lugar seguro e não compartilhe com ninguém.',
    'Quem tiver este código e o seu e-mail pode trocar a sua senha.',
    'Se você perder o código e esquecer a senha, não há como recuperar a conta.',
    '',
  ].join('\r\n')
}

/** Copia para a área de transferência: API moderna, com plano B (seleção + execCommand). Devolve se conseguiu. */
export async function copiarTexto(texto: string, campo?: HTMLInputElement | HTMLTextAreaElement | null): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    /* sem permissão ou contexto inseguro: tenta o plano B */
  }
  try {
    if (campo) {
      campo.focus()
      campo.select()
      if (typeof document.execCommand === 'function' && document.execCommand('copy')) return true
    }
  } catch {
    /* ignora */
  }
  return false
}

/** Baixa um .txt via Blob (sem rede, sem armazenamento). Devolve se conseguiu iniciar o download. */
export function baixarTexto(nome: string, conteudo: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return true
  } catch {
    return false
  }
}
