// @vitest-environment jsdom
// Redesenho visual do tabuleiro: moldura reutilizável, painéis, botões com ícones, posição, terreno, animações e resultado.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { efeitoTerreno } from '../../components/duelo/textoCarta'
import { MolduraOrnamentada } from '../../components/ui/MolduraOrnamentada'
import { CATALOGO } from '../../data/catalogo'
import { buscarOponente } from '../../data/oponentes'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Partida } from '../duelo/Partida'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  // @ts-expect-error remove o stub de matchMedia
  delete window.matchMedia
})

const botao = (n: string | RegExp) => screen.getByRole('button', { name: n })
const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!

function montar(cfg: ConfigCenario = {}, atrasoIA = 0) {
  const e = cenario({ humano: { baralho: 20 }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={atrasoIA} onVoltar={() => {}} onNovamente={() => {}} />)
}

describe('MolduraOrnamentada (componente reutilizável)', () => {
  it('põe os filhos no miolo, 4 cantos decorativos e o tom como classe', () => {
    const { container } = render(
      <MolduraOrnamentada tom="vermelho" className="minha" data-x="1">
        <p>conteúdo</p>
      </MolduraOrnamentada>,
    )
    const m = container.firstElementChild as HTMLElement
    expect(m.className).toContain('moldura-orn')
    expect(m.className).toContain('moldura-orn--vermelho')
    expect(m.className).toContain('minha')
    expect(m.getAttribute('data-x')).toBe('1')
    expect(m.querySelector('.moldura-orn__miolo p')!.textContent).toBe('conteúdo')
    const cantos = m.querySelectorAll('.moldura-orn__canto')
    expect(cantos).toHaveLength(4)
    cantos.forEach((c) => expect(c.getAttribute('aria-hidden')).toBe('true'))
  })

  it('aba opcional (oculta dos leitores de tela quando pedido) e elemento configurável', () => {
    const { container } = render(
      <MolduraOrnamentada as="section" aba="Turno" abaOculta aria-label="Região">
        x
      </MolduraOrnamentada>,
    )
    expect(container.querySelector('section.moldura-orn')).toBeTruthy()
    const aba = container.querySelector('.moldura-orn__aba')!
    expect(aba.textContent).toBe('Turno')
    expect(aba.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('region', { name: 'Região' })).toBeTruthy()
    expect(container.querySelectorAll('.moldura-orn__aba')).toHaveLength(1)
    cleanup()
    const r = render(<MolduraOrnamentada>sem aba</MolduraOrnamentada>)
    expect(r.container.querySelector('.moldura-orn__aba')).toBeNull()
  })
})

describe('Painéis OPONENTE e VOCÊ', () => {
  it('identificação, avatar, vida, contagens, 5 zonas de unidade e faixa de 5 suportes em cada lado', () => {
    montar()
    for (const [lado, nome, sub, vida, baralho] of [
      ['oponente', 'Oponente', 'IA do Litoral', 'Vida do oponente: 8000', 'Baralho: 20'],
      ['voce', 'Você', 'Protetor do Litoral', 'Sua vida: 8000', 'Baralho: 20'],
    ] as const) {
      const painel = q(`.duelo-lado--${lado}`)
      expect(painel.className).toContain('moldura-orn')
      expect(within(painel).getByRole('heading', { level: 2, name: nome })).toBeTruthy()
      expect(painel.textContent).toContain(sub)
      expect(painel.querySelector(`.duelo-avatar--${lado} svg`)).toBeTruthy()
      expect(within(painel).getByLabelText(vida)).toBeTruthy()
      expect(painel.querySelector('.duelo-vida svg')).toBeTruthy() // coração
      expect(painel.querySelector('.duelo-contagens')!.textContent).toContain(baralho)
      expect(painel.querySelector('.duelo-contagens')!.textContent).toContain('Descarte: 0')
      expect(painel.querySelectorAll('.zona')).toHaveLength(5)
      expect(painel.querySelectorAll('.suporte')).toHaveLength(5)
    }
    // mão do oponente só como versos, com a quantidade
    expect(screen.getByRole('group', { name: 'Mão do oponente: 1 cartas' })).toBeTruthy()
  })

  it('zonas vazias têm o losango e a mão mostra o título e as cartas', () => {
    montar({ humano: { mao: ['CC-001', 'CC-003'] } })
    expect(q('.duelo-lado--voce .zona--vazia .zona__losango')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: /Sua mão/ }).textContent).toContain('(2 cartas)')
    expect(q('.duelo-mao').className).toContain('moldura-orn')
  })
})

describe('Coluna lateral', () => {
  it('banner do turno (aria-live), botões com ícones e subtítulos, cartas restantes e dica com ícones', () => {
    montar({ humano: { mao: ['CC-001'] } })
    const banner = q('.duelo-turno')
    expect(banner.getAttribute('aria-live')).toBe('polite')
    expect(banner.className).toContain('duelo-turno--meu')
    expect(within(banner).getByText('Seu turno')).toBeTruthy()
    expect(banner.querySelector('svg')).toBeTruthy() // setas douradas
    for (const [id, sub] of [
      ['b-atacar', 'Ataca uma carta do oponente'],
      ['b-defender', 'Alterna a posição da unidade'],
      ['b-usar', 'Baixa uma carta da sua mão'],
      ['b-encerrar', 'Passa a vez ao oponente'],
    ] as const) {
      const b = document.getElementById(id)!
      expect(b.querySelector('.duelo-btn__icone svg'), id).toBeTruthy()
      expect(b.textContent).toContain(sub)
    }
    expect(screen.getByLabelText(/^Cartas restantes no baralho: [0-9]+$/)).toBeTruthy()
    const dica = screen.getByRole('region', { name: 'Dica educativa' })
    expect(dica.className).toContain('moldura-orn')
    expect(dica.querySelectorAll('h2 svg').length).toBeGreaterThanOrEqual(2) // livro e lâmpada
    expect(dica.querySelector('img')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('botão bloqueado: motivo visível ligado por aria-describedby, sem perder o foco nem a ação', () => {
    montar({ humano: { mao: ['CC-001'] } })
    const usar = botao(/Usar carta/)
    expect(usar.getAttribute('aria-disabled')).toBe('true')
    const motivo = document.getElementById(usar.getAttribute('aria-describedby')!)!
    expect(motivo.textContent).toBe('Selecione uma carta da mão.')
    expect(usar.closest('.duelo-btn-wrap')!.className).toContain('duelo-btn-wrap--bloqueado')
    fireEvent.click(usar)
    expect(q('.duelo-aviso').textContent).toBe('Selecione uma carta da mão.')
  })

  it('banner muda para "Turno do oponente" durante a IA (estilo frio) e volta ao jogador', () => {
    vi.useFakeTimers()
    montar({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } }, 100)
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(botao(/Encerrar turno/))
    expect(q('.duelo-turno').className).toContain('duelo-turno--outro')
    expect(screen.getByText('Turno do oponente')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(q('.duelo-turno').className).toContain('duelo-turno--meu')
    expect(screen.getByText('Seu turno')).toBeTruthy()
  })
})

describe('Posição ataque/defesa representada visualmente', () => {
  it('ataque: ícone de espadas e classe; defesa: ícone de escudo e classe', () => {
    montar({ humano: { campo: ['CC-001', { id: 'CC-003', pos: 'DEFESA' }] } })
    const cartas = document.querySelectorAll('.duelo-lado--voce .zona .carta')
    expect(cartas).toHaveLength(2)
    const [atq, def] = [cartas[0], cartas[1]]
    expect(atq.className).toContain('carta--ataque')
    expect(atq.className).not.toContain('carta--defesa')
    expect(atq.querySelector('.carta__posicao svg')).toBeTruthy()
    expect(atq.querySelector('.carta__posicao')!.textContent).toBe('ATQ')
    expect(def.className).toContain('carta--defesa')
    expect(def.querySelector('.carta__posicao svg')).toBeTruthy()
    expect(def.querySelector('.carta__posicao')!.textContent).toBe('DEF')
    // continua exposto também por texto acessível
    expect(def.getAttribute('aria-label')).toContain('em defesa')
    expect(atq.getAttribute('data-posicao')).toBe('ATAQUE')
    expect(def.getAttribute('data-posicao')).toBe('DEFESA')
  })

  it('defesa = carta DEITADA (rotate 90) por CSS, com transição curta; o selo de posição não gira; reduced-motion sem transição', () => {
    const css = readFileSync(resolve(__dirname, '../duelo/duelo.css'), 'utf8')
    const trecho = (sel: string) => {
      const i = css.indexOf(`${sel} {`)
      expect(i, sel).toBeGreaterThanOrEqual(0)
      return css.slice(i, css.indexOf('}', i))
    }
    expect(trecho('.carta--campo.carta--defesa')).toContain('--rot: rotate(90deg)')
    expect(trecho('.carta--campo.carta--defesa')).toContain('height: min(100cqh, 100cqw)')
    expect(trecho('.carta--campo')).toContain('transform: var(--rot)')
    expect(trecho('.carta--campo')).toContain('transition: transform 0.25s')
    expect(trecho('.carta--campo.carta--defesa .carta__posicao')).toContain('rotate(-90deg)')
    expect(trecho('.zona')).toContain('container-type: size')
    const reduzido = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduzido.slice(0, reduzido.indexOf('/* ----'))).toMatch(/\.carta--campo \{\s*transition: none/)
    // rótulo acessível continua dizendo a posição, também para a unidade do oponente
    cleanup()
    montar({ oponente: { campo: [{ id: 'CC-001', pos: 'DEFESA' }], mao: ['CC-001'] } })
    const op = q('.duelo-lado--oponente .zona .carta')
    expect(op.className).toContain('carta--defesa')
    expect(op.getAttribute('aria-label')).toContain('em defesa')
  })
})

describe('Faixa de terreno central', () => {
  it('mostra nome e efeito aplicável aos dois lados; sem terreno diz "nenhum"', () => {
    montar()
    expect(q('.duelo-terreno').textContent).toContain('Terreno: nenhum')
    cleanup()
    montar({ terreno: { id: 'CC-089', dono: 'humano' } })
    const t = q('.duelo-terreno')
    expect(t.getAttribute('role')).toBe('group')
    expect(t.getAttribute('aria-label')).toBe('Terreno global')
    expect(t.textContent).toContain('Terreno: Manguezal')
    expect(t.textContent).toContain('+300 ATK e DEF para ecossistema, nos dois lados')
  })

  it('efeitoTerreno: alvo qualquer vira "todas as unidades"; carta sem efeito de terreno devolve null', () => {
    const base = CATALOGO.find((c) => c.id === 'CC-089')!
    expect(efeitoTerreno({ ...base, efeito: { ...base.efeito!, alvo: 'qualquer' } })).toBe('+300 ATK e DEF para todas as unidades, nos dois lados')
    expect(efeitoTerreno(CATALOGO.find((c) => c.id === 'CC-001')!)).toBeNull()
  })
})

describe('Animações como classes temporárias (sem alterar o fluxo)', () => {
  const atacar = () => {
    fireEvent.click(botao(/^Atacar/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido.*alvo válido/ }))
  }
  const fxAtivos = () => document.querySelectorAll('[class*="carta--fx-"]').length

  it('carta usada entra no campo com classe temporária que expira', () => {
    vi.useFakeTimers()
    montar({ humano: { mao: ['CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 2 sua: vazia/ }))
    const carta = q('.duelo-lado--voce .zona:nth-child(2) .carta')
    expect(carta.className).toContain('carta--fx-entrando')
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(q('.duelo-lado--voce .zona:nth-child(2) .carta').className).not.toContain('carta--fx-')
  })

  it('ataque: atacante em destaque, destruída permanece até o fim da animação, dano pulsa a vida e tudo expira', () => {
    vi.useFakeTimers()
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], mao: ['CC-001'] } })
    atacar()
    // lógica já aplicada (zona do oponente esvaziada, vida atualizada) ...
    expect(screen.getByLabelText('Vida do oponente: 7600')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Zona 1 do oponente/ })).toBeNull()
    // ... e os efeitos aparecem como classes temporárias
    expect(q('.duelo-lado--voce .zona .carta').className).toContain('carta--fx-atacando')
    const fantasma = q('.duelo-lado--oponente [data-fantasma="destruida"]')
    expect(fantasma.querySelector('.carta--fx-destruida')).toBeTruthy()
    expect(fantasma.closest('.zona')!.getAttribute('aria-hidden')).toBe('true') // fora da árvore de acessibilidade
    const vida = q('.duelo-vida--oponente')
    expect(vida.className).toContain('duelo-vida--dano')
    expect(vida.querySelector('.duelo-vida__delta')!.textContent).toBe('-400')
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(fxAtivos()).toBe(0)
    expect(document.querySelector('[data-fantasma]')).toBeNull()
    expect(q('.duelo-vida--oponente').className).not.toContain('duelo-vida--dano')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('impacto na unidade atacada que sobrevive (defesa repele o ataque)', () => {
    vi.useFakeTimers()
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: [{ id: 'CC-001', pos: 'DEFESA' }], mao: ['CC-001'] } })
    fireEvent.click(botao(/^Atacar/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido.*alvo válido/ }))
    expect(q('.duelo-lado--oponente .zona .carta').className).toContain('carta--fx-impacto')
  })

  it('mudança de turno destaca o banner por um instante', () => {
    vi.useFakeTimers()
    montar({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(botao(/Encerrar turno/)) // IA sem atraso: volta direto ao jogador
    expect(q('.duelo-turno').className).toContain('duelo-turno--mudou')
    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(q('.duelo-turno').className).not.toContain('duelo-turno--mudou')
  })

  it('prefers-reduced-motion: o jogo funciona igual, mas sem nenhuma classe de animação', () => {
    vi.useFakeTimers()
    window.matchMedia = ((m: string) => ({ matches: m.includes('reduce'), media: m, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    montar({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], mao: ['CC-001'] } })
    atacar()
    expect(screen.getByLabelText('Vida do oponente: 7600')).toBeTruthy()
    expect(fxAtivos()).toBe(0)
    expect(document.querySelector('[data-fantasma]')).toBeNull()
    expect(q('.duelo-vida--oponente').className).not.toContain('duelo-vida--dano')
  })

  it('a animação não bloqueia a entrada: dá para agir logo após o ataque, com a classe ainda ativa', () => {
    vi.useFakeTimers()
    montar({ jogadaFeita: true, humano: { campo: ['CC-003', 'CC-002'] }, oponente: { campo: ['CC-001', 'CC-004'], mao: ['CC-001'] } })
    fireEvent.click(botao(/^Atacar/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido.*alvo válido/ }))
    expect(fxAtivos()).toBeGreaterThan(0)
    // segundo ataque imediatamente, sem esperar a animação
    fireEvent.click(screen.getByRole('button', { name: /Zona 2 sua: Restinga Preservada.*pode atacar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 2 do oponente: Duna Costeira.*alvo válido/ }))
    expect(screen.queryByRole('button', { name: /Zona 2 do oponente/ })).toBeNull()
  })
})

describe('Tela de resultado (estilo Tela-derrota / Tela-recompensa)', () => {
  function desistir() {
    montar({ humano: { campo: ['CC-001'], mao: ['CC-003'] }, oponente: { campo: ['CC-004', 'CC-005'], lp: 5000, mao: ['CC-001'] } })
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    return screen.getByRole('dialog')
  }

  it('derrota por desistência: título, frase, motivo, resumo com números públicos e recompensas em breve', () => {
    const d = desistir()
    expect(d.className).toContain('duelo-dialogo--derrota')
    expect(within(d).getByRole('heading', { name: 'Derrota' })).toBeTruthy()
    expect(d.textContent).toContain('O litoral ainda precisa de você')
    expect(d.textContent).toContain('Você desistiu do duelo.')
    const resumo = within(d).getByRole('region', { name: 'Resumo do duelo' })
    expect(within(resumo).getByLabelText('Vida final do oponente: 5000')).toBeTruthy()
    expect(within(resumo).getByLabelText('Sua vida final: 8000')).toBeTruthy()
    expect(within(resumo).getByLabelText('Unidades do oponente em campo: 2')).toBeTruthy()
    expect(within(resumo).getByLabelText('Suas unidades em campo: 1')).toBeTruthy()
    expect(d.textContent).toContain('Recompensas de cartas: em breve.')
    expect(d.textContent).not.toMatch(/nova carta obtida/i) // nenhuma recompensa inventada
    expect(within(d).getAllByRole('button').map((b) => b.textContent)).toEqual(['Jogar novamente', 'Voltar'])
    expect(document.activeElement!.textContent).toBe('Jogar novamente')
  })

  it('o resumo não revela nada oculto (sem mão/baralho/armadilhas do oponente)', () => {
    const d = desistir()
    expect(d.textContent).not.toMatch(/baralho|armadilha/i)
  })

  it('vitória usa o tema dourado; botões chamam os callbacks', () => {
    const onVoltar = vi.fn()
    const onNovamente = vi.fn()
    const e = cenario({ jogadaFeita: true, humano: { campo: ['CC-056'], baralho: 20 }, oponente: { lp: 1000, mao: ['CC-001'], baralho: 20 } })
    render(<Partida estadoInicial={e} oponente={buscarOponente('ressaca')!} atrasoIA={0} onVoltar={onVoltar} onNovamente={onNovamente} />)
    fireEvent.click(botao(/^Atacar/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Derramamento de Óleo.*pode atacar/ }))
    fireEvent.click(botao(/Ataque direto/))
    const d = screen.getByRole('dialog')
    expect(d.className).toContain('duelo-dialogo--vitoria')
    expect(within(d).getByRole('heading', { name: 'Vitória' })).toBeTruthy()
    fireEvent.click(within(d).getByRole('button', { name: 'Jogar novamente' }))
    expect(onNovamente).toHaveBeenCalled()
    fireEvent.click(within(d).getByRole('button', { name: 'Voltar' }))
    expect(onVoltar).toHaveBeenCalled()
  })
})

describe('Fantasma da carta destruída em defesa', () => {
  it('é desenhado deitado, como a unidade estava', () => {
    vi.useFakeTimers()
    montar({ jogadaFeita: true, humano: { campo: ['CC-071'] }, oponente: { campo: [{ id: 'CC-001', pos: 'DEFESA' }], mao: ['CC-001'] } })
    fireEvent.click(botao(/^Atacar/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Elevação.*pode atacar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido.*alvo válido/ }))
    const f = q('.duelo-lado--oponente [data-fantasma="destruida"] .carta')
    expect(f.className).toContain('carta--defesa')
    expect(f.className).toContain('carta--fx-destruida')
    expect(f.getAttribute('data-posicao')).toBe('DEFESA')
  })
})

describe('Correções pós-QA (D1, D2, D5)', () => {
  const css = readFileSync(resolve(__dirname, '../duelo/duelo.css'), 'utf8')
  const bloco = (seletor: string) => {
    const i = css.indexOf(`${seletor} {`)
    expect(i, seletor).toBeGreaterThanOrEqual(0)
    return css.slice(i, css.indexOf('}', i))
  }

  it('D1: cena do resultado fica num contêiner de altura própria (imagem absoluta, cover) e os botões grudam na base', () => {
    montar({ humano: { campo: ['CC-001'] } })
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    const d = screen.getByRole('dialog')
    const cena = d.querySelector('.duelo-resultado__cena')!
    expect(cena.tagName).toBe('DIV')
    expect(cena.getAttribute('aria-hidden')).toBe('true')
    expect(cena.querySelector('img.duelo-resultado__cena-img')).toBeTruthy()
    expect(bloco('.duelo-resultado__cena')).toContain('overflow: hidden')
    expect(bloco('.duelo-resultado__cena')).toContain('min-height: 0')
    expect(bloco('.duelo-resultado__cena-img')).toContain('position: absolute')
    expect(bloco('.duelo-resultado__cena-img')).toContain('object-fit: cover')
    expect(css).toMatch(/\.duelo-resultado \.duelo-dialogo__botoes \{[^}]*position: sticky/)
    // o foco inicial não rola o diálogo (preventScroll)
    expect(readFileSync(resolve(__dirname, '../../components/duelo/useFocoDialogo.ts'), 'utf8')).toContain('preventScroll: true')
  })

  it('D2: nomes nunca quebram no meio da palavra e a carta guarda o nome completo no tooltip', () => {
    expect(css).not.toContain('break-word')
    expect(css).toContain('overflow-wrap: normal')
    montar({ humano: { campo: ['CC-001'] } })
    const c = q('.duelo-lado--voce .zona .carta')
    expect(c.getAttribute('title')).toBe('Manguezal Protegido')
  })

  it('D5: o aviso do turno do oponente não atravessa a troca de turno', () => {
    vi.useFakeTimers()
    montar({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } }, 100)
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(botao(/Encerrar turno/))
    fireEvent.click(botao(/Encerrar turno/)) // durante a IA
    expect(q('.duelo-aviso').textContent).toContain('Aguarde a sua vez')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('Seu turno')).toBeTruthy()
    expect(q('.duelo-aviso').textContent).toBe('')
  })

  it('D5: botão bloqueado acionado pelo teclado (Enter/clique) mostra o motivo no aviso com aria-live', () => {
    montar({ humano: { mao: ['CC-001'] } })
    const usar = botao(/Usar carta/)
    usar.focus()
    expect(document.activeElement).toBe(usar) // aria-disabled mantém o foco
    fireEvent.click(usar)
    const aviso = q('.duelo-aviso')
    expect(aviso.getAttribute('aria-live')).toBe('polite')
    expect(aviso.textContent).toBe('Selecione uma carta da mão.')
  })
})
