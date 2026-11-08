// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CartaView } from '../../components/duelo/CartaView'
import { descricaoCarta } from '../../components/duelo/textoCarta'
import { CATALOGO } from '../../data/catalogo'
import { Raiz } from '../../Raiz'
import { PaginaAvaliacaoArte } from '../../screens/arte/PaginaAvaliacaoArte'
import { arteDaCarta } from '../arteDisponivel'
import { montarPrompt } from '../prompts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const carta = (id: string) => CATALOGO.find((c) => c.id === id)!
const ver = (id: string, arte?: Parameters<typeof CartaView>[0]['arte']) => {
  const c = carta(id)
  return render(<CartaView carta={c} rotulo={descricaoCarta(c)} arte={arte} />)
}

describe('arteDaCarta (manifesto importado no build)', () => {
  it('só cartas do índice; usa a base do Vite; ignora estados não exibíveis', () => {
    expect(arteDaCarta('CC-101')).toMatchObject({ estado: 'gerada' })
    expect(arteDaCarta('CC-101')!.url).toMatch(/assets\/cards\/art\/101\.webp$/)
    expect(arteDaCarta('CC-102')).toMatchObject({ estado: 'gerada' })
    expect(arteDaCarta('CC-102')!.url).toMatch(/assets\/cards\/art\/102\.webp$/)
    expect(arteDaCarta('CC-102', {})).toBeNull()
    expect(arteDaCarta('CC-101', { 'CC-101': { arquivo: '101.webp', estado: 'rejeitada' } })).toBeNull()
    expect(arteDaCarta('CC-101', { 'CC-101': { arquivo: '101.webp', estado: 'aprovada' } }, '/x/')).toEqual({ url: '/x/assets/cards/art/101.webp', estado: 'aprovada' })
  })
})

describe('CartaView com e sem ilustração', () => {
  it('carta no manifesto mostra a imagem (pixelada, lazy, alt com o nome) e o selo', () => {
    const { container } = ver('CC-101')
    const img = container.querySelector('img.carta__imagem') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.alt).toBe('Ilustração da carta CHAMA-MARÉ')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.src).toMatch(/101\.webp$/)
    expect(container.querySelector('.carta__arte svg')).toBeTruthy() // selo
    expect(container.querySelector('.carta--cat-marinha')).toBeTruthy()
    expect(container.querySelector('.carta__selo[data-selo="gota"]')).toBeTruthy()
  })

  it('carta sem arte usa o SVG de fallback, sem imagem', () => {
    const { container } = ver('CC-102', null)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.carta__arte > svg')).toBeTruthy()
    expect(container.querySelector('.carta--cat-marinha')).toBeTruthy()
  })

  it('arte=null força o fallback; arte explícita é usada', () => {
    expect(ver('CC-101', null).container.querySelector('img')).toBeNull()
    cleanup()
    const { container } = ver('CC-102', { url: '/a/002.webp', estado: 'gerada' })
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/a/002.webp')
  })

  it('erro de carregamento cai no SVG de fallback', () => {
    const { container } = ver('CC-101')
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.carta__arte > svg')).toBeTruthy()
  })

  it('mantém ATK/DEF e o nome na placa', () => {
    const { container } = ver('CC-101')
    expect(container.querySelector('.carta__nome')!.textContent).toBe('CHAMA-MARÉ')
    expect(container.querySelector('.carta__atk')!.textContent).toContain('2500')
    expect(container.querySelector('.carta__def')!.textContent).toContain('2000')
  })
})

describe('página de avaliação (?arte=1)', () => {
  it('mostra as 4 cartas piloto atuais com selo GERADA, prompt e critérios', () => {
    render(<PaginaAvaliacaoArte />)
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getAllByText('GERADA — aguardando aprovação do dono')).toHaveLength(4)
    expect(document.querySelectorAll('img.carta__imagem')).toHaveLength(4)
    expect(screen.getAllByText('Copiar prompt')).toHaveLength(4)
    expect(screen.getAllByText(/768x1024/).length).toBeGreaterThan(4)
    expect((screen.getByLabelText('Prompt da carta CRISTA-DE-GALO') as HTMLTextAreaElement).value).toBe(montarPrompt(carta('CC-153')))
    expect(screen.getByText(/70 ilustrações geradas/)).toBeTruthy()
  })

  it('sem arte mostra o fallback com o selo PENDENTE — sem arte gerada, sem inventar imagem', () => {
    render(<PaginaAvaliacaoArte arteDe={() => null} />)
    expect(screen.getAllByText('PENDENTE — sem arte gerada')).toHaveLength(4)
    expect(document.querySelectorAll('img')).toHaveLength(0)
  })

  it('copiar prompt usa a área de transferência e informa o resultado', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true })
    render(<PaginaAvaliacaoArte />)
    fireEvent.click(screen.getAllByText('Copiar prompt')[0])
    await waitFor(() => expect(screen.getByText('Prompt copiado.')).toBeTruthy())
    expect(escrever).toHaveBeenCalledWith(montarPrompt(carta('CC-101')))
  })

  it('falha ao copiar mostra aviso', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('x')) }, configurable: true })
    render(<PaginaAvaliacaoArte />)
    fireEvent.click(screen.getAllByText('Copiar prompt')[1])
    await waitFor(() => expect(screen.getByText(/Não foi possível copiar/)).toBeTruthy())
  })

  it('a rota só abre com ?arte=1; sem isso é o jogo (login)', async () => {
    render(<Raiz busca="" />)
    expect(screen.getAllByText(/Entrar/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Avaliação do estilo/)).toBeNull()
    cleanup()
    render(<Raiz busca="?arte=1" />)
    await waitFor(() => expect(screen.getByText(/Avaliação do estilo das ilustrações/)).toBeTruthy())
  })
})
