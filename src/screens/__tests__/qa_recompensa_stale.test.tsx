// @vitest-environment jsdom
// QA (drop por vitória): respostas atrasadas após "Jogar novamente", falha ao registrar o duelo e serviço sem as rotas.
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDrop, ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { useRecompensaDuelo } from '../duelo/recompensa'

afterEach(cleanup)

const usuario: UsuarioAutenticado = { id: 'u1', email: 'a@b.c' }

describe('QA useRecompensaDuelo', () => {
  it('resgate que responde depois de trocar de partida não aparece na partida nova', async () => {
    let liberar!: (r: ResultadoDrop) => void
    let n = 0
    const s = {
      entrar: vi.fn(),
      iniciarDuelo: vi.fn(async () => ({ ok: true as const, dueloId: `d-${++n}` })),
      resgatarVitoria: vi.fn(() => new Promise<ResultadoDrop>((r) => (liberar = r))),
    } satisfies ServicoAuth
    const aoAtualizar = vi.fn()
    const { result, rerender } = renderHook(({ p }) => useRecompensaDuelo('ressaca', p, usuario, s, aoAtualizar), { initialProps: { p: 1 } })
    act(() => result.current.aoVencer())
    await waitFor(() => expect(s.resgatarVitoria).toHaveBeenCalledWith('d-1'))
    rerender({ p: 2 })
    expect(result.current.recompensa).toBeUndefined()
    await act(async () => liberar({ ok: true, carta: 'CC-001', quantidade: 1, colecao: [{ cartaId: 'CC-001', quantidade: 1 }] }))
    // A carta da partida anterior não "vaza" para a nova; a coleção (verdade do servidor) ainda é atualizada.
    expect(result.current.recompensa).toBeUndefined()
    expect(aoAtualizar).toHaveBeenCalledTimes(1)
  })

  it('iniciarDuelo que rejeita (rede) vira mensagem de erro na vitória, sem chamar o resgate', async () => {
    const s = {
      entrar: vi.fn(),
      iniciarDuelo: vi.fn(() => Promise.reject(new Error('rede'))),
      resgatarVitoria: vi.fn(),
    } satisfies ServicoAuth
    const { result } = renderHook(() => useRecompensaDuelo('ressaca', 1, usuario, s))
    act(() => result.current.aoVencer())
    await waitFor(() => expect(result.current.recompensa?.tipo).toBe('erro'))
    expect(s.resgatarVitoria).not.toHaveBeenCalled()
  })

  it('logado com serviço sem as rotas de duelo: erro imediato, nunca fica em "sorteando"', () => {
    const { result } = renderHook(() => useRecompensaDuelo('ressaca', 1, usuario, { entrar: vi.fn() }))
    act(() => result.current.aoVencer())
    expect(result.current.recompensa?.tipo).toBe('erro')
  })

  it('re-render com usuário novo (coleção atualizada) não registra outro duelo', () => {
    const s = { entrar: vi.fn(), iniciarDuelo: vi.fn(async () => ({ ok: true as const, dueloId: 'd' })) } satisfies ServicoAuth
    const { rerender } = renderHook(({ u }) => useRecompensaDuelo('ressaca', 1, u, s), { initialProps: { u: usuario } })
    rerender({ u: { ...usuario, colecao: [{ cartaId: 'CC-001', quantidade: 2 }] } })
    expect(s.iniciarDuelo).toHaveBeenCalledTimes(1)
  })
})
