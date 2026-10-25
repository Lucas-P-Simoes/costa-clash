// Depuração: abre uma cena num viewport e avalia uma expressão JS na página.
//   node e2e/scripts/inspecionar.ts <cena> <WxH[@dpr]> "<expressão>" [captura.png]
import { chromium } from '@playwright/test'
import { abrirCena } from '../lib/cenas.ts'
import type { Cena } from '../lib/cenas.ts'

const [cena, vp, expr, captura] = process.argv.slice(2)
const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(vp ?? '')!
const w = Number(m[1])
const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: w, height: Number(m[2]) }, deviceScaleFactor: m[3] ? Number(m[3]) : 1, isMobile: w < 800, hasTouch: w < 800 })
const page = await ctx.newPage()
await abrirCena(page, cena as Cena)
if (captura) await page.screenshot({ path: captura, fullPage: true })
console.log(JSON.stringify(await page.evaluate(expr!), null, 1))
await browser.close()
