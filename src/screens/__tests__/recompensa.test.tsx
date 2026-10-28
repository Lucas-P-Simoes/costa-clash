// @vitest-environment jsdom
// Drop de carta por vitória: hook de recompensa, aviso único de vitória na Partida e texto da tela de resultado.
import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDrop, ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'
import { useRecompensaDuelo } from '../duelo/recompensa'
import type { EstadoRecompensa } from '../duelo/recompensa'
import { arrastarAtaque } from './ajudanteAtaque'

afterEach(cleanup)

const usuario: UsuarioAutenticado = { id: 'u1', email: 'a@b.c' }
const colecaoNova = [{ cartaId: 'CC-057', quantidade: 2 }, { cartaId: 'CC-001', quantidade: 1 }]

function servico(drop: ResultadoDrop = { ok: true, carta: 'CC-057', quantidade: 2, colecao: colecaoNova }) {
  return {
    entrar: vi.fn(),
    iniciarDuelo: vi.fn(async () => ({ ok: true as const, dueloId: 'd-1' })),
    resgatarVitoria: vi.fn(async () => drop),
  } satisfies ServicoAuth
}

describe('useRecompensaDuelo', () => {
  it('registra o duelo ao montar e resgata a vitória, entregando a coleção nova', async () => {
    const s = servico()
    const aoAtualizar = vi.fn()
    const { result } = renderHook(() => useRecompensaDuelo('ressaca', 1, usuario, s, aoAtualizar))
    expect(s.iniciarDuelo).toHaveBeenCalledWith('ressaca')
    expect(result.current.recompensa).toBeUndefined()
    act(() => result.current.aoVencer())
    expect(result.current.recompensa).toEqual({ tipo: 'sorteando' })
    await waitFor(() => expect(result.current.recompensa?.tipo).toBe('carta'))
    expect(result.current.recompensa).toEqual({ tipo: 'carta', cartaId: 'CC-057', quantidade: 2, cartasDistintas: 2 })
    expect(s.resgatarVitoria).toHaveBeenCalledWith('d-1')
    expect(aoAtualizar).toHaveBeenCalledWith(colecaoNova)
  })

  it('sem conta não chama o servidor e pede login', () => {
    const s = servico()
    const { result } = renderHook(() => useRecompensaDuelo('ressaca', 1, undefined, s))
    act(() => result.current.aoVencer())
    expect(s.iniciarDuelo).not.toHaveBeenCalled()
    expect(result.current.recompensa).toEqual({ tipo: 'sem_conta' })
  })

  it('erro do servidor vira mensagem; drop vazio vira sem_carta', async () => {
    const falha = servico({ ok: false, codigo: 'indisponivel', mensagem: 'Servidor fora.' })
    const a = renderHook(() => useRecompensaDuelo('ressaca', 1, usuario, falha))
    act(() => a.result.current.aoVencer())
    await waitFor(() => expect(a.result.current.recompensa).toEqual({ tipo: 'erro', mensagem: 'Servidor fora.' }))
    const vazio = servico({ ok: true, carta: null, quantidade: 0, colecao: [] })
    const b = renderHook(() => useRecompensaDuelo('ressaca', 1, usuario, vazio))
    act(() => b.result.current.aoVencer())
    await waitFor(() => expect(b.result.current.recompensa).toEqual({ tipo: 'sem_carta' }))
  })

  it('nova partida registra outro duelo e esquece a recompensa anterior', async () => {
    const s = servico()
    const { result, rerender } = renderHook(({ p }) => useRecompensaDuelo('ressaca', p, usuario, s), { initialProps: { p: 1 } })
    act(() => result.current.aoVencer())
    await waitFor(() => expect(result.current.recompensa?.tipo).toBe('carta'))
    rerender({ p: 2 })
    expect(result.current.recompensa).toBeUndefined()
    expect(s.iniciarDuelo).toHaveBeenCalledTimes(2)
  })
})

function vencer(recompensa?: EstadoRecompensa, onVitoria = vi.fn()) {
  const e = cenario({ jogadaFeita: true, humano: { campo: ['CC-056'], baralho: 20 }, oponente: { lp: 1000, mao: ['CC-001'], baralho: 20 } })
  const props = { estadoInicial: e, oponente: buscarOponente('ressaca')!, atrasoIA: 0, onVoltar: () => {}, onNovamente: () => {}, onVitoria }
  const r = render(<Partida {...props} recompensa={recompensa} />)
  arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Derramamento de Óleo.*pode atacar/ }), screen.getByLabelText('Vida do oponente: 1000'))
  return { ...r, onVitoria, rerenderCom: (x?: EstadoRecompensa) => r.rerender(<Partida {...props} recompensa={x} />) }
}

describe('Partida + resultado com drop', () => {
  it('avisa a vitória uma única vez, mesmo com re-render', () => {
    const { onVitoria, rerenderCom } = vencer()
    expect(onVitoria).toHaveBeenCalledTimes(1)
    rerenderCom({ tipo: 'sorteando' })
    rerenderCom({ tipo: 'sem_carta' })
    expect(onVitoria).toHaveBeenCalledTimes(1)
  })

  it('mostra sorteando, depois o nome da carta ganha com cópias e progresso da coleção', () => {
    const { rerenderCom } = vencer({ tipo: 'sorteando' })
    const d = screen.getByRole('dialog')
    expect(d.textContent).toContain('Sorteando sua carta…')
    rerenderCom({ tipo: 'carta', cartaId: 'CC-057', quantidade: 2, cartasDistintas: 41 })
    const status = within(screen.getByRole('dialog')).getByText(/Nova carta:/)
    expect(status.textContent).toMatch(/Nova carta: .+ \(2\/3 cópias\)\. Coleção: 41\/100 cartas\./)
  })

  it('textos de sem conta, sem carta e erro', () => {
    const { rerenderCom } = vencer({ tipo: 'sem_conta' })
    expect(screen.getByRole('dialog').textContent).toContain('Entre com uma conta para ganhar cartas')
    rerenderCom({ tipo: 'sem_carta' })
    expect(screen.getByRole('dialog').textContent).toContain('no máximo de cópias')
    rerenderCom({ tipo: 'erro', mensagem: 'Recompensas indisponíveis no momento.' })
    expect(screen.getByRole('dialog').textContent).toContain('Recompensas indisponíveis no momento.')
  })
})
