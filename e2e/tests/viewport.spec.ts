// Testes de viewport: percorrem telas x viewports e conferem que a interface cabe, sem componentes fora da área visível.
// Rodar: npm run test:e2e   (usa o Chrome instalado; ver docs/TESTING.md)
import { expect, test } from '@playwright/test'
import { abrirCena, CENAS } from '../lib/cenas.ts'
import type { Cena } from '../lib/cenas.ts'
import { verificarCliquesAcoes } from '../lib/cliques.ts'
import { medirNaPagina } from '../lib/medir.ts'
import { exigeSemRolagem, SUBCONJUNTO_E2E } from '../lib/viewports.ts'

const MIN_FONTE = 11

for (const v of SUBCONJUNTO_E2E) {
  test.describe(`viewport ${v.nome}`, () => {
    for (const cena of CENAS) {
      test(`${cena}`, async ({ browser }) => {
        const ctx = await browser.newContext({
          viewport: { width: v.w, height: v.h },
          deviceScaleFactor: v.dpr ?? 1,
          isMobile: !!v.toque && v.w < 800,
          hasTouch: !!v.toque,
        })
        const page = await ctx.newPage()
        const erros: string[] = []
        page.on('pageerror', (e) => erros.push(e.message))
        await abrirCena(page, cena as Cena)
        const m = await page.evaluate(medirNaPagina, MIN_FONTE)
        const semRolagem = exigeSemRolagem(v) && cena !== 'arte'
        const baixo = semRolagem && v.h <= 680

        expect(erros, 'erros de JS na página').toEqual([])
        // nunca há rolagem horizontal da página
        expect(m.excessoH, `rolagem horizontal (${m.docW} > ${m.vw})`).toBeLessThanOrEqual(0)
        // desktop: nada de rolagem vertical da página e nenhum controle fora da viewport
        if (semRolagem) {
          expect(m.excessoV, `rolagem vertical da página (${m.docH} > ${m.vh})`).toBeLessThanOrEqual(0)
          expect(m.foraDaViewport, 'controles fora da viewport').toEqual([])
          expect(m.sobreposicoes, 'controles sobrepostos').toEqual([])
          expect(m.fontesPequenas, `texto menor que ${MIN_FONTE}px`).toEqual([])
        } else {
          // celular/tablet: rolagem vertical natural permitida, mas nada fica fora na horizontal
          expect(m.foraDaViewport.filter((f) => f.l < -0.5 || f.r > m.vw + 0.5), 'controles fora na horizontal').toEqual([])
        }
        expect(m.imagensDistorcidas, 'imagens distorcidas').toEqual([])
        expect(m.cartasFora34, 'cartas fora de 3:4').toEqual([])
        if (m.coarse) expect(m.alvosPequenos, 'alvos de toque < 44px').toEqual([])
        if (!baixo && cena !== 'arte') expect(m.textoCortado, 'texto cortado').toEqual([])
        // ATK/DEF nunca cortados (nome/efeito podem truncar em altura muito baixa); mão inteira e sem sobreposição; rótulos >= 10px
        expect(m.atributosCortados, 'ATK/DEF cortados').toEqual([])
        expect(m.problemasMao, 'mão colapsada/sobreposta').toEqual([])
        expect(m.rotulosPequenos, 'rótulos ATK/DEF < 10px').toEqual([])
        if (cena === 'duelo' || cena === 'dueloCampo') {
          for (const r of await verificarCliquesAcoes(page)) {
            expect(r.cobertoEm, 'botão ' + r.botao + ' coberto por outro elemento').toEqual([])
            expect(r.alcancavel, 'botão ' + r.botao + ' inalcançável').toBe(true)
          }
        }
        await ctx.close()
      })
    }
  })
}

test.describe('zoom do navegador e redimensionamento dinâmico', () => {
  test('zoom 125% e 150% (viewport CSS menor + dpr) mantém o duelo e o login sem rolagem', async ({ browser }) => {
    for (const [w, h, dpr] of [[1536, 740, 1.25], [1280, 610, 1.5]] as const) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr })
      const page = await ctx.newPage()
      for (const cena of ['login', 'duelo', 'dueloCampo'] as Cena[]) {
        await abrirCena(page, cena)
        const m = await page.evaluate(medirNaPagina, MIN_FONTE)
        expect(m.excessoV, `${cena} ${w}x${h}@${dpr}`).toBeLessThanOrEqual(0)
        expect(m.excessoH, `${cena} ${w}x${h}@${dpr}`).toBeLessThanOrEqual(0)
        expect(m.foraDaViewport, `${cena} ${w}x${h}@${dpr}`).toEqual([])
      }
      await ctx.close()
    }
  })

  test('redimensionar a janela sem recarregar reaplica a escala (duelo com cartas em campo)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1000 } })
    const page = await ctx.newPage()
    await abrirCena(page, 'dueloCampo')
    const cdp = await ctx.newCDPSession(page)
    const bases: number[] = []
    for (const [w, h] of [[3840, 2030], [1366, 650], [1280, 600], [1920, 1000], [1024, 768], [1920, 1000]] as const) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
      await page.waitForTimeout(250)
      const m = await page.evaluate(medirNaPagina, MIN_FONTE)
      bases.push(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)))
      expect(m.excessoV, `${w}x${h}`).toBeLessThanOrEqual(0)
      expect(m.excessoH, `${w}x${h}`).toBeLessThanOrEqual(0)
      expect(m.foraDaViewport, `${w}x${h}`).toEqual([])
    }
    expect(bases[0]).toBe(26) // teto em 4K
    expect(bases[1]).toBe(14) // piso
    expect(bases[3]).toBeCloseTo(17.78, 1) // 1000 / 56,25
    expect(bases[5]).toBeCloseTo(bases[3]!, 5) // volta ao mesmo valor
    await ctx.close()
  })

  test('retrato e paisagem de tablet/celular: sem rolagem horizontal', async ({ browser }) => {
    for (const [w, h] of [[768, 1024], [1024, 768], [390, 844], [844, 390]] as const) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: true })
      const page = await ctx.newPage()
      for (const cena of ['login', 'dueloLivre', 'dueloCampo'] as Cena[]) {
        await abrirCena(page, cena)
        const m = await page.evaluate(medirNaPagina, MIN_FONTE)
        expect(m.excessoH, `${cena} ${w}x${h}`).toBeLessThanOrEqual(0)
      }
      await ctx.close()
    }
  })
})
