import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/costa-clash/',
  // Os testes de navegador (Playwright, pasta e2e/) rodam por `npm run test:e2e`, nunca pelo vitest.
  // testTimeout maior: partidas inteiras simuladas (IA x IA, tutorial) passam de 5 s quando a suíte roda em paralelo e sob carga.
  test: { exclude: [...configDefaults.exclude, 'e2e/**'], testTimeout: 20000 },
})
