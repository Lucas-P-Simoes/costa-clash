// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import type { ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'
import { CartaVerso, CartaView } from '../../components/duelo/CartaView'
import { efeitoCurto } from '../../components/duelo/textoCarta'
import { BARALHO_INICIAL } from '../../data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../../data/baralhosOponentes'
import { CATALOGO } from '../../data/catalogo'
import { buscarOponente } from '../../data/oponentes'
import { criarDuelo } from '../../game'
import type { EstadoDuelo } from '../../game'
import { cenario } from '../../game/__tests__/util'
import type { ConfigCenario } from '../../game/__tests__/util'
import { Partida } from '../duelo/Partida'
import { TelaDuelo } from '../duelo/TelaDuelo'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const ressaca = buscarOponente('ressaca')!
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome })
const aviso = () => document.querySelector('.duelo-aviso')!.textContent
const carta = (id: string) => CATALOGO.find((c) => c.id === id)!

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

  it('ação mostra tipo e efeito curto (sem ATK/DEF); clique chama onClick, e inativa ignora', () => {
    const onClick = vi.fn()
    const { rerender } = render(<CartaView carta={carta('CC-073')} rotulo="Carta" onClick={onClick} selecionada={false} />)
    const b = screen.getByRole('button', { name: 'Carta' })
    expect(b.textContent).toContain('Ação')
    expect(b.textContent).toContain('Reduz ATK e DEF de 1 unidade inimiga Impacto em 500')
    expect(b.textContent).not.toContain('ATK1')
    fireEvent.click(b)
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<CartaView carta={carta('CC-073')} rotulo="Carta" onClick={onClick} inativa />)
    fireEvent.click(screen.getByRole('button', { name: 'Carta' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Carta' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('verso não revela nada; todo efeito do catálogo tem texto curto', () => {
    render(<CartaVerso rotulo="Carta virada" />)
    expect(screen.getByRole('img', { name: 'Carta virada' }).textContent).toBe('')
    for (const c of CATALOGO.filter((x) => x.tipo !== 'unidade')) expect(efeitoCurto(c).length).toBeGreaterThan(10)
  })
})

describe('Partida: leitura do tabuleiro e jogadas', () => {
  it('mostra vida 8000, 5 zonas de unidade e 5 de suporte por lado, mão e contadores', () => {
    montarCenario({ humano: { mao: ['CC-001', 'CC-003', 'CC-077', 'CC-093', 'CC-089'], baralho: 35 }, oponente: { mao: ['CC-001'], baralho: 35 } })
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo contra Ressaca' })).toBeTruthy()
    expect(screen.getByLabelText('Sua vida: 8000')).toBeTruthy()
    expect(screen.getByLabelText('Vida do oponente: 8000')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Suas zonas de unidade' }).querySelectorAll('.zona')).toHaveLength(5)
    expect(screen.getByRole('group', { name: 'Suas zonas de suporte' }).querySelectorAll('.suporte')).toHaveLength(5)
    expect(screen.getByRole('group', { name: 'Zonas de unidade do oponente' }).querySelectorAll('.zona')).toHaveLength(5)
    expect(screen.getByLabelText('Cartas restantes no baralho: 35')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(5)
    expect(screen.getByText('Seu turno')).toBeTruthy()
    expect(document.querySelector('.duelo-terreno')!.textContent).toContain('nenhum')
  })

  it('selecionar unidade, USAR CARTA, escolher zona livre e trocar a posição em campo', () => {
    montarCenario({ humano: { mao: ['CC-003', 'CC-077'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    expect(aviso()).toContain('zona livre')
    fireEvent.click(screen.getByRole('button', { name: /Zona 2 sua: vazia/ }))
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

  it('DEFENDER com unidade da mão escolhe a posição de entrada', () => {
    montarCenario({ humano: { mao: ['CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Defender/))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    expect(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*em defesa/ })).toBeTruthy()
  })

  it('ação com alvo: destaca alvos válidos, rejeita inválidos e aplica o efeito pelo motor', () => {
    montarCenario({ humano: { mao: ['CC-077'], campo: ['CC-001', 'CC-003'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    expect(screen.getByRole('button', { name: /Zona 1 sua: Manguezal Protegido.*alvo válido/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Zona 2 sua: Recife de Coral.*alvo válido/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Zona 2 sua: Recife de Coral/ }))
    expect(screen.getByRole('button', { name: /Zona 2 sua: Recife de Coral, ATK 2000, DEF 1900/ })).toBeTruthy() // +400
  })

  it('ação sem alvo válido fica desabilitada com o motivo; descarte forçado quando nada é jogável', () => {
    montarCenario({ humano: { mao: ['CC-075', 'CC-073'] } })
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    const usar = botao(/Usar carta/)
    expect(usar.getAttribute('aria-disabled')).toBe('true')
    expect(document.getElementById('b-usar-motivo')!.textContent).toBeTruthy()
    // sem jogada legal: botão DESCARTAR CARTA aparece e funciona
    fireEvent.click(botao(/Descartar carta/))
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(1)
    expect(screen.getByText(/descarta Fiscalização Ambiental/)).toBeTruthy()
  })

  it('ataque: escolhe atacante e alvo, aplica dano e mostra vida atualizada', () => {
    montarCenario({ jogadaFeita: true, humano: { campo: ['CC-003'] }, oponente: { campo: ['CC-001'], mao: ['CC-001'] } })
    fireEvent.click(botao(/^Atacar/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido.*/ })) // sem atacante ainda
    expect(aviso()).toContain('atacante')
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral.*pode atacar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 do oponente: Manguezal Protegido.*alvo válido/ }))
    expect(screen.getByLabelText('Vida do oponente: 7600')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Zona 1 do oponente/ })).toBeNull() // zona esvaziada
  })

  it('ataque direto só aparece quando o oponente não tem unidades', () => {
    montarCenario({ jogadaFeita: true, humano: { campo: ['CC-003'] } })
    fireEvent.click(botao(/^Atacar/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Recife de Coral/ }))
    fireEvent.click(botao(/Ataque direto/))
    expect(screen.getByLabelText('Vida do oponente: 6400')).toBeTruthy()
  })

  it('ATACAR no primeiro turno e antes da jogada da mão mostra o motivo, sem alterar nada', () => {
    montarCenario({ turno: 1, humano: { mao: ['CC-001'], campo: ['CC-003'] } })
    fireEvent.click(botao(/^Atacar/))
    expect(aviso()).toContain('primeiro turno')
    cleanup()
    montarCenario({ humano: { mao: ['CC-001'], campo: ['CC-003'] } })
    fireEvent.click(botao(/^Atacar/))
    expect(aviso()).toContain('jogada da mão')
    expect(screen.getByLabelText('Vida do oponente: 8000')).toBeTruthy()
  })

  it('ENCERRAR TURNO exige a jogada e depois aciona a IA (sem atraso) devolvendo a vez', () => {
    montarCenario({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } })
    fireEvent.click(botao(/Encerrar turno/))
    expect(aviso()).toContain('jogada da mão')
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(botao(/Encerrar turno/))
    expect(screen.getByText('Seu turno')).toBeTruthy()
    expect(document.querySelector('.duelo-turno__rotulo')!.textContent).toBe('Rodada 3')
    expect(screen.getByText(/Oponente invoca/)).toBeTruthy() // evento público do turno da IA no registro
    expect(screen.getByLabelText(/Cartas restantes no baralho: 25/)).toBeTruthy()
  })

  it('turno da IA é reproduzido com atraso, bloqueando a entrada, e termina devolvendo a vez', () => {
    vi.useFakeTimers()
    montarCenario({ humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-001', 'CC-002', 'CC-004', 'CC-005', 'CC-006'], baralho: 30 } }, 100)
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
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
  const secretas = ['Elevação do Nível do Mar', 'Contaminação Industrial', 'Proteção Emergencial', 'Plano de Contingência']

  it('mão e armadilhas do oponente não aparecem no DOM (nomes, IDs, atributos)', () => {
    const { container } = montarCenario({
      humano: { mao: ['CC-001'] },
      oponente: { mao: ['CC-071', 'CC-068', 'CC-095'], suporte: ['CC-099'], baralho: 20 },
    })
    const html = container.innerHTML
    for (const nome of secretas) expect(html).not.toContain(nome)
    for (const id of ['CC-071', 'CC-068', 'CC-095', 'CC-099']) expect(html).not.toContain(id)
    expect(html).not.toMatch(/data-uid|data-carta|"uid"/)
    expect(screen.getByRole('group', { name: 'Mão do oponente: 3 cartas' })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Suporte 1 do oponente: carta virada para baixo/ })).toBeTruthy()
  })

  it('as próprias armadilhas aparecem para o dono; as do oponente só com `revelar`', () => {
    const { container, unmount } = montarCenario({ humano: { suporte: ['CC-099'] }, oponente: { suporte: ['CC-095'], mao: ['CC-001'] } })
    expect(container.innerHTML).toContain('Proteção Emergencial')
    expect(container.innerHTML).not.toContain('Plano de Contingência')
    unmount()
    const c2 = montarCenario({ revelacao: 'humano', oponente: { suporte: ['CC-095'], mao: ['CC-001'] } })
    expect(c2.container.innerHTML).toContain('Plano de Contingência')
  })

  it('o log só traz eventos públicos: compras e armadilhas colocadas pelo oponente não vazam', () => {
    const { container } = montarCenario(
      { humano: { mao: ['CC-003'], baralho: 30 }, oponente: { mao: ['CC-099', 'CC-099', 'CC-099', 'CC-099', 'CC-099'], baralho: 30 } },
    )
    fireEvent.click(screen.getByRole('button', { name: /^Mão 1:/ }))
    fireEvent.click(botao(/Usar carta/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: vazia/ }))
    fireEvent.click(botao(/Encerrar turno/))
    expect(container.innerHTML).not.toContain('Proteção Emergencial')
    expect(container.innerHTML).not.toContain('CC-099')
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
    expect(d.textContent).toContain('em breve')
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
    fireEvent.click(botao(/^Atacar/))
    fireEvent.click(screen.getByRole('button', { name: /Zona 1 sua: Derramamento de Óleo.*pode atacar/ }))
    fireEvent.click(botao(/Ataque direto/))
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
    expect(screen.getByLabelText('Sua vida: 8000')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Mão \d/ })).toHaveLength(5)
    expect(screen.getByLabelText('Cartas restantes no baralho: 35')).toBeTruthy()
  })
})

describe('Integração com o Duelo Livre', () => {
  const usuario: UsuarioAutenticado = {
    id: 'u1',
    email: 'ana@exemplo.com',
    baralho: [...BARALHO_INICIAL].reverse(),
    colecao: [],
  }

  it('logado sem baralho no perfil: DUELO usa o baralho inicial e VOLTAR retorna ao Duelo Livre mantendo o adversário', async () => {
    const servico: ServicoAuth = { entrar: vi.fn().mockResolvedValue({ ok: true, usuario: { id: 'u2', email: 'bia@exemplo.com' } }) }
    render(<App servicoAuth={servico} />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'bia@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-valida-1' } })
    fireEvent.submit(document.querySelector('form')!)
    await screen.findByText(/Conectado como bia@exemplo.com/)
    fireEvent.click(botao('Duelo livre'))
    fireEvent.click(screen.getByRole('radio', { name: 'Porto' }))
    fireEvent.click(botao('Duelo'))
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
    await screen.findByText(/Conectado como ana@exemplo.com/)
    fireEvent.click(botao('Duelo livre'))
    fireEvent.click(botao('Duelo'))
    expect(screen.getByRole('heading', { level: 1, name: /Duelo contra/ })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' }) // abre confirmação
    fireEvent.click(botao('Desistir'.length ? 'Confirmar' : ''))
    fireEvent.keyDown(window, { key: 'Escape' }) // resultado: Esc volta
    expect(screen.getByRole('heading', { level: 1, name: 'Duelo Livre' })).toBeTruthy()
    fireEvent.click(botao('Voltar'))
    expect(screen.getByText(/Conectado como ana@exemplo.com/)).toBeTruthy()
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

  it('adversário inexistente também não quebra a tela', () => {
    render(<TelaDuelo oponenteId="nao-existe" seedInicial={1} onVoltar={() => {}} />)
    expect(screen.getByRole('alert').textContent).toContain('Adversário não encontrado')
  })
})
