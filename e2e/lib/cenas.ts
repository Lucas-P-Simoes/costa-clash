import type { Page } from '@playwright/test'

export const BASE = process.env.E2E_BASE ?? 'http://localhost:5199/costa-clash/'

export type Cena =
  | 'login'
  | 'criarConta'
  | 'recuperar'
  | 'recuperarErros'
  | 'codigo'
  | 'contaDialogo'
  | 'contaNovoCodigo'
  | 'conta'
  | 'dueloLivre'
  | 'duelo'
  | 'dueloCampo'
  | 'resultadoVitoria'
  | 'resultadoDerrota'
  | 'resultadoEmpate'
  | 'arte'

export const CENAS: Cena[] = ['login', 'criarConta', 'recuperar', 'recuperarErros', 'codigo', 'conta', 'contaDialogo', 'contaNovoCodigo', 'dueloLivre', 'duelo', 'dueloCampo', 'resultadoVitoria', 'resultadoDerrota', 'resultadoEmpate', 'arte']

const HARNESS: Partial<Record<Cena, string>> = {
  conta: 'conta',
  codigo: 'codigo',
  contaDialogo: 'conta',
  contaNovoCodigo: 'conta',
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
    if (cena === 'codigo') await page.getByRole('heading', { name: 'Guarde seu código de recuperação' }).waitFor()
    else if (cena === 'conta' || cena === 'contaDialogo' || cena === 'contaNovoCodigo') {
      await page.getByRole('heading', { name: 'Conta', exact: true }).waitFor()
      if (cena !== 'conta') {
        await page.getByRole('button', { name: 'Gerar novo código de recuperação' }).click()
        await page.getByRole('dialog').waitFor()
      }
      if (cena === 'contaNovoCodigo') {
        await page.getByLabel('Senha atual').fill('senha-correta-1')
        await page.getByRole('button', { name: 'Gerar código', exact: true }).click()
        await page.getByLabel('Seu código de recuperação').waitFor()
      }
    }
    else if (cena === 'dueloCampo') await page.locator('.carta--campo').first().waitFor()
    else await page.getByRole('dialog').waitFor()
  } else if (cena === 'dueloLivre' || cena === 'duelo') {
    // Jogar exige conta: a sessão FALSA é restaurada e o App entra direto no Duelo Livre.
    await page.goto(`${BASE}e2e/harness.html?cena=autenticado`)
    await page.getByRole('heading', { name: 'Duelo Livre', exact: true }).waitFor()
    if (cena === 'duelo') {
      await page.getByRole('button', { name: 'Iniciar duelo', exact: true }).click()
      await page.locator('.tela-partida').waitFor()
    }
  } else {
    await page.goto(BASE)
    await page.getByRole('button', { name: 'Entrar' }).waitFor()
    if (cena === 'criarConta') await page.getByRole('button', { name: 'Criar conta' }).click()
    else if (cena === 'recuperar' || cena === 'recuperarErros') {
      await page.getByRole('button', { name: 'Esqueci a senha' }).click()
      await page.getByRole('heading', { name: 'Recuperar senha', level: 1 }).waitFor()
      if (cena === 'recuperarErros') {
        await page.getByRole('button', { name: 'Trocar senha' }).click()
        await page.getByRole('alert').first().waitFor()
      }
    }
  }
  await aguardarEstavel(page)
}
