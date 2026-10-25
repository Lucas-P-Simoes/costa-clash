import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/responsivo.css'
import './styles/base.css'
import './styles/componentes.css'
import { Raiz } from './Raiz.tsx'
import { instalarAjusteTeclado } from './ui/ajusteTeclado.ts'

instalarAjusteTeclado()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Raiz />
  </StrictMode>,
)
