import { useEffect } from 'react'

/** Esc aciona "voltar" quando a tela possui esse caminho (espelha o botão O do rodapé). */
export function useAtalhoVoltar(onVoltar?: () => void) {
  useEffect(() => {
    if (!onVoltar) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onVoltar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onVoltar])
}
