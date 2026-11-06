// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import type { ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { CartaVerso, CartaView } from '../../components/duelo/CartaView'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { CATALOGO } from '../../data/catalogo'
import { OPONENTES, buscarOponente } from '../../data/oponentes'
import { criarDuelo } from '../../game'
import type { EstadoDuelo } from '../../game'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'
import { TelaDuelo } from '../duelo/TelaDuelo'
import { arrastarAtaque } from './ajudanteAtaque'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const ressaca = buscarOponente('ressaca')!
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome })
const aviso = () => document.querySelector('.duelo-aviso')!.textContent
const carta = (id: string) => CATALOGO.find((c) => c.id === id)!
const confirmarFaceParaCima = () => fireEvent.click(screen.getByRole('button', { name: 'Colocar carta' }))

function montarCenario(cfg: ConfigCenario, atrasoIA = 0, extra: { onVoltar?: () => void; onNovamente?: () => void } = {}) {
  const e: EstadoDuelo = cenario({ humano: { baralho: 20 }, oponente: { baralho: 20, mao: ['CC-001'] }, ...cfg })
  return render(<Partida estadoInicial={e} oponente={ressaca} atrasoIA={atrasoIA} onVoltar={extra.onVoltar ?? (() => {})} onNovamente={extra.onNovamente ?? (() => {})} />)
}

describe('CartaView', () => {
  it('unidade mostra nome, ATK e DEF; rótulo acessível vem de fora', () => {
    render(<CartaView carta={carta('CC-001')} rotulo="Mão 1: Manguezal" />)
    const img = screen.getByRole('img', { name: 'Mão 1: Manguezal' })
    expect(img.textContent).toContain('Manguezal Protegido')
    expect(img.textContent).toContain('1200')
    expect(img.textContent).toContain('2000')
  })

  it('clique chama onClick, e carta inativa ignora', () => {
    const onClick = vi.fn()
    const { rerender } = render(<CartaView carta={carta('CC-001')} rotulo="Carta" onClick={onClick} selecionada={false} />)
    const b = screen.getByRole('button', { name: 'Carta' })
    fireEvent.click(b)
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<CartaView carta={carta('CC-001')} rotulo="Carta" onClick={onClick} inativa />)
    fireEvent.click(screen.getByRole('button', { name: 'Carta' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Carta' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('verso não revela nada', () => {
    render(<CartaVerso rotulo="Carta virada" />)
    const verso = screen.getByRole('img', { name: 'Carta virada' })
    expect(verso.textContent).toBe('')
    const arte = verso.querySelector<HTMLImageElement>('.carta__verso-imagem')!
    expect(arte).toBeTruthy()
    expect(arte.getAttribute('src')).toContain('verso-carta.webp')
    expect(arte.getAttribute('alt')).toBe('')
    expect(arte.getAttribute('aria-hidden')).toBe('true')
    expect(arte.draggable).toBe(false)
  })
})

describe('Partida: leitura do tabuleiro e jogadas', () => {
  it('mostra vida 5000, 5 zonas de unidade por lado (sem faixa de suportes), mão e contadores', () => {
    montarCenario({ humano: { mao: ['CC-001', 'CC-003', 'CC-004', 'CC-006', 'CC-009'], baralho: 35 }, oponente: { mao: ['CC-001'], baralho: 35 } })
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo contra Ressaca' })).toBeTruthy()
    expect(screen.getByLabelText('Sua vida: 5000')).toBeTruthy()
    expect(screen.getByLabelText('Vida do oponente: 5000')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Suas zonas de unidade' }).querySelectorAll('.zona')).toHaveLength(5)
    expect(screen.queryByRole('group', { name: /suporte/i })).toBeNull()
    expect(document.querySelector('.duelo-suportes, .suporte')).toBeNull()
    expect(document.body.textContent).not.toMatch(/suporte|armadilha|equipamento/i)
    expect(screen.getByRole('group', { name: 'Zonas de unidade do oponente' }).querySelectorAll('.zona')).toHaveLength(5)
    expect(screen.getByLabelText('Cartas restantes no baralho: 35')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(5)
    expect(screen.getByText('Seu turno')).toBeTruthy()
    expect(document.querySelector('.duelo-terreno')).toBeNull()
  })

  it('selecionar unidade, USAR CARTA, escolher zona livre e trocar a posição em campo', () => {
    montarCenario({ humano: { mao: ['CC-003', 'CC-004'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    expect(aviso()).toContain('zona livre')
    fireEvent.click(screen.getByRole('button', { name: /Zona 2 sua: vazia/ }))
    confirmarFaceParaCima()
    const z = screen.getByRole('button', { name: /^Zona 2 sua: Recife de Coral, ATK 1600, DEF 1500, em ataque/ })
    expect(z).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(1)
    // já jogou: USAR fica desabilitado com motivo
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    expect(aviso()).toContain('Você já fez a jogada')
    // DEFENDER na unidade selecionada em campo
    fireEvent.click(z)
    fireEvent.click(botao(/Defender/))
    expect(screen.getByRole('button', { name: /Zona 2 sua: Recife de Coral, ATK 1600, DEF 1500, em defesa/ })).toBeTruthy()
  })

  it('a seta sobre a unidade do campo alterna ataque e defesa; bloqueada depois de atacar', () => {
    montarCenario({ humano: { campo: ['CC-003', { id: 'CC-001', atacou: true }] } })
    fireEvent.click(screen.getByRole('button', { name: /Zona 1: mudar Recife de Coral para defesa/ }))
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*em defesa/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Zona 1: mudar Recife de Coral para ataque/ }))
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*em ataque/ })).toBeTruthy()
    const bloqueada = screen.getByRole('button', { name: /Zona 2: mudar Manguezal Protegido para defesa/ })
    expect(bloqueada.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(bloqueada)
    expect(screen.getByRole('button', { name: /Zona 2 sua: Manguezal Protegido.*em ataque/ })).toBeTruthy()
  })

  it('depois de baixar uma carta, as cartas da mão ficam cinza (sem jogada neste turno); antes, não', () => {
    montarCenario({ humano: { mao: ['CC-003', 'CC-004'] } })
    const maoCartas = () => document.querySelector('.duelo-mao__cartas')!
    expect(maoCartas().classList.contains('duelo-mao__cartas--sem-jogada')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    confirmarFaceParaCima()
    expect(maoCartas().classList.contains('duelo-mao__cartas--sem-jogada')).toBe(true)
  })

  it('DEFENDER com unidade da mão escolhe a posição de entrada', () => {
    montarCenario({ humano: { mao: ['CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Defender/))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    confirmarFaceParaCima()
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*em defesa/ })).toBeTruthy()
  })

  it('após escolher a zona, oferece por teclado as duas faces e permite baixar virada para baixo', () => {
    montarCenario({ humano: { mao: ['CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    const dialogo = screen.getByRole('dialog', { name: /^Colocar / })
    expect(dialogo.textContent).toContain('Posição de ataque')
    expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Colocar carta' }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Virar a carta para baixo' }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Colocar carta' }))
    expect(screen.queryByRole('dialog', { name: /^Colocar / })).toBeNull()
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*virada para baixo/ }).className).toContain('carta--verso')
    expect(document.querySelector('[role="log"]')?.textContent).toContain('virada para baixo em ataque')
  })

  it('a prévia mostra a carta grande com a seta à direita; a seta vira a carta para baixo e de volta para cima', () => {
    montarCenario({ humano: { mao: ['CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    const previa = screen.getByRole('dialog', { name: /^Colocar / })
    expect(previa.querySelector('.previa-colocacao__carta')?.getAttribute('data-face')).toBe('cima')
    expect(screen.queryByText('Como colocar a unidade?')).toBeNull()
    fireEvent.click(within(previa).getByRole('button', { name: 'Virar a carta para baixo' }))
    expect(previa.querySelector('.previa-colocacao__carta')?.getAttribute('data-face')).toBe('baixo')
    fireEvent.click(within(previa).getByRole('button', { name: 'Virar a carta para cima (seta esquerda)' }))
    expect(previa.querySelector('.previa-colocacao__carta')?.getAttribute('data-face')).toBe('cima')
    fireEvent.click(within(previa).getByRole('button', { name: 'Virar a carta para baixo (seta esquerda)' }))
    expect(previa.querySelector('.previa-colocacao__carta')?.getAttribute('data-face')).toBe('baixo')
    fireEvent.click(within(previa).getByRole('button', { name: 'Virar a carta para cima' }))
    expect(previa.querySelector('.previa-colocacao__carta')?.getAttribute('data-face')).toBe('cima')
  })

  it('prende o foco no diálogo de face e Esc cancela sem jogar a carta', () => {
    montarCenario({ humano: { mao: ['CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    const zona = screen.getByRole('button', { name: /Zona 1 sua: vazia/ })
    fireEvent.click(zona)
    const dialogo = screen.getByRole('dialog', { name: /^Colocar / })
    const cima = within(dialogo).getByRole('button', { name: 'Virar a carta para baixo (seta esquerda)' }) // primeiro foco da ordem de Tab
    const cancelar = within(dialogo).getByRole('button', { name: 'Cancelar' })
    cancelar.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(cima)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancelar)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /^Colocar / })).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Zona 1 sua: vazia/ })).toBeTruthy()
    expect(document.activeElement).toBe(zona)
  })

  it('ataque: escolhe atacante e alvo, aplica dano e mostra vida atualizada', () => {
    montarCenario({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], mao: ['CC-001'] } })
    const atacante = screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ })
    const alvo = screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido/ })
    arrastarAtaque(atacante, alvo)
    expect(screen.getByLabelText('Vida do oponente: 4600')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Zona 1 do oponente/ })).toBeNull() // zona esvaziada
  })

  it('ataque direto só aparece quando o oponente não tem unidades', () => {
    montarCenario({ jogadaFeita: true, humano: { campo: ['CC-003'] } })
    arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ }), screen.getByLabelText('Vida do oponente: 5000'))
    expect(screen.getByLabelText('Vida do oponente: 3400')).toBeTruthy()
  })

  it('sem botão ATACAR, unidades ilegais não iniciam a seta no primeiro turno nem antes da jogada', () => {
    montarCenario({ turno: 1, humano: { mao: ['CC-001'], campo: ['CC-003'] } })
    expect(document.getElementById('b-atacar')).toBeNull()
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ }).className).not.toContain('carta--arrastavel')
    cleanup()
    montarCenario({ humano: { mao: ['CC-001'], campo: ['CC-003'] } })
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ }).className).not.toContain('carta--arrastavel')
    expect(screen.getByLabelText('Vida do oponente: 5000')).toBeTruthy()
  })

  it('ENCERRAR TURNO exige a jogada e depois aciona a IA (sem atraso) devolvendo a vez', () => {
    montarCenario({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } })
    fireEvent.click(botao(/Encerrar turno/))
    expect(aviso()).toContain('jogada da mão')
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    confirmarFaceParaCima()
    fireEvent.click(botao(/Encerrar turno/))
    expect(screen.getByText('Seu turno')).toBeTruthy()
    expect(document.querySelector('.duelo-turno__rotulo')!.textContent).toBe('Rodada 3')
    expect(screen.getByText('Oponente coloca uma unidade virada para baixo em defesa.')).toBeTruthy() // evento público sanitizado do turno da IA
    expect(screen.queryByText(/Oponente invoca/)).toBeNull()
    expect(screen.getByLabelText(/Cartas restantes no baralho: 25/)).toBeTruthy()
  })

  it('turno da IA é reproduzido com atraso, bloqueando a entrada, e termina devolvendo a vez', () => {
    vi.useFakeTimers()
    montarCenario({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } }, 100)
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    confirmarFaceParaCima()
    fireEvent.click(botao(/Encerrar turno/))
    expect(screen.getByText('Turno do oponente')).toBeTruthy()
    fireEvent.click(botao(/Encerrar turno/))
    expect(aviso()).toContain('Aguarde a sua vez')
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText('Turno do oponente')).toBeTruthy() // ainda reproduzindo
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('Seu turno')).toBeTruthy()
  })
})

describe('Partida: informação oculta', () => {
  const secretas = ['Elevação do Nível do Mar', 'Contaminação Industrial', 'Tratamento de Esgoto']

  it('mão do oponente não aparece no DOM (nomes, IDs, atributos)', () => {
    const { container } = montarCenario({
      humano: { mao: ['CC-001'] },
      oponente: { mao: ['CC-071', 'CC-068', 'CC-012'], baralho: 20 },
    })
    const html = container.innerHTML
    for (const nome of secretas) expect(html).not.toContain(nome)
    for (const id of ['CC-071', 'CC-068', 'CC-012']) expect(html).not.toContain(id)
    expect(html).not.toMatch(/data-uid|data-carta|"uid"/)
    expect(screen.getByRole('group', { name: 'Mão do oponente: 3 cartas' })).toBeTruthy()
  })

  it('unidade adversária oculta mostra só o verso, continua atacável e revela antes do combate', () => {
    const { container } = montarCenario({
      fase: 'COMBATE',
      jogadaFeita: true,
      humano: { campo: ['CC-001'] },
      oponente: { campo: [{ id: 'CC-056', viradaParaBaixo: true }], mao: ['CC-002'] },
    })
    expect(container.innerHTML).not.toContain('Derramamento de Óleo')
    const oculta = screen.getByRole('button', { name: /Zona 1 do oponente: unidade virada para baixo, em ataque/ })
    expect(oculta.className).toContain('carta--verso')
    arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Manguezal Protegido.*pode atacar/ }), oculta)
    expect(screen.getByRole('button', { name: /Zona 1 do oponente: Derramamento de Óleo, ATK 2200, DEF 700/ })).toBeTruthy()
    expect(screen.getByLabelText('Sua vida: 4000')).toBeTruthy()
  })

  it('o log só traz eventos públicos: compras do oponente não vazam', () => {
    const { container } = montarCenario(
      { humano: { mao: ['CC-003'], campo: [null, 'CC-071'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-001', 'CC-001', 'CC-001', 'CC-001'], baralho: 30 } },
    )
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    confirmarFaceParaCima()
    fireEvent.click(botao(/Encerrar turno/))
    expect(container.innerHTML).not.toContain('Manguezal Protegido')
    expect(container.innerHTML).not.toContain('CC-001')
  })

  it('em um duelo real semeado, nenhum nome exclusivo da mão do oponente aparece antes de ser jogado', () => {
    const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: BARALHOS_OPONENTES['ressaca'] as string[], seed: 21 })
    if (!r.ok) throw new Error('x')
    const e = r.estado
    const minhas = new Set([...e.jogadores.humano.mao, ...e.jogadores.humano.baralho].map((c) => c.cartaId))
    const exclusivos = e.jogadores.oponente.mao.map((c) => c.cartaId).filter((id) => !minhas.has(id))
    expect(exclusivos.length).toBeGreaterThan(0)
    const { container } = render(<TelaDuelo oponenteId="ressaca" seedInicial={21} atrasoIA={0} onVoltar={() => {}} />)
    for (const id of exclusivos) expect(container.innerHTML).not.toContain(carta(id).nome)
  })
})

describe('Partida: desistência, resultado e jogar novamente', () => {
  it('DESISTIR pede confirmação; cancelar mantém o duelo; confirmar mostra DERROTA com o motivo', () => {
    montarCenario({ humano: { mao: ['CC-003'] } })
    fireEvent.click(botao('Desistir'))
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    fireEvent.click(botao('Continuar jogando'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    const d = screen.getByRole('dialog')
    expect(within(d).getByRole('heading', { name: 'Derrota' })).toBeTruthy()
    expect(d.textContent).toContain('Você desistiu do duelo.')
    expect(d.textContent).toContain('para ganhar uma carta para a sua coleção.')
  })

  it('Esc abre a confirmação e Esc de novo a fecha', () => {
    montarCenario({ humano: { mao: ['CC-003'] } })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('vitória por vida zerada mostra VITÓRIA e até 3 conceitos das cartas jogadas', () => {
    const onVoltar = vi.fn()
    montarCenario({ jogadaFeita: false, humano: { mao: ['CC-001', 'CC-003'], campo: ['CC-056'], baralho: 20 }, oponente: { lp: 1000, mao: ['CC-001'] } }, 0, { onVoltar })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia|Zona 2 sua: vazia/ }))
    confirmarFaceParaCima()
    arrastarAtaque(screen.getByRole('button', { name: /Zona 1 sua: Derramamento de Óleo.*pode atacar/ }), screen.getByLabelText('Vida do oponente: 1000'))
    const d = screen.getByRole('dialog')
    expect(within(d).getByRole('heading', { name: 'Vitória' })).toBeTruthy()
    expect(d.textContent).toContain('chegou a zero')
    expect(within(d).getByText('Para aprender')).toBeTruthy()
    expect(d.querySelectorAll('li').length).toBeGreaterThanOrEqual(1)
    expect(d.querySelectorAll('li').length).toBeLessThanOrEqual(3)
    fireEvent.click(within(d).getByRole('button', { name: 'Voltar' }))
    expect(onVoltar).toHaveBeenCalled()
  })

  it('JOGAR NOVAMENTE reinicia contra o mesmo adversário com nova seed (duelo novo, vida cheia)', () => {
    render(<TelaDuelo oponenteId="porto" seedInicial={5} atrasoIA={0} onVoltar={() => {}} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo contra Porto' })).toBeTruthy()
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    fireEvent.click(botao('Jogar novamente'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo contra Porto' })).toBeTruthy()
    expect(screen.getByLabelText('Sua vida: 5000')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(5)
    expect(screen.getByLabelText('Cartas restantes no baralho: 25')).toBeTruthy()
  })
})

describe('Integração com o Duelo Livre', () => {
  const usuario: UsuarioAutenticado = {
    id: 'u1',
    email: 'ana@exemplo.com',
    baralho: [...BARALHO_INICIAL].reverse(),
    colecao: [],
  }

  it('logado sem baralho no perfil: INICIAR DUELO usa o baralho inicial e VOLTAR retorna ao Duelo Livre mantendo o adversário', async () => {
    const servico: ServicoAuth = { entrar: vi.fn().mockResolvedValue({ ok: true, usuario: { id: 'u2', email: 'bia@exemplo.com' } }) }
    // Porto é o 12º da ordem: libera os anteriores para poder escolhê-lo.
    localStorage.setItem('costa-clash:derrotados:u2', JSON.stringify(OPONENTES.slice(0, 11).map((o) => o.id)))
    render(<App servicoAuth={servico} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'bia@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-valida-1' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })
    fireEvent.click(screen.getByRole('radio', { name: 'Porto' }))
    fireEvent.click(botao('Iniciar duelo'))
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo contra Porto' })).toBeTruthy()
    expect(screen.queryByText(/Em breve — o duelo/)).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(5)
    fireEvent.click(botao('Desistir'))
    fireEvent.click(botao('Confirmar'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Porto' }).getAttribute('aria-checked')).toBe('true')
  })

  it('logado: usa o baralho do perfil, e Esc leva ao Duelo Livre sem perder a sessão', async () => {
    const servico: ServicoAuth = { entrar: vi.fn().mockResolvedValue({ ok: true, usuario }) }
    render(<App servicoAuth={servico} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-valida-1' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByRole('heading', { level: 1, name: 'Duelo Livre' })
    fireEvent.click(botao('Iniciar duelo'))
    expect(screen.getByRole('heading', { level: 1, name: /Duelo contra/ })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' }) // abre confirmação
    fireEvent.click(botao('Desistir'.length ? 'Confirmar' : ''))
    fireEvent.keyDown(window, { key: 'Escape' }) // resultado: Esc volta
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    expect(botao('Sair')).toBeTruthy()
    fireEvent.click(botao('Baralho'))
    expect(screen.getByRole('dialog', { name: 'Baralho' }).textContent).toContain('ainda não tem cartas')
  })

  it('baralho inválido do perfil mostra erro claro e permite voltar, sem quebrar', () => {
    const ruim: UsuarioAutenticado = { id: 'u2', email: 'b@x.com', baralho: Array<string>(40).fill('CC-001'), colecao: [] }
    const onVoltar = vi.fn()
    render(<TelaDuelo oponenteId="ressaca" usuario={ruim} seedInicial={1} onVoltar={onVoltar} />)
    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Não foi possível iniciar o duelo')
    expect(alerta.textContent).toContain('CC-001')
    fireEvent.click(botao('Voltar'))
    expect(onVoltar).toHaveBeenCalled()
  })

  it('Oceano Limpo possui baralho válido e inicia uma partida real', () => {
    render(<TelaDuelo oponenteId="oceano-limpo" seedInicial={27} atrasoIA={0} onVoltar={() => {}} />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo contra Oceano Limpo' })).toBeTruthy()
    expect(screen.getByLabelText('Sua vida: 5000')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(5)
  })

  it('adversário inexistente também não quebra a tela', () => {
    render(<TelaDuelo oponenteId="nao-existe" seedInicial={1} onVoltar={() => {}} />)
    expect(screen.getByRole('alert').textContent).toContain('Adversário não encontrado')
  })
})
