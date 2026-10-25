// @vitest-environment jsdom
// QA: bordas do arrasto da mão (ponteiro secundário, botão direito, vazamento de listeners, Esc, soltar após cancelar).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'

const tick = () => new Promise((r) => setTimeout(r, 5))
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await tick()
  // @ts-expect-error remove o stub
  delete document.elementFromPoint
})

function montar(cfg: ConfigCenario = {}) {
  const e = cenario({ humano: { baralho: 20, mao: ['CC-003', 'CC-004'] }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={0} onVoltar={() => {}} onNovamente={() => {}} />)
}
const mao = (i = 1) => screen.getByRole('button', { name: new RegExp('^Mão ' + i + ':') })
const zona = (i: number) => [...document.querySelectorAll<HTMLElement>('.duelo-lado--voce .duelo-zonas > .zona')][i]
const campoV = () => [...document.querySelectorAll('.duelo-lado--voce .duelo-zonas .carta')].map((c) => c.getAttribute('aria-label')).join('|')
const P = { pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true }

describe('QA arrasto: bordas', () => {
  it('botão direito do mouse e ponteiro secundário (segundo dedo) não iniciam arrasto', () => {
    montar()
    document.elementFromPoint = () => zona(1)
    fireEvent.pointerDown(mao(1), { ...P, button: 2, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, button: 2, clientX: 200, clientY: 300 })
    expect(document.querySelector('.duelo-arrasto-fantasma')).toBeNull()
    fireEvent.pointerDown(mao(1), { ...P, pointerId: 2, pointerType: 'touch', isPrimary: false, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, pointerId: 2, pointerType: 'touch', isPrimary: false, clientX: 200, clientY: 300 })
    expect(document.querySelector('.duelo-arrasto-fantasma')).toBeNull()
    expect(campoV()).toBe('')
  })

  it('movimento de outro ponteiro durante o arrasto é ignorado e não solta a carta', () => {
    montar()
    document.elementFromPoint = () => zona(2)
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 200, clientY: 300 })
    expect(document.querySelector('.duelo-arrasto-fantasma')).not.toBeNull()
    fireEvent.pointerUp(window, { ...P, pointerId: 7, clientX: 200, clientY: 300 })
    expect(campoV()).toBe('')
    expect(document.querySelector('.duelo-arrasto-fantasma')).not.toBeNull()
    fireEvent.pointerUp(window, { ...P, clientX: 200, clientY: 300 })
    expect(campoV()).toMatch(/Zona 3 sua: Recife de Coral/)
  })

  it('todo listener de janela adicionado pelo arrasto é removido (soltar, cancelar por Esc, pointercancel e desmontar)', async () => {
    const ativos = new Set<string>()
    const orig = { add: window.addEventListener.bind(window), rem: window.removeEventListener.bind(window) }
    const ids = new WeakMap<object, number>()
    let n = 0
    const k = (t: string, f: unknown) => t + ':' + (typeof f === 'function' || (typeof f === 'object' && f) ? (ids.get(f as object) ?? (ids.set(f as object, ++n), n)) : String(f))
    const add = vi.spyOn(window, 'addEventListener').mockImplementation((t: string, f: any, o?: any) => { ativos.add(k(t, f)); orig.add(t, f, o) })
    vi.spyOn(window, 'removeEventListener').mockImplementation((t: string, f: any, o?: any) => { ativos.delete(k(t, f)); orig.rem(t, f, o) })
    const { unmount } = montar()
    const base = add.mock.calls.length
    const tipos = ['pointermove', 'pointerup', 'pointercancel']
    const saldo = () => {
      const s: Record<string, number> = {}
      for (const t of tipos) s[t] = [...ativos].filter((a) => a.startsWith(t + ':')).length
      return s
    }
    expect(base).toBeGreaterThan(0)
    document.elementFromPoint = () => null // soltar fora: nada é jogado, a jogada da mão continua disponível
    // 1) soltar
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 200, clientY: 300 })
    fireEvent.pointerUp(window, { ...P, clientX: 200, clientY: 300 })
    expect(saldo()).toEqual({ pointermove: 0, pointerup: 0, pointercancel: 0 })
    await tick()
    // 2) Esc
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 200, clientY: 300 })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(saldo()).toEqual({ pointermove: 0, pointerup: 0, pointercancel: 0 })
    // 3) pointercancel
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 200, clientY: 300 })
    fireEvent.pointerCancel(window, { ...P })
    expect(saldo()).toEqual({ pointermove: 0, pointerup: 0, pointercancel: 0 })
    expect(document.querySelector('.duelo-arrasto-fantasma')).toBeNull()
    // 4) desmontar com arrasto em curso
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 200, clientY: 300 })
    expect(saldo().pointermove).toBe(1)
    expect(document.querySelector('.duelo-arrasto-fantasma')).not.toBeNull()
    unmount()
    expect(saldo()).toEqual({ pointermove: 0, pointerup: 0, pointercancel: 0 })
  })

  it('soltar depois de cancelar por Esc não joga a carta', () => {
    montar()
    document.elementFromPoint = () => zona(0)
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 200, clientY: 300 })
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.pointerUp(window, { ...P, clientX: 200, clientY: 300 })
    expect(campoV()).toBe('')
    expect(document.querySelectorAll('.zona--drop').length).toBe(0)
  })

  it('o fantasma do arrasto contém só a carta do jogador (nada do oponente) e é aria-hidden', () => {
    montar({ oponente: { baralho: 20, mao: ['CC-034'], suporte: ['CC-094'] } })
    document.elementFromPoint = () => zona(0)
    fireEvent.pointerDown(mao(1), { ...P, clientX: 100, clientY: 500 })
    fireEvent.pointerMove(window, { ...P, clientX: 200, clientY: 300 })
    const f = document.querySelector('.duelo-arrasto-fantasma')!
    expect(f.getAttribute('aria-hidden')).toBe('true')
    expect(f.textContent).toContain('Recife de Coral')
    expect(document.documentElement.outerHTML).not.toMatch(/Barreira Natural|CC-094|Pesquisa Oceanogr|CC-034/)
  })
})
