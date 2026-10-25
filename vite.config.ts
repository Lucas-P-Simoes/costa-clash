import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/costa-clash/',
  // Os testes de navegador (Playwright, pasta e2e/) rodam por `npm run test:e2e`, nunca pelo vitest.
  test: { exclude: [...configDefaults.exclude, 'e2e/**'] },
})
