import { fireEvent } from '@testing-library/react'

/** Executa em jsdom o mesmo gesto Pointer Events usado por mouse/toque/caneta. */
export function arrastarAtaque(atacante: Element, alvo: Element, pointerType = 'mouse') {
  const anterior = document.elementFromPoint
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => alvo })
  fireEvent.pointerDown(atacante, { pointerId: 91, pointerType, button: 0, isPrimary: true, clientX: 10, clientY: 10 })
  fireEvent.pointerMove(window, { pointerId: 91, pointerType, isPrimary: true, clientX: 80, clientY: 80 })
  fireEvent.pointerUp(window, { pointerId: 91, pointerType, isPrimary: true, clientX: 80, clientY: 80 })
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: anterior })
}
