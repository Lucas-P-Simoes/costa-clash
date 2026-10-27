import type { Page } from '@playwright/test'

export interface ResultadoClique {
  botao: string
  /** Posições de rolagem em que o centro estava na viewport e o clique chegaria a OUTRO elemento. */
  cobertoEm: { scrollY: number; por: string }[]
  /** O centro do botão ficou visível em pelo menos uma posição de rolagem (scroll 0, meio e máximo)? */
  alcancavel: boolean
}

const BOTOES = ['b-defender', 'b-usar', 'b-encerrar', 'b-desistir']

/** Em scroll 0, meio e máximo: document.elementFromPoint no centro de cada botão de ação deve devolver o botão (ou descendente). */
export async function verificarCliquesAcoes(page: Page): Promise<ResultadoClique[]> {
  return page.evaluate(async (ids) => {
    const raiz = document.scrollingElement ?? document.documentElement
    const max = Math.max(0, raiz.scrollHeight - window.innerHeight)
    const posicoes = [0, Math.round(max / 2), max]
    // posição em que cada botão fica centralizado na viewport (alcançável por rolagem normal)
    for (const id of ids) {
      document.getElementById(id)?.scrollIntoView({ block: "center" })
      posicoes.push(Math.round(window.scrollY))
    }
    const out: { botao: string; cobertoEm: { scrollY: number; por: string }[]; alcancavel: boolean }[] = []
    for (const id of ids) out.push({ botao: id, cobertoEm: [], alcancavel: false })
    for (const y of [...new Set(posicoes)]) {
      window.scrollTo(0, y)
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      for (const o of out) {
        const b = document.getElementById(o.botao)
        if (!b) continue
        const r = b.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue
        const el = document.elementFromPoint(cx, cy)
        if (el && (el === b || b.contains(el))) o.alcancavel = true
        else if (o.botao !== "b-desistir") o.cobertoEm.push({ scrollY: y, por: el ? el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 2).join('.') : 'nada' })
      }
    }
    window.scrollTo(0, 0)
    return out
  }, BOTOES)
}
