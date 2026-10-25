// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { instalarAjusteTeclado, precisaAjuste } from '../ajusteTeclado'

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('ajuste do teclado virtual', () => {
  it('só age em toque ou largura <= 700px', () => {
    expect(precisaAjuste({ innerWidth: 1280, matchMedia: () => ({ matches: false }) as MediaQueryList })).toBe(false)
    expect(precisaAjuste({ innerWidth: 1280, matchMedia: () => ({ matches: true }) as MediaQueryList })).toBe(true)
    expect(precisaAjuste({ innerWidth: 390, matchMedia: () => ({ matches: false }) as MediaQueryList })).toBe(true)
  })

  it('ao focar um campo em tela estreita, rola o campo para o centro após o atraso', () => {
    vi.useFakeTimers()
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    const remover = instalarAjusteTeclado(document, 100)
    const campo = document.createElement('input')
    document.body.append(campo)
    campo.focus()
    expect(rolar).not.toHaveBeenCalled()
    vi.advanceTimersByTime(120)
    expect(rolar).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }))
    remover()
  })

  it('não rola ao focar um botão', () => {
    vi.useFakeTimers()
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    const remover = instalarAjusteTeclado(document, 100)
    const b = document.createElement('button')
    document.body.append(b)
    b.focus()
    vi.advanceTimersByTime(300)
    expect(rolar).not.toHaveBeenCalled()
    remover()
  })
})
