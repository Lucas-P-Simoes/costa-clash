import { defineConfig } from '@playwright/test'

// Testes de viewport/layout no Chrome DO SISTEMA (channel: 'chrome'; nenhum navegador é baixado). Rodam por `npm run test:e2e`,
// fora do vitest. Sobem o servidor de desenvolvimento (ou reaproveitam um já aberto na porta 5199).
export default defineConfig({
  testDir: 'e2e/tests',
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: { channel: 'chrome', headless: true },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199/costa-clash/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
