import { lazy, Suspense } from 'react'
import App from './App.tsx'

// Página de avaliação do estilo das ilustrações: só abre com ?arte=1 (sem link no produto) e carrega em um pedaço separado.
const PaginaAvaliacaoArte = lazy(() => import('./screens/arte/PaginaAvaliacaoArte.tsx').then((m) => ({ default: m.PaginaAvaliacaoArte })))

function modoAvaliacaoArte(busca: string): boolean {
  return new URLSearchParams(busca).get('arte') === '1'
}

export function Raiz({ busca = window.location.search }: { busca?: string }) {
  if (modoAvaliacaoArte(busca)) {
    return (
      <Suspense fallback={null}>
        <PaginaAvaliacaoArte />
      </Suspense>
    )
  }
  return <App />
}
