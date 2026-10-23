import { useEffect } from 'react'

/** Esc aciona "voltar" (atalho opcional, espelha o botão O do rodapé). */
export function useAtalhoVoltar(onVoltar: () => void) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onVoltar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onVoltar])
}
