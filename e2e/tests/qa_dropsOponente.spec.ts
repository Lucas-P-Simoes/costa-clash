// QA: pop-up "Ver N cartas e chances" do Duelo Livre em viewports reais (Chrome do sistema).
// Confere botão alcançável, diálogo dentro da viewport, sem rolagem horizontal, Esc/foco e teclado.
import { expect, test } from '@playwright/test'
import { abrirCena } from '../lib/cenas.ts'
import { MATRIZ_COMPLETA, SUBCONJUNTO_E2E } from '../lib/viewports.ts'

const VIEWPORTS = [...new Map([...SUBCONJUNTO_E2E, ...MATRIZ_COMPLETA].map((v) => [v.nome, v])).values()]

for (const v of VIEWPORTS) {
  test(`drops ${v.nome}`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: v.w, height: v.h },
      deviceScaleFactor: v.dpr ?? 1,
      isMobile: !!v.toque && v.w < 800,
      hasTouch: !!v.toque,
    })
    const page = await ctx.newPage()
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await abrirCena(page, 'dueloLivre')
    const botao = page.getByRole('button', { name: /^Ver \d+ cartas e chances$/ })
    await botao.scrollIntoViewIfNeeded()
    const bb = (await botao.boundingBox())!
    expect(bb.width, 'botão sem largura').toBeGreaterThan(0)
    expect(bb.height, 'botão sem altura').toBeGreaterThan(0)
    // o centro do botão é o próprio botão (não coberto)
    const coberto = await botao.evaluate((b) => {
      const r = b.getBoundingClientRect()
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return el && (el === b || b.contains(el)) ? null : (el?.className ?? 'nada')
    })
    expect(coberto, 'botão coberto').toBeNull()
    if (v.toque) expect.soft(Math.min(bb.width, bb.height), 'alvo de toque < 44px').toBeGreaterThanOrEqual(44)
    await botao.click()
    const dialogo = page.getByRole('dialog', { name: /^Cartas de / })
    await dialogo.waitFor()
    const m = await page.evaluate(() => {
      const d = document.querySelector('.drops-dialogo')!.getBoundingClientRect()
      const f = document.querySelector('.drops-dialogo__fechar')!.getBoundingClientRect()
      const ul = document.querySelector('.drops-dialogo__lista')!
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight
      const nomes = [...document.querySelectorAll('.drops-item__nome, .drops-item__chance, .drops-item__tipo')].filter(
        (e) => e.scrollWidth > e.clientWidth + 1,
      ).length
      const fontes = [...document.querySelectorAll('.drops-dialogo *')]
        .filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
        .map((e) => parseFloat(getComputedStyle(e).fontSize))
      const alvosInfo = [...document.querySelectorAll('.drops-item__info')].map((e) => {
        const r = e.getBoundingClientRect()
        return Math.min(r.width, r.height)
      })
      return {
        d: { l: d.left, r: d.right, t: d.top, b: d.bottom },
        f: { t: f.top, b: f.bottom, h: f.height },
        vw,
        vh,
        docW: document.documentElement.scrollWidth,
        listaRola: ul.scrollHeight > ul.clientHeight + 1,
        listaAltura: ul.clientHeight,
        textoCortadoH: nomes,
        menorFonte: Math.min(...fontes),
        menorAlvoInfo: Math.min(...alvosInfo),
      }
    })
    expect(erros).toEqual([])
    expect(m.docW, 'rolagem horizontal').toBeLessThanOrEqual(m.vw)
    expect(m.d.l, 'diálogo fora à esquerda').toBeGreaterThanOrEqual(0)
    expect(m.d.r, 'diálogo fora à direita').toBeLessThanOrEqual(m.vw + 0.5)
    expect(m.d.t, 'diálogo fora no topo').toBeGreaterThanOrEqual(0)
    expect(m.d.b, 'diálogo fora embaixo').toBeLessThanOrEqual(m.vh + 0.5)
    expect(m.f.b, 'Fechar fora da viewport').toBeLessThanOrEqual(m.vh + 0.5)
    expect(m.listaAltura, 'lista sem altura útil').toBeGreaterThan(40)
    expect(m.textoCortadoH, 'texto cortado na horizontal').toBe(0)
    expect(m.menorFonte, 'fonte < 11px').toBeGreaterThanOrEqual(11)
    expect(m.menorAlvoInfo, 'alvo do botão de informação < 44px').toBeGreaterThanOrEqual(44)
    await expect(page.locator('.drops-dialogo__fechar')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialogo).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Duelo Livre', exact: true })).toBeVisible()
    await expect(botao).toBeFocused()
    await ctx.close()
  })
}

test('teclado: Tab percorre lista e todos os botões de informação, volta a Fechar e permanece preso', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 650 } })
  const page = await ctx.newPage()
  await abrirCena(page, 'dueloLivre')
  const botao = page.getByRole('button', { name: /^Ver \d+ cartas e chances$/ })
  await botao.focus()
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog')
  await dialogo.waitFor()
  const lista = page.locator('.drops-dialogo__lista')
  const informacoes = page.getByRole('button', { name: /^Informações sobre / })
  await expect(page.locator('.drops-dialogo__fechar')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(lista).toBeFocused()
  const totalInformacoes = await informacoes.count()
  expect(totalInformacoes, 'lista sem botões de informação').toBeGreaterThan(0)
  for (let i = 0; i < totalInformacoes; i += 1) {
    await page.keyboard.press('Tab')
    await expect(informacoes.nth(i), `ordem de Tab incorreta no botão de informação ${i + 1}`).toBeFocused()
    expect(await page.evaluate(() => !!document.activeElement?.closest('.drops-dialogo')), `foco escapou no botão ${i + 1}`).toBe(true)
  }
  await page.keyboard.press('Tab')
  await expect(page.locator('.drops-dialogo__fechar')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(lista).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('.drops-dialogo__fechar')).toBeFocused()
  // fundo inerte
  for (const sel of ['header', 'main', 'footer']) expect(await page.locator(sel).first().getAttribute('inert'), `${sel} inert`).not.toBeNull()
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)
  for (const sel of ['header', 'main', 'footer']) expect(await page.locator(sel).first().getAttribute('inert'), `${sel} ainda inert`).toBeNull()
  // A cena de convidado deixa só o primeiro adversário desbloqueado; a grade deve voltar a aceitar foco sem perder seleção.
  const marcado = page.getByRole('radio', { checked: true })
  await marcado.focus()
  await expect(marcado).toBeFocused()
  await expect(page.getByRole('radio')).toHaveCount(17)
  await ctx.close()
})

test('Esc depois de clicar no conteúdo do pop-up fecha só o pop-up (não sai da tela)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 650 } })
  const page = await ctx.newPage()
  await abrirCena(page, 'dueloLivre')
  await page.getByRole('button', { name: /^Ver \d+ cartas e chances$/ }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.waitFor()
  // clique em texto não focável dentro do diálogo (título)
  await page.locator('#drops-titulo').click()
  const foco = await page.evaluate(() => `${document.activeElement?.tagName}.${document.activeElement?.className}`)
  await page.keyboard.press('Escape')
  await expect(dialogo, `pop-up continua aberto (foco em ${foco})`).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Duelo Livre', exact: true }), `saiu da tela (foco estava em ${foco})`).toBeVisible()
  await ctx.close()
})

test('teclado consegue rolar a lista quando ela transborda', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 650 } })
  const page = await ctx.newPage()
  await abrirCena(page, 'dueloLivre')
  const botao = page.getByRole('button', { name: /^Ver \d+ cartas e chances$/ })
  await botao.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('dialog').waitFor()
  const rola = await page.locator('.drops-dialogo__lista').evaluate((ul) => ul.scrollHeight > ul.clientHeight + 1)
  test.skip(!rola, 'lista não transborda nesta viewport')
  // tenta alcançar a lista por Tab e rolar com PageDown/ArrowDown
  let alcancou = false
  for (let i = 0; i < 4 && !alcancou; i++) {
    await page.keyboard.press('Tab')
    alcancou = await page.evaluate(() => !!document.activeElement?.closest('.drops-dialogo__lista'))
  }
  await page.keyboard.press('PageDown')
  await page.keyboard.press('ArrowDown')
  // a rolagem por teclado do Chrome é animada: aguarda em vez de ler na hora
  await expect
    .poll(() => page.locator('.drops-dialogo__lista').evaluate((ul) => ul.scrollTop), { message: `lista não rola por teclado (Tab alcançou a lista: ${alcancou})` })
    .toBeGreaterThan(0)
  await ctx.close()
})

test('rodada 2: lista transborda em viewport baixa, é alcançável por Tab e rola por teclado', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 } })
  const page = await ctx.newPage()
  await abrirCena(page, 'dueloLivre')
  const botao = page.getByRole('button', { name: /^Ver \d+ cartas e chances$/ })
  await botao.scrollIntoViewIfNeeded()
  await botao.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('dialog').waitFor()
  const lista = page.locator('.drops-dialogo__lista')
  expect(await lista.evaluate((ul) => ul.scrollHeight > ul.clientHeight + 1), 'lista deveria transbordar').toBe(true)
  await expect(page.locator('.drops-dialogo__fechar')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(lista).toBeFocused()
  const outline = await lista.evaluate((ul) => getComputedStyle(ul).outlineStyle)
  expect(outline, 'lista sem indicador de foco').not.toBe('none')
  await page.keyboard.press('PageDown')
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => lista.evaluate((ul) => ul.scrollTop), { message: 'lista não rola por teclado' }).toBeGreaterThan(0)
  const informacoes = page.getByRole('button', { name: /^Informações sobre / })
  const totalInformacoes = await informacoes.count()
  expect(totalInformacoes, 'lista sem botões de informação').toBeGreaterThan(0)
  for (let i = 0; i < totalInformacoes; i += 1) {
    await page.keyboard.press('Tab')
    await expect(informacoes.nth(i), `ordem de Tab incorreta no botão de informação ${i + 1}`).toBeFocused()
  }
  await page.keyboard.press('Tab')
  await expect(page.locator('.drops-dialogo__fechar')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(lista).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('.drops-dialogo__fechar')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Duelo Livre', exact: true })).toBeVisible()
  await expect(botao).toBeFocused()
  await ctx.close()
})
