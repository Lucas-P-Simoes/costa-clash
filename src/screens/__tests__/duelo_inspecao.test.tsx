// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { InspecaoCarta } from '../../components/duelo/InspecaoCarta'
import type { FonteInspecao } from '../../components/duelo/InspecaoCarta'
import { resolverConteudoInspecao } from '../../components/duelo/resolverInspecao'
import { CATALOGO } from '../../data/catalogo'
import { buscarOponente } from '../../data/oponentes'
import { visaoParaJogador } from '../../game'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { estadoDeVisao } from '../../game/visao'
import { Partida } from '../duelo/Partida'

afterEach(() => {
  cleanup()
  // @ts-expect-error remove o stub de matchMedia
  delete window.matchMedia
})

function montar(cfg: ConfigCenario = {}) {
  const estado = cenario({ humano: { baralho: 20 }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={estado} oponente={buscarOponente('ressaca')!} atrasoIA={0} onVoltar={() => {}} onNovamente={() => {}} />)
}

const cartaMao = (indice = 1) => screen.getByRole('button', { name: new RegExp(`^Mão ${indice}:`) })
const inspecao = () => document.querySelector<HTMLElement>('.duelo-inspecao')

describe('mão em leque e inspeção ampliada', () => {
  it('usa wrappers simétricos sem aplicar a rotação do leque na própria carta', () => {
    montar({ humano: { mao: ['CC-001', 'CC-002', 'CC-003', 'CC-004', 'CC-005'] } })
    const itens = [...document.querySelectorAll<HTMLElement>('.duelo-mao__item')]
    expect(itens).toHaveLength(5)
    expect(itens[0]!.style.getPropertyValue('--mao-angulo')).toBe('-6deg')
    expect(itens[2]!.style.getPropertyValue('--mao-angulo')).toBe('0deg')
    expect(itens[4]!.style.getPropertyValue('--mao-angulo')).toBe('6deg')
    expect(itens.every((item) => item.firstElementChild?.classList.contains('carta'))).toBe(true)
    expect(itens.every((item) => !(item.firstElementChild as HTMLElement).style.transform)).toBe(true)
  })

  it('abre somente uma cópia visual no hover, mostra os detalhes completos e fecha ao sair', () => {
    montar({ humano: { mao: ['CC-001', 'CC-003'] } })
    const carta = cartaMao()
    fireEvent.pointerEnter(carta, { pointerType: 'mouse' })
    const painel = inspecao()!
    const catalogo = CATALOGO.find((c) => c.id === 'CC-001')!
    expect(document.querySelectorAll('.duelo-inspecao')).toHaveLength(1)
    expect(painel.getAttribute('aria-hidden')).toBe('true')
    expect(painel.textContent).toContain(catalogo.nome)
    expect(painel.textContent).toContain(catalogo.educacao)
    expect(painel.querySelector('.carta__arte')).toBeTruthy()
    fireEvent.pointerLeave(carta, { pointerType: 'mouse' })
    expect(inspecao()).toBeNull()
  })

  it('para cartas não-unidade inclui tipo, categoria, efeito e educação', () => {
    const catalogo = CATALOGO.find((c) => c.tipo !== 'unidade')!
    montar({ humano: { mao: [catalogo.id] } })
    fireEvent.pointerEnter(cartaMao(), { pointerType: 'mouse' })
    const painel = inspecao()!
    expect(painel.querySelector('.duelo-inspecao__tipo')?.textContent).toContain('·')
    expect(painel.querySelector('.duelo-inspecao__efeito')?.textContent?.trim()).toBeTruthy()
    expect(painel.querySelector('.duelo-inspecao__educacao')?.textContent).toBe(catalogo.educacao)
  })

  it('mantém a inspeção enquanto a carta tem foco e Escape fecha só essa camada', () => {
    montar({ humano: { mao: ['CC-001'] } })
    const carta = cartaMao()
    fireEvent.focus(carta)
    expect(inspecao()).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(inspecao()).toBeNull()
    expect(screen.queryByRole('alertdialog', { name: 'Desistir do duelo?' })).toBeNull()
  })

  it('mantém a inspeção de foco quando o ponteiro entra e sai da mesma carta', () => {
    montar({ humano: { mao: ['CC-001'] } })
    const carta = cartaMao()
    carta.focus()
    fireEvent.focus(carta)
    fireEvent.pointerEnter(carta, { pointerType: 'mouse' })
    fireEvent.pointerLeave(carta, { pointerType: 'mouse' })
    expect(document.activeElement).toBe(carta)
    expect(inspecao()).toBeTruthy()
  })

  it('prioriza o hover e restaura o foco sem um gatilho apagar o outro', () => {
    montar({ humano: { mao: ['CC-001', 'CC-003'] } })
    const primeira = cartaMao(1)
    const segunda = cartaMao(2)
    const nomePrimeira = CATALOGO.find((c) => c.id === 'CC-001')!.nome
    const nomeSegunda = CATALOGO.find((c) => c.id === 'CC-003')!.nome

    primeira.focus()
    fireEvent.focus(primeira)
    expect(inspecao()?.textContent).toContain(nomePrimeira)
    fireEvent.pointerEnter(segunda, { pointerType: 'mouse' })
    expect(inspecao()?.textContent).toContain(nomeSegunda)
    fireEvent.pointerLeave(segunda, { pointerType: 'mouse' })
    expect(inspecao()?.textContent).toContain(nomePrimeira)

    fireEvent.pointerEnter(segunda, { pointerType: 'mouse' })
    fireEvent.blur(primeira, { relatedTarget: document.body })
    expect(inspecao()?.textContent).toContain(nomeSegunda)
    fireEvent.pointerLeave(segunda, { pointerType: 'mouse' })
    expect(inspecao()).toBeNull()
  })

  it('mantém a hitbox do leque imóvel enquanto destaca a carta inspecionada', () => {
    const css = readFileSync(resolve(__dirname, '../duelo/duelo.css'), 'utf8')
    expect(css).toMatch(/\.duelo-mao__item\s*\{[^}]*transform:\s*translateY\(var\(--mao-deslocamento,[^}]*rotate\(var\(--mao-angulo,/s)
    expect(css).not.toMatch(/\.duelo-mao__item--inspecionada,[^{]*\{[^}]*\btransform\s*:/s)
  })

  it('no toque curto seleciona e inspeciona; toque fora fecha sem apagar a seleção', () => {
    window.matchMedia = ((consulta: string) => ({ matches: consulta === '(pointer: coarse)', media: consulta, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    montar({ humano: { mao: ['CC-001'] } })
    const carta = cartaMao()
    const toque = { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true, clientX: 80, clientY: 500 }
    fireEvent.pointerDown(carta, toque)
    fireEvent.pointerUp(window, toque)
    fireEvent.click(carta)
    expect(inspecao()?.className).toContain('duelo-inspecao--toque')
    expect(carta.getAttribute('aria-pressed')).toBe('true')
    fireEvent.focus(carta) // o foco sintetizado por navegadores móveis não pode reabrir após o toque externo
    fireEvent.pointerDown(document.body, { pointerId: 2, pointerType: 'touch', button: 0, isPrimary: true })
    expect(inspecao()).toBeNull()
    expect(carta.getAttribute('aria-pressed')).toBe('true')
  })

  it('fecha quando o arrasto realmente arma, sem criar uma segunda rota de comando', () => {
    montar({ humano: { mao: ['CC-001'] } })
    const carta = cartaMao()
    fireEvent.pointerEnter(carta, { pointerType: 'mouse' })
    expect(inspecao()).toBeTruthy()
    fireEvent.pointerDown(carta, { pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true, clientX: 80, clientY: 500 })
    expect(inspecao()).toBeTruthy() // clique simples ainda conserva o hover
    fireEvent.pointerMove(window, { pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true, clientX: 100, clientY: 480 })
    expect(inspecao()).toBeNull()
    fireEvent.pointerUp(window, { pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true, clientX: 100, clientY: 480 })
    expect(screen.queryByRole('dialog', { name: 'Como colocar a unidade?' })).toBeNull()
  })

  it('invalida a inspeção quando a fonte é removida sem mudar a chave guardada', () => {
    const carta = CATALOGO.find((item) => item.id === 'CC-001')!

    function FonteRemovivel() {
      const [removida, setRemovida] = useState(false)
      const [fonte, setFonte] = useState<FonteInspecao | null>(null)
      return (
        <>
          {removida ? null : (
            <button
              type="button"
              className="carta"
              data-inspecionavel="fonte-removivel"
              onPointerEnter={() =>
                setFonte({
                  chave: 'fonte-removivel',
                  conteudo: { oculta: false, carta },
                  gatilho: 'ponteiro',
                })
              }
            >
              Fonte removível
            </button>
          )}
          <button type="button" onClick={() => setRemovida(true)}>
            Remover fonte
          </button>
          {fonte ? <InspecaoCarta fonte={fonte} toque={false} onInvalidar={() => setFonte(null)} /> : null}
        </>
      )
    }

    render(<FonteRemovivel />)
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Fonte removível' }), { pointerType: 'mouse' })
    expect(inspecao()).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remover fonte' }))
    expect(inspecao()).toBeNull()
  })

  it('rederiva ATK/DEF pela mesma chave quando a visão muda com o cursor parado', () => {
    const chave = 'unidade:humano:0'

    function FonteAtualizavel() {
      const [bonus, setBonus] = useState(0)
      const [aberta, setAberta] = useState(false)
      const estado = cenario({ humano: { campo: [{ id: 'CC-001', buffAtk: bonus, buffDef: bonus }] } })
      const visao = visaoParaJogador(estado, 'humano')
      const conteudo = resolverConteudoInspecao(chave, visao, estadoDeVisao(visao))
      const fonte: FonteInspecao | null = aberta && conteudo ? { chave, conteudo, gatilho: 'ponteiro' } : null
      return (
        <>
          <button type="button" className="carta" data-inspecionavel={chave} onPointerEnter={() => setAberta(true)}>
            Fonte persistente
          </button>
          <button type="button" onClick={() => setBonus(300)}>
            Atualizar atributos
          </button>
          {fonte ? <InspecaoCarta fonte={fonte} toque={false} onInvalidar={() => setAberta(false)} /> : null}
        </>
      )
    }

    render(<FonteAtualizavel />)
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Fonte persistente' }), { pointerType: 'mouse' })
    const atkAntes = inspecao()!.querySelector('.carta__atk')!.textContent
    const defAntes = inspecao()!.querySelector('.carta__def')!.textContent
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar atributos' }))
    expect(inspecao()).toBeTruthy()
    expect(inspecao()!.querySelector('.carta__atk')!.textContent).not.toBe(atkAntes)
    expect(inspecao()!.querySelector('.carta__def')!.textContent).not.toBe(defAntes)
  })

  it('rederiva bônus de terreno pela visão atual sem consultar o estado bruto', () => {
    const chave = 'unidade:oponente:0'
    const resolver = (estado: ReturnType<typeof cenario>) => {
      const visao = visaoParaJogador(estado, 'humano')
      return resolverConteudoInspecao(chave, visao, estadoDeVisao(visao))
    }
    const base = resolver(cenario({ oponente: { campo: ['CC-001'] } }))
    const comTerreno = resolver(cenario({ terreno: { id: 'CC-089', dono: 'humano' }, oponente: { campo: ['CC-001'] } }))

    expect(base?.oculta).toBe(false)
    expect(comTerreno?.oculta).toBe(false)
    if (!base || base.oculta || !comTerreno || comTerreno.oculta) throw new Error('esperava unidade pública')
    expect(comTerreno.atk).toBe(base.atk! + 300)
    expect(comTerreno.def).toBe(base.def! + 300)
  })
})

describe('inspeção no campo e ocultação', () => {
  it('rederiva a mesma zona entre visível, oculta e removida sem conservar dados privados', () => {
    const chave = 'unidade:oponente:0'
    const resolver = (estado: ReturnType<typeof cenario>) => {
      const visao = visaoParaJogador(estado, 'humano')
      return resolverConteudoInspecao(chave, visao, estadoDeVisao(visao))
    }
    const visivel = resolver(cenario({ oponente: { campo: ['CC-001'] } }))
    const oculta = resolver(cenario({ oponente: { campo: [{ id: 'CC-001', pos: 'DEFESA', viradaParaBaixo: true }] } }))
    const removida = resolver(cenario({ oponente: { campo: [] } }))

    expect(visivel).toMatchObject({ oculta: false, carta: { id: 'CC-001' } })
    expect(oculta).toEqual({ oculta: true, posicao: 'DEFESA' })
    expect(JSON.stringify(oculta)).not.toMatch(/CC-001|Manguezal|1200|2000|sedimentos|uid/i)
    expect(removida).toBeNull()
  })

  it('mostra carta completa no campo, mas uma unidade oculta do oponente continua somente como verso', () => {
    montar({
      humano: { campo: ['CC-003'] },
      oponente: { campo: [{ id: 'CC-001', pos: 'DEFESA', viradaParaBaixo: true }], suporte: ['CC-095'], mao: ['CC-002'] },
    })
    const propria = screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ })
    fireEvent.pointerEnter(propria, { pointerType: 'mouse' })
    expect(inspecao()?.textContent).toContain(CATALOGO.find((c) => c.id === 'CC-003')!.educacao)

    fireEvent.pointerLeave(propria, { pointerType: 'mouse' })
    const oculta = screen.getByRole('button', { name: /Zona 1 do oponente: unidade virada para baixo/ })
    fireEvent.pointerEnter(oculta, { pointerType: 'mouse' })
    const painel = inspecao()!
    expect(painel.dataset.inspecao).toBe('verso')
    expect(painel.querySelector('.carta--verso')).toBeTruthy()
    expect(painel.querySelector('.carta__nome, .carta__atributos, .duelo-inspecao__detalhes')).toBeNull()
    expect(painel.textContent).not.toContain('Manguezal Protegido')

    fireEvent.pointerLeave(oculta, { pointerType: 'mouse' })
    for (const verso of [document.querySelector<HTMLElement>('.duelo-mao-oponente .carta--verso')!, document.querySelector<HTMLElement>('.duelo-lado--oponente .suporte .carta--verso')!]) {
      fireEvent.pointerEnter(verso, { pointerType: 'mouse' })
      expect(inspecao()?.dataset.inspecao).toBe('verso')
      expect(inspecao()?.querySelector('.duelo-inspecao__detalhes')).toBeNull()
      fireEvent.pointerLeave(verso, { pointerType: 'mouse' })
    }
  })

  it('mantém a defesa do oponente vertical por CSS e o chip DEF legível', () => {
    const css = readFileSync(resolve(__dirname, '../duelo/duelo.css'), 'utf8')
    expect(css).toMatch(/\.duelo-lado--oponente \.carta--campo\.carta--defesa\s*\{[^}]*--rot:\s*rotate\(0deg\);[^}]*height:\s*min\(100cqh,/s)
    expect(css).toMatch(/\.duelo-lado--oponente \.carta--campo\.carta--defesa \.carta__posicao\s*\{[^}]*transform:\s*none;/s)
  })

  it('mostra os chips públicos DEF e ATQ também nos versos adversários', () => {
    montar({
      oponente: {
        campo: [
          { id: 'CC-001', pos: 'DEFESA', viradaParaBaixo: true },
          { id: 'CC-003', pos: 'ATAQUE', viradaParaBaixo: true },
        ],
      },
    })
    const defesa = screen.getByRole('button', { name: /Zona 1 do oponente: unidade virada para baixo, em defesa/ })
    const ataque = screen.getByRole('button', { name: /Zona 2 do oponente: unidade virada para baixo, em ataque/ })
    expect(defesa.querySelector('.carta__posicao')?.textContent).toBe('DEF')
    expect(defesa.querySelector('.carta__posicao svg')).toBeTruthy()
    expect(ataque.querySelector('.carta__posicao')?.textContent).toBe('ATQ')
    expect(ataque.querySelector('.carta__posicao svg')).toBeTruthy()
  })
})
