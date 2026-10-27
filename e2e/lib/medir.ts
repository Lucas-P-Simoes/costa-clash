// Medições executadas DENTRO da página (page.evaluate). A função precisa ser autocontida (sem closures).
export interface Retangulo {
  seletor: string
  texto: string
  l: number
  t: number
  r: number
  b: number
}

export interface Medicao {
  vw: number
  vh: number
  docW: number
  docH: number
  excessoV: number
  excessoH: number
  /** Elementos funcionais (botões, links, campos, cartas) que saem da viewport e não estão em rolagem interna. */
  foraDaViewport: Retangulo[]
  /** Containers com rolagem interna ativa (conteúdo maior que a caixa). */
  rolagemInterna: string[]
  /** Pares de controles que se sobrepõem. */
  sobreposicoes: string[]
  /** Textos com fonte efetiva menor que o mínimo. */
  fontesPequenas: { seletor: string; texto: string; px: number }[]
  /** Alvos de toque menores que 44 px. */
  alvosPequenos: { seletor: string; texto: string; w: number; h: number }[]
  /** Cartas cuja proporção de layout (largura/altura) difere de 3:4. */
  cartasFora34: { seletor: string; razao: number }[]
  /** Imagens renderizadas com proporção diferente da natural (distorção). */
  imagensDistorcidas: { src: string; razao: number; natural: number }[]
  /** Texto de carta/botão cortado (scroll > client). */
  textoCortado: string[]
  /** Cartas da mão inalcançáveis, sobre o campo, fora do painel ou com altura < 90% da natural (3:4). O leque pode sobrepor cartas deliberadamente. */
  problemasMao: string[]
  /** ATK/DEF (cartas da mão e do campo) cortados: número fora da carta ou scroll > client. */
  atributosCortados: string[]
  /** Rótulos ATK/DEF (aria-hidden, decorativos mas visíveis) com fonte efetiva abaixo do mínimo de 10px. */
  rotulosPequenos: { seletor: string; px: number }[]
  /** Chip público de posição do campo invisível, cortado ou com fonte abaixo de 10px. */
  posicoesIlegiveis: { seletor: string; texto: string; px: number; cortado: boolean }[]
  coarse: boolean
  dpr: number
}

export function medirNaPagina(minFonte: number): Medicao {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const raiz = document.scrollingElement ?? document.documentElement
  const desc = (el: Element): string => {
    const e = el as HTMLElement
    const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
    return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (cls ? '.' + cls : '')
  }
  const visivel = (el: Element): boolean => {
    const e = el as HTMLElement
    const cs = getComputedStyle(e)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false
    const r = e.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return false
    return true
  }
  const emRolagemInterna = (el: Element): boolean => {
    let p = el.parentElement
    while (p && p !== document.body) {
      const cs = getComputedStyle(p)
      if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return true
      p = p.parentElement
    }
    return false
  }
  const funcionais = Array.from(
    document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="button"], .carta--mao, .carta--campo, .duelo-vida, .duelo-turno__texto'),
  ).filter((e) => visivel(e) && !e.closest('.sr-only, [inert], .duelo-arrasto-fantasma, .duelo-inspecao'))

  const foraDaViewport: Retangulo[] = []
  for (const e of funcionais) {
    const r = e.getBoundingClientRect()
    const fora = r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5
    if (fora && !emRolagemInterna(e)) {
      foraDaViewport.push({ seletor: desc(e), texto: (e.textContent ?? '').trim().slice(0, 30), l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) })
    }
  }

  const rolagemInterna: string[] = []
  document.querySelectorAll<HTMLElement>('*').forEach((e) => {
    if (e === document.body || e === document.documentElement) return
    const cs = getComputedStyle(e)
    if (!/(auto|scroll)/.test(cs.overflowX + cs.overflowY)) return
    const vert = /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1
    const horiz = /(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1
    if ((vert || horiz) && visivel(e)) rolagemInterna.push(desc(e) + (vert ? ' [v]' : '') + (horiz ? ' [h]' : ''))
  })

  const sobreposicoes: string[] = []
  const botoes = funcionais.filter((e) => e.matches('button, a[href], input, select, textarea') && !e.matches('.carta--campo, .carta--mao'))
  for (let i = 0; i < botoes.length; i++) {
    for (let j = i + 1; j < botoes.length; j++) {
      const a = botoes[i]!.getBoundingClientRect()
      const b = botoes[j]!.getBoundingClientRect()
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      // elementos fixos/sticky (barra de ações, painel colado) cobrem o conteúdo por desenho: não contam
      const fixo = (el: Element) => ['fixed', 'sticky'].includes(getComputedStyle(el).position) || !!el.closest('.duelo-acoes, .painel-oponente')
      if (fixo(botoes[i]!) !== fixo(botoes[j]!)) continue
      if (w > 2 && h > 2 && !botoes[i]!.contains(botoes[j]!) && !botoes[j]!.contains(botoes[i]!)) sobreposicoes.push(desc(botoes[i]!) + ' x ' + desc(botoes[j]!))
    }
  }

  const fontesPequenas: Medicao['fontesPequenas'] = []
  const vistos = new Set<string>()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n: Node | null
  while ((n = walker.nextNode())) {
    const txt = (n.textContent ?? '').trim()
    if (!txt) continue
    const el = n.parentElement
    if (!el || !visivel(el) || el.closest('.sr-only, [aria-hidden="true"], [inert], script, style')) continue
    const px = parseFloat(getComputedStyle(el).fontSize)
    if (px < minFonte) {
      const k = desc(el) + px
      if (!vistos.has(k)) {
        vistos.add(k)
        fontesPequenas.push({ seletor: desc(el), texto: txt.slice(0, 24), px: Math.round(px * 10) / 10 })
      }
    }
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches
  const alvosPequenos: Medicao['alvosPequenos'] = []
  for (const e of funcionais.filter((x) => x.matches('button, a[href], input, select, textarea'))) {
    const r = e.getBoundingClientRect()
    if (r.width < 43.5 || r.height < 43.5) alvosPequenos.push({ seletor: desc(e), texto: (e.textContent ?? '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) })
  }

  const cartasFora34: Medicao['cartasFora34'] = []
  document.querySelectorAll<HTMLElement>('.carta--campo, .carta--mao').forEach((e) => {
    if (!visivel(e) || e.closest('[inert], .duelo-arrasto-fantasma, .duelo-inspecao')) return
    const razao = e.offsetWidth / e.offsetHeight
    if (Math.abs(razao - 0.75) > 0.03) cartasFora34.push({ seletor: desc(e), razao: Math.round(razao * 1000) / 1000 })
  })

  const imagensDistorcidas: Medicao['imagensDistorcidas'] = []
  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (!visivel(img) || !img.naturalWidth) return
    const fit = getComputedStyle(img).objectFit
    if (fit === 'cover' || fit === 'contain' || fit === 'scale-down' || fit === 'none') return
    const r = img.getBoundingClientRect()
    const razao = r.width / r.height
    const nat = img.naturalWidth / img.naturalHeight
    if (Math.abs(razao / nat - 1) > 0.03) imagensDistorcidas.push({ src: img.src.split('/').pop() ?? '', razao: Math.round(razao * 100) / 100, natural: Math.round(nat * 100) / 100 })
  })

  const textoCortado: string[] = []
  document.querySelectorAll<HTMLElement>('.carta__nome, .carta__atk, .carta__def, .carta__selo, .carta__efeito, .botao, .duelo-btn, .duelo-btn__texto, .duelo-vida, .duelo-turno__texto').forEach((e) => {
    if (!visivel(e) || e.closest('[inert], .duelo-inspecao')) return
    const cs = getComputedStyle(e)
    // só conta como cortado se algo recorta: overflow do próprio elemento ou o recorte da carta (.carta tem overflow: hidden)
    const recorta = cs.overflow !== 'visible' || !!e.closest('.carta')
    if (recorta && (e.scrollHeight > e.clientHeight + 3 || e.scrollWidth > e.clientWidth + 3)) textoCortado.push(desc(e) + ' "' + (e.textContent ?? '').trim().slice(0, 20) + '"')
  })

  const problemasMao: string[] = []
  const maos = Array.from(document.querySelectorAll<HTMLElement>(".duelo-mao__cartas .duelo-mao__item > .carta--mao")).filter((e) => visivel(e) && !e.closest("[inert], .duelo-arrasto-fantasma, .duelo-inspecao, .avarte"))
  const painelMao = document.querySelector<HTMLElement>(".duelo-mao")
  const inter = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
  maos.forEach((c) => {
    const r = c.getBoundingClientRect()
    if (c.offsetHeight < 0.9 * (c.offsetWidth / 0.75)) problemasMao.push("altura < 90% da natural: " + c.offsetWidth + "x" + c.offsetHeight)
    if (painelMao) {
      const p = painelMao.getBoundingClientRect()
      if (r.top < p.top - 1 || r.bottom > p.bottom + 1) problemasMao.push("carta fora do painel da mão (vertical)")
    }
    // A sobreposição é parte do leque. Ainda assim, cada carta precisa conservar
    // ao menos uma faixa atingível por mouse/toque em algum ponto do retângulo.
    const xs = [0.08, 0.27, 0.5, 0.73, 0.92]
    const ys = [0.12, 0.5, 0.88]
    const naViewport = r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh
    const inteiraNaViewport = r.left >= 0 && r.right <= vw && r.top >= 0 && r.bottom <= vh
    const acessivel = xs.some((xp) =>
      ys.some((yp) => {
        const alvo = document.elementFromPoint(r.left + r.width * xp, r.top + r.height * yp)
        return alvo === c || alvo?.closest('.carta') === c
      }),
    )
    // Em páginas com rolagem vertical natural a mão pode estar abaixo da dobra ou
    // só aparecer atrás da barra fixa. O hit-test vale quando a carta está inteira
    // na viewport atual; nos demais casos ela fica alcançável após a rolagem.
    const paginaRolavel = raiz.scrollHeight > vh + 1
    if (naViewport && (!paginaRolavel || inteiraNaViewport) && !acessivel) problemasMao.push("carta da mão sem faixa clicável")
    document.querySelectorAll<HTMLElement>(".duelo-lado, .zona, .suporte").forEach((z) => {
      if (visivel(z) && !z.closest("[inert]") && inter(r, z.getBoundingClientRect())) problemasMao.push("carta da mão sobre o campo (" + desc(z) + ")")
    })
  })

  const atributosCortados: string[] = []
  const rotulosPequenos: Medicao["rotulosPequenos"] = []
  document.querySelectorAll<HTMLElement>(".carta--mao .carta__atk, .carta--mao .carta__def, .carta--campo .carta__atk, .carta--campo .carta__def").forEach((e) => {
    if (!visivel(e) || e.closest("[inert], .duelo-arrasto-fantasma, .duelo-inspecao, .avarte")) return
    const carta = e.closest<HTMLElement>(".carta")!
    const cr = carta.getBoundingClientRect()
    const rg = document.createRange()
    rg.selectNodeContents(e)
    const tr = rg.getBoundingClientRect()
    const dentro = tr.left >= cr.left - 1 && tr.right <= cr.right + 1 && tr.top >= cr.top - 1 && tr.bottom <= cr.bottom + 1
    const rolando = e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 3
    if (!dentro || rolando) atributosCortados.push(desc(carta) + " " + (e.textContent ?? "").trim())
    const small = e.querySelector("small")
    if (small && visivel(small)) {
      const px = parseFloat(getComputedStyle(small).fontSize)
      if (px < 10) rotulosPequenos.push({ seletor: desc(small), px: Math.round(px * 10) / 10 })
    }
  })

  const posicoesIlegiveis: Medicao['posicoesIlegiveis'] = []
  document.querySelectorAll<HTMLElement>('.carta--campo .carta__posicao').forEach((e) => {
    if (!visivel(e) || e.closest('[inert], .duelo-arrasto-fantasma, .duelo-inspecao, .avarte')) return
    const px = parseFloat(getComputedStyle(e).fontSize)
    const cortado = e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1
    if (px < 10 || cortado) {
      posicoesIlegiveis.push({ seletor: desc(e), texto: (e.textContent ?? '').trim(), px: Math.round(px * 10) / 10, cortado })
    }
  })

  return {
    vw,
    vh,
    docW: raiz.scrollWidth,
    docH: raiz.scrollHeight,
    excessoV: raiz.scrollHeight - vh,
    excessoH: raiz.scrollWidth - vw,
    foraDaViewport,
    rolagemInterna,
    sobreposicoes,
    fontesPequenas,
    alvosPequenos,
    cartasFora34,
    imagensDistorcidas,
    textoCortado,
    problemasMao: [...new Set(problemasMao)],
    atributosCortados,
    rotulosPequenos,
    posicoesIlegiveis,
    coarse,
    dpr: window.devicePixelRatio,
  }
}
