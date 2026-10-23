/** Índice de destino de uma tecla de navegação na grade (sem dar a volta nas bordas). */
export function proximoIndice(tecla: string, atual: number, total: number, colunas: number): number | null {
  const limitar = (i: number) => Math.min(total - 1, Math.max(0, i))
  switch (tecla) {
    case 'ArrowRight':
      return limitar(atual + 1)
    case 'ArrowLeft':
      return limitar(atual - 1)
    case 'ArrowDown':
      return atual + colunas < total ? atual + colunas : atual
    case 'ArrowUp':
      return atual - colunas >= 0 ? atual - colunas : atual
    case 'Home':
      return 0
    case 'End':
      return total - 1
    default:
      return null
  }
}
