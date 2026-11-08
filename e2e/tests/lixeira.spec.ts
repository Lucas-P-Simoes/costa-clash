import { expect, test } from '@playwright/test'
import { abrirCena } from '../lib/cenas.ts'

test.describe('lixeira e queima de descarte', () => {
  test.use({ viewport: { width: 1920, height: 1000 } })

  test('arrasto destaca a câmara e a carta real queima sem bloquear a interface', async ({ page }) => {
    await abrirCena(page, 'dueloCampo')
    const carta = page.locator('.duelo-mao__item > .carta--mao').first()
    const lixeira = page.locator('[data-destino="lixeira"]')
    const origem = await carta.boundingBox()
    const destino = await lixeira.boundingBox()
    expect(origem).not.toBeNull()
    expect(destino).not.toBeNull()

    await page.mouse.move(origem!.x + origem!.width / 2, origem!.y + origem!.height / 2)
    await page.mouse.down()
    await page.mouse.move(origem!.x + origem!.width / 2 + 30, origem!.y - 30, { steps: 3 })
    await page.mouse.move(destino!.x + destino!.width / 2, destino!.y + destino!.height / 2, { steps: 8 })
    await expect(lixeira).toHaveAttribute('data-estado', 'sobre')
    await expect(lixeira).toContainText('Solte para incinerar')
    await page.mouse.up()

    const queima = page.getByTestId('lixeira-queima')
    await expect(queima).toBeVisible()
    await expect(queima.locator('.carta')).toHaveCount(1)
    await expect(queima.locator('.lixeira-queima__chama')).toHaveCount(6)
    await expect(page.getByRole('button', { name: 'Encerrar turno' })).toBeVisible()
    await expect(queima).toBeHidden({ timeout: 3000 })
  })

  test('reduced-motion mantém feedback estático breve e remoção determinística', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await abrirCena(page, 'dueloCampo')
    await page.locator('.duelo-mao__item > .carta--mao').first().click()
    await page.getByRole('button', { name: 'Descartar carta selecionada' }).click()

    const queima = page.getByTestId('lixeira-queima')
    await expect(queima).toBeVisible()
    await expect(queima).toHaveCSS('animation-name', 'none')
    await expect(queima.locator('.lixeira-queima__chamas')).toBeHidden()
    await expect(queima).toBeHidden({ timeout: 3000 })
  })
})

test('mobile mantém a câmara dentro da largura e o CTA com alvo de toque', async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
  const page = await contexto.newPage()
  await abrirCena(page, 'dueloCampo')
  const lixeira = page.getByRole('region', { name: 'Lixeira' })
  await lixeira.scrollIntoViewIfNeeded()
  const caixa = await lixeira.boundingBox()
  expect(caixa).not.toBeNull()
  expect(caixa!.x).toBeGreaterThanOrEqual(0)
  expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(390)

  const botao = page.getByRole('button', { name: 'Descartar carta selecionada' })
  const caixaBotao = await botao.boundingBox()
  expect(caixaBotao).not.toBeNull()
  expect(caixaBotao!.height).toBeGreaterThanOrEqual(44)
  await contexto.close()
})
