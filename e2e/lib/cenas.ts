import type { Page } from '@playwright/test'

export const BASE = process.env.E2E_BASE ?? 'http://localhost:5199/costa-clash/'

export type Cena =
  | 'login'
  | 'criarConta'
  | 'recuperar'
  | 'conta'
  | 'convidado'
  | 'dueloLivre'
  | 'duelo'
  | 'dueloCampo'
  | 'resultadoVitoria'
  | 'resultadoDerrota'
  | 'resultadoEmpate'
  | 'arte'

export const CENAS: Cena[] = ['login', 'criarConta', 'recuperar', 'conta', 'convidado', 'dueloLivre', 'duelo', 'dueloCampo', 'resultadoVitoria', 'resultadoDerrota', 'resultadoEmpate', 'arte']

const HARNESS: Partial<Record<Cena, string>> = {
  conta: 'conta',
  dueloCampo: 'duelo-campo',
  resultadoVitoria: 'resultado-vitoria',
  resultadoDerrota: 'resultado-derrota',
  resultadoEmpate: 'resultado-empate',
}

async function aguardarEstavel(page: Page) {
  await page.waitForLoadState('load')
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(300)
}

/** Abre a tela (recarrega a página). Telas alcançáveis pela UI usam cliques reais; as demais, o harness (e2e/harness.html). */
export async function abrirCena(page: Page, cena: Cena): Promise<void> {
  const h = HARNESS[cena]
  if (cena === 'arte') {
    await page.goto(`${BASE}?arte=1`)
  } else if (h) {
    await page.goto(`${BASE}e2e/harness.html?cena=${h}`)
    if (cena === 'conta') await page.getByRole('heading', { name: 'Conta', exact: true }).waitFor()
    else if (cena === 'dueloCampo') await page.locator('.carta--campo').first().waitFor()
    else await page.getByRole('dialog').waitFor()
  } else {
    await page.goto(BASE)
    await page.getByRole('button', { name: 'Entrar' }).waitFor()
    if (cena === 'criarConta') await page.getByRole('button', { name: 'Criar conta' }).click()
    else if (cena === 'recuperar') await page.getByRole('button', { name: 'Esqueci a senha' }).click()
    else if (cena !== 'login') {
      await page.getByRole('button', { name: 'Jogar como convidado' }).click()
      if (cena !== 'convidado') {
        await page.getByRole('button', { name: 'Duelo livre' }).click()
        if (cena === 'duelo') {
          await page.getByRole('button', { name: 'Duelo', exact: true }).click()
          await page.locator('.tela-partida').waitFor()
        }
      }
    }
  }
  await aguardarEstavel(page)
}
