// Testes de viewport: percorrem telas x viewports e conferem que a interface cabe, sem componentes fora da área visível.
// Rodar: npm run test:e2e   (usa o Chrome instalado; ver docs/TESTING.md)
import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { abrirCena, CENAS } from '../lib/cenas.ts'
import type { Cena } from '../lib/cenas.ts'
import { verificarCliquesAcoes, verificarCliquesControles } from '../lib/cliques.ts'
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
        // ATK/DEF nunca cortados (nome/efeito podem truncar em altura muito baixa); leque inteiro e alcançável; rótulos >= 10px
        expect(m.atributosCortados, 'ATK/DEF cortados').toEqual([])
        expect(m.problemasMao, 'mão colapsada/inalcançável').toEqual([])
        expect(m.rotulosPequenos, 'rótulos ATK/DEF < 10px').toEqual([])
        expect(m.posicoesIlegiveis, 'chips públicos ATQ/DEF ilegíveis').toEqual([])
        if (cena === 'duelo' || cena === 'dueloCampo') {
          for (const r of await verificarCliquesAcoes(page)) {
            expect(r.cobertoEm, 'botão ' + r.botao + ' coberto por outro elemento').toEqual([])
            expect(r.alcancavel, 'botão ' + r.botao + ' inalcançável').toBe(true)
          }
        }
        if (['login', 'criarConta', 'recuperar', 'recuperarErros', 'codigo', 'conta', 'contaDialogo', 'contaNovoCodigo'].includes(cena)) {
          expect(await verificarCliquesControles(page), 'controles cobertos (elementFromPoint)').toEqual([])
        }
        await ctx.close()
      })
    }
  })
}

test('leque sobreposto mantém uma faixa clicável em cada carta, também após rolar no toque', async ({ browser }) => {
  for (const [w, h, toque] of [
    [1920, 1000, false],
    [390, 844, true],
    [812, 375, true],
  ] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: toque && w < 800, hasTouch: toque })
    const page = await ctx.newPage()
    await abrirCena(page, 'dueloCampo')
    const cartas = page.locator('.duelo-mao__cartas .duelo-mao__item > .carta--mao')
    if (!toque) {
      const carta = cartas.nth(Math.floor((await cartas.count()) / 2))
      const item = carta.locator('..')
      const antes = await item.boundingBox()
      await carta.hover()
      await expect(page.locator('.duelo-inspecao')).toHaveCount(1)
      await page.waitForTimeout(220)
      const depois = await item.boundingBox()
      if (!antes || !depois) throw new Error('wrapper do leque não mensurável')
      for (const medida of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(depois[medida] - antes[medida]), `hitbox ${medida} não pode mover no hover`).toBeLessThanOrEqual(0.25)
      }
      await page.mouse.move(1, 1)
    }
    for (let i = 0; i < (await cartas.count()); i++) {
      const carta = cartas.nth(i)
      await carta.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }))
      await page.waitForTimeout(30)
      const alcançavel = await carta.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return [0.08, 0.27, 0.5, 0.73, 0.92].some((xp) =>
          [0.12, 0.5, 0.88].some((yp) => {
            const alvo = document.elementFromPoint(r.left + r.width * xp, r.top + r.height * yp)
            return alvo === el || alvo?.closest('.carta') === el
          }),
        )
      })
      expect(alcançavel, `${w}x${h}: carta ${i + 1} do leque`).toBe(true)
    }
    await ctx.close()
  }
})

test('inspeção amplia a carta pela origem e o chip público permanece legível', async ({ browser }) => {
  for (const [w, h, toque] of [
    [3840, 2030, false],
    [1920, 1000, false],
    [1366, 650, false],
    [1024, 600, false],
    [390, 844, true],
    [812, 375, true],
  ] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: toque && w < 800, hasTouch: toque })
    const page = await ctx.newPage()
    await abrirCena(page, 'dueloCampo')

    const chipOculto = page.locator('.duelo-lado--oponente .carta--verso.carta--campo .carta__posicao').first()
    await expect(chipOculto).toHaveText(/^(ATQ|DEF)$/)
    const estiloChip = await chipOculto.evaluate((el) => ({
      fonte: Number.parseFloat(getComputedStyle(el).fontSize),
      cortado: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
    }))
    expect(estiloChip.fonte, `${w}x${h}: fonte do chip oculto`).toBeGreaterThanOrEqual(10)
    expect(estiloChip.cortado, `${w}x${h}: chip oculto cortado`).toBe(false)

    const medir = async (origem: Locator, rotulo: string, detalhes: boolean, gatilho: 'foco' | 'toque') => {
      await origem.scrollIntoViewIfNeeded()
      if (gatilho === 'toque') await origem.tap()
      else await origem.focus()
      const painel = page.locator('.duelo-inspecao')
      await expect(painel).toBeVisible()
      await page.waitForTimeout(220)
      const carta = painel.locator('.carta').first()
      const [o, c, p, tabuleiro, barra, barraFixa] = await Promise.all([
        origem.boundingBox(),
        carta.boundingBox(),
        painel.boundingBox(),
        page.locator('.duelo-tabuleiro').boundingBox(),
        page.locator('.duelo-acoes').boundingBox(),
        page.locator('.duelo-acoes').evaluate((el) => getComputedStyle(el).position === 'fixed'),
      ])
      if (!o || !c || !p || !tabuleiro) throw new Error(`${w}x${h}: geometria ausente em ${rotulo}`)
      const escala = c.width / o.width
      expect(escala, `${w}x${h}: escala de ${rotulo} por ${gatilho}`).toBeGreaterThanOrEqual(1.55)
      expect(escala, `${w}x${h}: escala de ${rotulo} por ${gatilho}`).toBeLessThanOrEqual(2.05)
      expect(p.x, `${w}x${h}: painel à esquerda do tabuleiro`).toBeGreaterThanOrEqual(tabuleiro.x - 1)
      expect(p.x + p.width, `${w}x${h}: painel sobre a lateral`).toBeLessThanOrEqual(tabuleiro.x + tabuleiro.width + 1)
      expect(p.y, `${w}x${h}: painel acima da viewport`).toBeGreaterThanOrEqual(-1)
      expect(p.y + p.height, `${w}x${h}: painel abaixo da viewport`).toBeLessThanOrEqual(h + 1)
      if (barraFixa && barra) {
        expect(p.y + p.height, `${w}x${h}: painel de ${rotulo} por ${gatilho} sobre a barra fixa`).toBeLessThanOrEqual(barra.y + 0.5)
      }
      expect(c.y + c.height, `${w}x${h}: carta recortada no painel`).toBeLessThanOrEqual(p.y + p.height + 1)
      if (detalhes) {
        const d = await painel.locator('.duelo-inspecao__detalhes').boundingBox()
        if (!d) throw new Error(`${w}x${h}: detalhes ausentes em ${rotulo}`)
        expect(d.x + d.width, `${w}x${h}: detalhes cortados na horizontal`).toBeLessThanOrEqual(p.x + p.width + 1)
        expect(d.y + d.height, `${w}x${h}: detalhes cortados na vertical`).toBeLessThanOrEqual(p.y + p.height + 1)
      }
    }

    const mao = page.locator('.duelo-mao__cartas .carta--mao').first()
    const verso = page.locator('.duelo-lado--oponente .carta--verso.carta--campo').first()
    const gatilho = toque ? 'toque' : 'foco'
    await medir(mao, 'carta da mão', true, gatilho)
    await page.keyboard.press('Escape')
    await medir(verso, 'verso do campo', false, gatilho)

    // Regressão específica da paisagem baixa: o teste anterior só focava e não
    // exercitava o gesto real que recebe a geometria de toque.
    if (w === 812 && h === 375) {
      await page.keyboard.press('Escape')
      await mao.evaluate((el) => (el as HTMLElement).blur())
      await medir(mao, 'carta da mão', true, 'foco')
      await page.keyboard.press('Escape')
      await verso.evaluate((el) => (el as HTMLElement).blur())
      await medir(verso, 'verso do campo', false, 'foco')
    }
    await ctx.close()
  }
})

test('código de recuperação: aparece inteiro (sem corte) em celulares estreitos e com texto a 200%', async ({ browser }) => {
  for (const [w, h, zoomTexto] of [[320, 568, false], [360, 640, false], [375, 667, false], [320, 568, true], [375, 667, true]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    await abrirCena(page, 'codigo')
    if (zoomTexto) await page.addStyleTag({ content: 'html { font-size: 32px !important }' })
    const r = await page.evaluate(() => {
      const el = document.querySelector<HTMLTextAreaElement>('.codigo__valor')!
      const caixa = el.getBoundingClientRect()
      const pai = el.parentElement!.getBoundingClientRect()
      return { cortado: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1, dentro: caixa.left >= pai.left - 1 && caixa.right <= pai.right + 1, valor: el.value, excessoH: document.documentElement.scrollWidth - innerWidth }
    })
    expect(r.cortado, `${w}x${h} zoom=${zoomTexto}`).toBe(false)
    expect(r.dentro, `${w}x${h} zoom=${zoomTexto}`).toBe(true)
    expect(r.excessoH, `${w}x${h} zoom=${zoomTexto}`).toBeLessThanOrEqual(0)
    expect(r.valor).toBe('K7M2Q-9XWPD-4NHTR-VBS38')
    await ctx.close()
  }
})

test('botões das telas novas têm pelo menos 44px de altura em desktop de altura baixa', async ({ browser }) => {
  for (const [w, h] of [[1280, 600], [1366, 650], [1024, 600], [1100, 640]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await ctx.newPage()
    for (const cena of ['codigo', 'recuperar', 'contaNovoCodigo', 'contaDialogo', 'conta'] as Cena[]) {
      await abrirCena(page, cena)
      const pequenos = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('button, input[type=checkbox]'))
          .filter((e) => !e.closest('[inert], .sr-only') && e.getBoundingClientRect().height > 2 && !e.classList.contains('botao--link'))
          .map((e) => ({ t: (e.textContent ?? '').trim().slice(0, 20), h: Math.round(e.getBoundingClientRect().height) }))
          .filter((x) => x.h < 43.5),
      )
      expect(pequenos, `${cena} ${w}x${h}`).toEqual([])
      const m = await page.evaluate(medirNaPagina, MIN_FONTE)
      expect(m.excessoV, `${cena} ${w}x${h} rolagem`).toBeLessThanOrEqual(0)
    }
    await ctx.close()
  }
})

test('login: ENTRAR, CRIAR CONTA e ESQUECI A SENHA recebem o clique em janelas médias/baixas', async ({ browser }) => {
  for (const [w, h] of [[709, 506], [800, 500], [900, 600], [1024, 600], [1100, 640], [700, 450]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await ctx.newPage()
    await abrirCena(page, 'login')
    expect(await verificarCliquesControles(page), `${w}x${h}`).toEqual([])
    await ctx.close()
  }
})

test.describe('varredura de grade (login e telas novas): nenhum controle coberto', () => {
  const LARGURAS = [600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400]
  const ALTURAS = [450, 500, 550, 600, 650, 700, 750, 800]
  for (const cena of ['login', 'criarConta', 'recuperar', 'recuperarErros', 'codigo', 'conta'] as Cena[]) {
    test(`${cena}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 800 } })
      const page = await ctx.newPage()
      await abrirCena(page, cena)
      const falhas: string[] = []
      for (const w of LARGURAS) {
        for (const h of ALTURAS) {
          await page.setViewportSize({ width: w, height: h })
          await page.waitForTimeout(60)
          const m = await page.evaluate(medirNaPagina, MIN_FONTE)
          const cob = await verificarCliquesControles(page)
          if (m.excessoH > 0) falhas.push(`${w}x${h} rolagem horizontal`)
          if (m.sobreposicoes.length) falhas.push(`${w}x${h} sobreposição ${m.sobreposicoes.join(';')}`)
          if (cob.length) falhas.push(`${w}x${h} coberto ${cob.join(';')}`)
        }
      }
      expect(falhas).toEqual([])
      await ctx.close()
    })
  }
})

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
