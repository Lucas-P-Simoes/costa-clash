// Teclado virtual: ao focar um campo em tela de toque/estreita, rola o campo para uma posição visível
// (o teclado pode cobri-lo). Complementa `interactive-widget=resizes-content` (index.html) e `scroll-padding` (responsivo.css).
const SELETOR_CAMPO = 'input, textarea, select, [contenteditable="true"]'

export function precisaAjuste(win: Pick<Window, 'matchMedia' | 'innerWidth'>): boolean {
  const toque = typeof win.matchMedia === 'function' && win.matchMedia('(pointer: coarse)').matches
  return toque || win.innerWidth <= 700
}

export function rolarCampoParaVisivel(el: Element): void {
  if (typeof (el as HTMLElement).scrollIntoView === 'function') (el as HTMLElement).scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
}

/** Instala os ouvintes; devolve a função que os remove. */
export function instalarAjusteTeclado(doc: Document = document, atrasoMs = 250): () => void {
  const win = doc.defaultView
  if (!win) return () => undefined
  let timer: number | undefined
  const agendar = () => {
    const ativo = doc.activeElement
    if (!ativo || !ativo.matches(SELETOR_CAMPO) || !precisaAjuste(win)) return
    win.clearTimeout(timer)
    timer = win.setTimeout(() => rolarCampoParaVisivel(ativo), atrasoMs)
  }
  doc.addEventListener('focusin', agendar)
  const vv = win.visualViewport
  vv?.addEventListener('resize', agendar)
  return () => {
    win.clearTimeout(timer)
    doc.removeEventListener('focusin', agendar)
    vv?.removeEventListener('resize', agendar)
  }
}
