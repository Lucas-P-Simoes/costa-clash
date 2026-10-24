import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal acessível: foco inicial no elemento `[data-foco-inicial]` (ou no primeiro focável), Tab/Shift+Tab
 * presos dentro do diálogo e, ao fechar, o foco volta ao elemento que o abriu (ou a `#idAlternativo`).
 * O fundo deve ser marcado `inert` pelo chamador.
 */
export function useFocoDialogo(ref: RefObject<HTMLElement | null>, idAlternativo?: string) {
  // capturado na renderização, antes de o fundo virar inert (que pode tirar o foco do acionador)
  const abertoRef = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null))
  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    const aberto = abertoRef.current
    const lista = () => [...dialogo.querySelectorAll<HTMLElement>(FOCAVEIS)]
    const inicial = dialogo.querySelector<HTMLElement>('[data-foco-inicial]') ?? lista()[0]
    inicial?.focus({ preventScroll: true })
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const itens = lista()
      if (itens.length === 0) return
      const primeiro = itens[0] as HTMLElement
      const ultimo = itens[itens.length - 1] as HTMLElement
      const atual = document.activeElement
      if (e.shiftKey && (atual === primeiro || !dialogo.contains(atual))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (atual === ultimo || !dialogo.contains(atual))) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      const alvo = aberto && aberto.isConnected && aberto !== document.body ? aberto : idAlternativo ? document.getElementById(idAlternativo) : null
      alvo?.focus()
    }
  }, [ref, idAlternativo])
}
