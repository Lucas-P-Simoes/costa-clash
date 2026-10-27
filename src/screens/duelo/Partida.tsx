import { useEffect, useMemo, useRef, useState } from 'react'
import { BannerTurno } from '../../components/duelo/BannerTurno'
import { BotaoAcao } from '../../components/duelo/BotaoAcao'
import { CabecalhoDuelo } from '../../components/duelo/CabecalhoDuelo'
import { CartaVerso, CartaView } from '../../components/duelo/CartaView'
import { DicaEducativa } from '../../components/duelo/DicaEducativa'
import { FaixaTerreno } from '../../components/duelo/FaixaTerreno'
import { IconeEscudo, IconeRelogioPixel } from '../../components/duelo/iconesDuelo'
import { PainelJogador } from '../../components/duelo/PainelJogador'
import { chaveZona, useEfeitosVisuais } from '../../components/duelo/efeitosVisuais'
import { useFocoDialogo } from '../../components/duelo/useFocoDialogo'
import { descricaoCarta } from '../../components/duelo/textoCarta'
import { IconeCartas, IconeEspadas } from '../../components/ui/Icones'
import { MolduraOrnamentada } from '../../components/ui/MolduraOrnamentada'
import { CATALOGO } from '../../data/catalogo'
import type { Oponente } from '../../data/oponentes'
import {
  analisarAcao,
  aplicarComando,
  atkEfetivo,
  ataquesLegais,
  defEfetiva,
  executarTurnoIAComPassos,
  jogadasLegais,
  logPublico,
  mapaCatalogo,
  validarJogarCarta,
  visaoParaJogador,
} from '../../game'
import type { Comando, ComandoJogarCarta, EstadoDuelo, IdJogador, PassoIA, Posicao, UnidadeEmCampo, VisaoDuelo } from '../../game'
import { estadoDeVisao } from '../../game/visao'
import { ResultadoDuelo } from './ResultadoDuelo'
import './duelo.css'

const cat = mapaCatalogo(CATALOGO)

type Modo = null | { tipo: 'zona' } | { tipo: 'alvo'; alvos: number[]; dono: IdJogador } | { tipo: 'atacar'; atacante?: number }
interface Aviso {
  /** Turno em que o aviso foi dado: outro turno = aviso vencido (não é mostrado). */
  turno: number
  texto: string
  erro: boolean
}

interface Props {
  estadoInicial: EstadoDuelo
  oponente: Oponente
  onVoltar: () => void
  onNovamente: () => void
  /** Atraso (ms) entre os passos do turno da IA; 0 = sem animação. */
  atrasoIA: number
}

function DialogoDesistir({ onConfirmar, onCancelar }: { onConfirmar: () => void; onCancelar: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref, 'b-desistir')
  return (
    <div className="duelo-overlay">
      <div ref={ref} className="duelo-dialogo moldura textura-pedra" role="alertdialog" aria-modal="true" aria-labelledby="duelo-desistir-titulo">
        <h2 id="duelo-desistir-titulo" className="duelo-dialogo__titulo duelo-dialogo__titulo--pequeno">
          Desistir do duelo?
        </h2>
        <p className="duelo-dialogo__motivo">Você perde esta partida. Nada é salvo.</p>
        <div className="duelo-dialogo__botoes">
          <button type="button" className="botao botao--primario" onClick={onConfirmar}>
            <span>Confirmar</span>
          </button>
          <button type="button" className="botao botao--secundario" data-foco-inicial onClick={onCancelar}>
            <span>Continuar jogando</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function DialogoFaceUnidade({
  posicao,
  onEscolher,
  onCancelar,
}: {
  posicao: Posicao
  onEscolher: (viradaParaBaixo: boolean) => void
  onCancelar: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocoDialogo(ref, 'b-usar')
  return (
    <div className="duelo-overlay">
      <div ref={ref} className="duelo-dialogo moldura textura-pedra" role="dialog" aria-modal="true" aria-labelledby="duelo-face-titulo" aria-describedby="duelo-face-descricao">
        <h2 id="duelo-face-titulo" className="duelo-dialogo__titulo duelo-dialogo__titulo--pequeno">
          Como colocar a unidade?
        </h2>
        <p id="duelo-face-descricao" className="duelo-dialogo__motivo">
          Posição {posicao === 'ATAQUE' ? 'de ataque' : 'de defesa'}. Escolha a face da carta.
        </p>
        <div className="duelo-dialogo__botoes">
          <button type="button" className="botao botao--primario" data-foco-inicial onClick={() => onEscolher(false)}>
            <span>Virada para cima</span>
          </button>
          <button type="button" className="botao botao--primario" onClick={() => onEscolher(true)}>
            <span>Virada para baixo</span>
          </button>
          <button type="button" className="botao botao--secundario" onClick={onCancelar}>
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Tela do duelo. Toda regra vem do motor (`src/game`); aqui só há seleção, modos guiados e apresentação. */
export function Partida({ estadoInicial, oponente, onVoltar, onNovamente, atrasoIA }: Props) {
  const [estado, setEstado] = useState(estadoInicial)
  const [reproduzindo, setReproduzindo] = useState(false)
  const [sel, setSel] = useState<{ mao?: string; unidade?: number }>({})
  const [modoRaw, setModo] = useState<Modo>(null)
  const [posPend, setPosPend] = useState<Posicao>('ATAQUE')
  const [avisoBruto, setAviso] = useState<Aviso | null>(null)
  const [confirma, setConfirma] = useState(false)
  const [colocacaoPendente, setColocacaoPendente] = useState<ComandoJogarCarta | null>(null)
  const [foco, setFoco] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  // Estado verdadeiro do motor ao fim do turno da IA (o exibido pode estar num passo intermediário).
  const finalIA = useRef<EstadoDuelo | null>(null)
  const pedidoFoco = useRef<string | null>(null)

  useEffect(() => {
    const t = timers.current
    return () => t.forEach((x) => window.clearTimeout(x))
  }, [])

  // Fim de duelo encerra qualquer modo guiado (o botão não pode ficar em "cancelar ataque" atrás do diálogo).
  const modo = estado.resultado ? null : modoRaw
  const v: VisaoDuelo = useMemo(() => visaoParaJogador(estado, 'humano'), [estado])
  const plano = useMemo(() => estadoDeVisao(v), [v])
  const log = useMemo(() => logPublico(estado, 'humano'), [estado])
  // Aviso/motivo antigo não atravessa a troca de turno (ex.: "Aguarde a sua vez." no início do turno seguinte).
  const aviso = avisoBruto && avisoBruto.turno === estado.turno ? avisoBruto : null
  const minhaVez = estado.ativo === 'humano' && !estado.resultado && !reproduzindo
  const legais = useMemo(() => (minhaVez ? jogadasLegais(estado) : []), [estado, minhaVez])
  const ataques = useMemo(() => (minhaVez && estado.fase === 'COMBATE' ? ataquesLegais(estado) : []), [estado, minhaVez])
  const mao = v.eu.mao
  const cartaSel = sel.mao ? cat.get(mao.find((c) => c.uid === sel.mao)?.cartaId ?? '') : undefined
  const podeSeguir = estado.jogadaFeita || mao.length === 0
  const soDescarte = legais.length > 0 && legais.every((c) => c.tipo === 'descartar')

  function dizer(texto: string, erro = false) {
    setAviso({ texto, erro, turno: estado.turno })
  }

  // ---------------------------------------------------------------- envio de comandos e turno da IA
  function cancelarReproducao() {
    timers.current.forEach((x) => window.clearTimeout(x))
    timers.current = []
    setReproduzindo(false)
  }

  function reproduzir(passos: PassoIA[]) {
    const ultimo = passos[passos.length - 1]
    if (!ultimo) return
    finalIA.current = ultimo.estado
    pedidoFoco.current = '.duelo-mao__cartas button'
    if (atrasoIA <= 0) {
      setEstado(ultimo.estado)
      return
    }
    setReproduzindo(true)
    passos.forEach((p, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setEstado(p.estado)
          if (i === passos.length - 1) {
            setReproduzindo(false)
            pedidoFoco.current = '.duelo-mao__cartas button'
          }
        }, atrasoIA * (i + 1)),
      )
    })
  }

  /** Desistir vale mesmo durante a reprodução: cancela os timers e parte do estado final real do motor. */
  function desistirAgora() {
    const base = finalIA.current && reproduzindo ? finalIA.current : estado
    cancelarReproducao()
    finalIA.current = null
    const r = aplicarComando(base, { tipo: 'desistir', jogador: 'humano' })
    setSel({})
    setModo(null)
    setAviso(null)
    setEstado(r.estado) // se a IA já tinha encerrado a partida, `base` (com resultado) é mantido
  }

  function enviar(cmd: Comando): boolean {
    const r = aplicarComando(estado, cmd)
    if (!r.ok) {
      dizer(r.erro, true)
      return false
    }
    setAviso(null)
    setSel({})
    setModo(null)
    setFoco(null)
    setEstado(r.estado)
    pedidoFoco.current = cmd.tipo === 'atacar' || cmd.tipo === 'avancarFase' ? null : '#b-encerrar'
    if (!r.estado.resultado && r.estado.ativo === 'oponente') {
      pedidoFoco.current = null
      const ia = executarTurnoIAComPassos(r.estado)
      if (ia.ok) reproduzir(ia.passos)
      else dizer(ia.erro, true)
    }
    return true
  }

  /** Única entrada da UI para colocar unidade: clique/teclado e arrasto passam pela mesma escolha de face. */
  function enviarOuEscolherFace(cmd: Comando): boolean {
    if (cmd.tipo === 'jogarCarta' && cartaDoUid(cmd.uid)?.tipo === 'unidade') {
      setColocacaoPendente(cmd)
      return true
    }
    return enviar(cmd)
  }

  // ---------------------------------------------------------------- motivos (botões desabilitados)
  function motivoUsarDe(uid: string | undefined): string | null {
    const carta = uid ? cat.get(mao.find((c) => c.uid === uid)?.cartaId ?? '') : undefined
    if (!minhaVez) return 'Aguarde a sua vez.'
    if (estado.fase !== 'PRINCIPAL') return 'A jogada da mão só vale na fase principal.'
    if (estado.jogadaFeita) return 'Você já fez a jogada da mão neste turno.'
    if (!carta || !uid) return 'Selecione uma carta da mão.'
    if (legais.some((c) => c.tipo === 'jogarCarta' && c.uid === uid)) return null
    if (soDescarte) return 'Nenhuma carta pode ser jogada agora: use DESCARTAR CARTA.'
    if (carta.tipo === 'acao') {
      const a = analisarAcao(estado, 'humano', carta, cat)
      if (a.bloqueio) return a.bloqueio
    }
    return validarJogarCarta(estado, cat, { tipo: 'jogarCarta', jogador: 'humano', uid }) ?? 'Esta carta não pode ser jogada agora.'
  }
  const motivoUsar = () => motivoUsarDe(sel.mao)

  function motivoAtacar(): string | null {
    if (!minhaVez) return 'Aguarde a sua vez.'
    if (estado.turno === 1) return 'No primeiro turno da partida ninguém pode atacar.'
    if (estado.fase === 'PRINCIPAL' && !podeSeguir) return soDescarte ? 'Descarte uma carta antes de atacar.' : 'Faça a jogada da mão antes de atacar.'
    const unidades = v.eu.campo.filter((u): u is UnidadeEmCampo => !!u)
    if (unidades.length === 0) return 'Você não tem unidades em campo.'
    if (!unidades.some((u) => u.posicao === 'ATAQUE')) return 'Nenhuma unidade está em posição de ataque.'
    if (unidades.every((u) => u.atacou || u.posicao !== 'ATAQUE')) return 'Todas as unidades em ataque já atacaram neste turno.'
    return null
  }

  function motivoDefender(): string | null {
    if (!minhaVez) return 'Aguarde a sua vez.'
    if (cartaSel?.tipo === 'unidade') return null
    if (sel.unidade !== undefined) {
      const u = v.eu.campo[sel.unidade]
      if (u?.atacou) return 'Uma unidade que já atacou não muda de posição neste turno.'
      return null
    }
    return 'Selecione uma unidade da mão ou do seu campo.'
  }

  function motivoEncerrar(): string | null {
    if (!minhaVez) return 'Aguarde a sua vez.'
    if (!podeSeguir) return soDescarte ? 'Sem jogada legal: descarte uma carta.' : 'Faça a jogada da mão antes de encerrar o turno.'
    return null
  }

  // ---------------------------------------------------------------- ações dos botões
  function usarCarta() {
    const m = motivoUsar()
    if (m) return dizer(m, true)
    const c = cartaSel!
    if (c.tipo === 'unidade' || c.tipo === 'armadilha') {
      setModo({ tipo: 'zona' })
      pedidoFoco.current = '[data-foco="alvo"]'
      dizer(c.tipo === 'unidade' ? 'Escolha uma zona livre do seu campo.' : 'Escolha uma zona de suporte livre.')
      return
    }
    const a = analisarAcao(estado, 'humano', c, cat)
    if (a.exigeAlvo && a.donoAlvo) {
      setModo({ tipo: 'alvo', alvos: a.alvos, dono: a.donoAlvo })
      pedidoFoco.current = '[data-foco="alvo"]'
      dizer('Escolha a unidade alvo (destacada).')
    } else enviar({ tipo: 'jogarCarta', jogador: 'humano', uid: sel.mao as string })
  }

  function atacar() {
    const m = motivoAtacar()
    if (m) return dizer(m, true)
    if (modo?.tipo === 'atacar') {
      setModo(null)
      return dizer('Ataque cancelado.')
    }
    if (estado.fase === 'PRINCIPAL' && !enviar({ tipo: 'avancarFase', jogador: 'humano' })) return
    setModo({ tipo: 'atacar' })
    pedidoFoco.current = '[data-foco="alvo"]'
    dizer('Escolha uma unidade sua em ataque e depois o alvo.')
  }

  function defender() {
    const m = motivoDefender()
    if (m) return dizer(m, true)
    if (cartaSel?.tipo === 'unidade') {
      const nova: Posicao = posPend === 'ATAQUE' ? 'DEFESA' : 'ATAQUE'
      setPosPend(nova)
      dizer(`A unidade entrará em ${nova === 'ATAQUE' ? 'ataque' : 'defesa'}.`)
      return
    }
    const u = v.eu.campo[sel.unidade as number] as UnidadeEmCampo
    const zona = sel.unidade as number
    if (enviar({ tipo: 'mudarPosicao', jogador: 'humano', zona, posicao: u.posicao === 'ATAQUE' ? 'DEFESA' : 'ATAQUE' })) {
      setSel({ unidade: zona }) // mantém a seleção para poder alternar de volta
      pedidoFoco.current = '#b-defender'
    }
  }

  function descartar() {
    if (!sel.mao) return dizer('Selecione a carta a descartar.', true)
    enviar({ tipo: 'descartar', jogador: 'humano', uid: sel.mao })
  }

  // ---------------------------------------------------------------- cliques no tabuleiro
  function escolherMao(uid: string) {
    if (!minhaVez && !estado.resultado) return
    setModo(null)
    setAviso(null)
    setSel(sel.mao === uid ? {} : { mao: uid })
    setFoco(null)
  }

  function cliqueUnidade(lado: IdJogador, z: number) {
    const u = (lado === 'humano' ? v.eu.campo : v.oponente.campo)[z]
    if (modo?.tipo === 'zona' && lado === 'humano' && cartaSel?.tipo === 'unidade' && !u) {
      enviarOuEscolherFace({ tipo: 'jogarCarta', jogador: 'humano', uid: sel.mao as string, zona: z, posicao: posPend })
      return
    }
    if (modo?.tipo === 'alvo') {
      if (lado === modo.dono && modo.alvos.includes(z)) enviar({ tipo: 'jogarCarta', jogador: 'humano', uid: sel.mao as string, alvo: z })
      else dizer('Esta unidade não é um alvo válido para a carta.', true)
      return
    }
    if (modo?.tipo === 'atacar') {
      if (lado === 'humano') {
        if (ataques.some((a) => a.atacante === z)) {
          setModo({ tipo: 'atacar', atacante: z })
          setSel({ unidade: z })
          pedidoFoco.current = '[data-foco="alvo"]'
          dizer('Escolha o alvo do ataque.')
        } else dizer('Esta unidade não pode atacar agora (em defesa, já atacou ou vazia).', true)
      } else if (modo.atacante !== undefined) {
        const ok = enviar({ tipo: 'atacar', jogador: 'humano', atacante: modo.atacante, alvo: z })
        if (ok) {
          setModo({ tipo: 'atacar' })
          pedidoFoco.current = '[data-foco="alvo"], #b-encerrar'
        }
      } else dizer('Escolha primeiro a unidade atacante.', true)
      return
    }
    if (u && !('oculta' in u && u.oculta)) {
      setFoco(u.cartaId)
      if (lado === 'humano') setSel({ unidade: z })
    }
  }

  function cliqueSuporte(lado: IdJogador, z: number) {
    const s = (lado === 'humano' ? v.eu.suporte : v.oponente.suporte)[z]
    if (modo?.tipo === 'zona' && lado === 'humano' && cartaSel?.tipo === 'armadilha' && !s) {
      enviar({ tipo: 'jogarCarta', jogador: 'humano', uid: sel.mao as string, zona: z })
      return
    }
    if (s && !('oculta' in s && s.oculta)) setFoco((s as { cartaId: string }).cartaId)
  }

  function ataqueDireto() {
    if (modo?.tipo === 'atacar' && modo.atacante !== undefined) {
      const ok = enviar({ tipo: 'atacar', jogador: 'humano', atacante: modo.atacante, alvo: 'direto' })
      if (ok) {
        setModo({ tipo: 'atacar' })
        pedidoFoco.current = '[data-foco="alvo"], #b-encerrar'
      }
    }
  }

  // ---------------------------------------------------------------- arrastar a carta da mão até o campo (Pointer Events)
  // Alternativa ao clique: usa os MESMOS caminhos do botão USAR CARTA (`enviar` -> `aplicarComando`, validações do motor).
  // Clique simples continua selecionando (limiar de arrasto de 6 px).
  // mouse/caneta: arrasto imediato após 10 px. TOQUE: só após pressão longa (~240 ms parado, tolerância 8 px) para a página continuar rolando.
  interface EstadoArrasto {
    uid: string
    id: number
    px: number
    py: number
    ativo: boolean
    toque: boolean
    /** Último ponto conhecido (toque, antes de armar) e ponto em que armou. */
    x: number
    y: number
    ax: number
    ay: number
    moveu: boolean
    timer: number | undefined
  }
  const LIMIAR_MOUSE = 10
  const LIMIAR_TOQUE = 8
  const PRESSAO_LONGA_MS = 240
  const arrRef = useRef<EstadoArrasto | null>(null)
  const baixaPaisagem = () => typeof window.matchMedia === 'function' && window.matchMedia('(max-height: 520px) and (orientation: landscape) and (max-width: 1100px)').matches
  const [telaToque] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  const [telaBaixa] = useState(() => baixaPaisagem())
  /** O clique sintetizado logo após soltar um arrasto não deve alternar a seleção: engole só o próximo clique (capture), removido no próximo ciclo. */
  const engolirRef = useRef<((ev: Event) => void) | null>(null)
  function pararDeEngolirClique() {
    if (engolirRef.current) window.removeEventListener('click', engolirRef.current, true)
    engolirRef.current = null
  }
  function suprimirProximoClique() {
    pararDeEngolirClique()
    const engolir = (ev: Event) => {
      ev.stopPropagation()
      ev.preventDefault()
      pararDeEngolirClique()
    }
    engolirRef.current = engolir
    window.addEventListener('click', engolir, true)
    window.setTimeout(() => engolirRef.current === engolir && pararDeEngolirClique(), 0)
  }
  const [arr, setArr] = useState<{ uid: string; x: number; y: number; sobre: string | null } | null>(null)

  function cartaDoUid(uid: string | undefined) {
    return uid ? cat.get(mao.find((c) => c.uid === uid)?.cartaId ?? '') : undefined
  }

  function bloqueioArrasto(uid: string): string | null {
    if (baixaPaisagem()) return 'Arrastar não está disponível nesta tela baixa: selecione a carta e use USAR CARTA.'
    if (!minhaVez) return 'Aguarde a sua vez.'
    return motivoUsarDe(uid)
  }

  /** Destino -> executar (ou motivo). Chaves: zona:humano:z (unidade livre), unidade:lado:z, suporte:humano:z, terreno, campo. */
  function avaliarDestino(uid: string, key: string | null): { valido: boolean; motivo: string; cmd?: Comando } {
    const c = cartaDoUid(uid)
    if (!c) return { valido: false, motivo: 'Carta indisponível.' }
    const [tipo, lado, zStr] = (key ?? '').split(':')
    const z = Number(zStr)
    const proprio = lado === 'humano'
    const tentar = (cmd: Comando & { tipo: 'jogarCarta' }, rotulo: string) => {
      const erro = validarJogarCarta(estado, cat, cmd)
      return erro ? { valido: false, motivo: erro } : { valido: true, motivo: rotulo, cmd }
    }
    if (c.tipo === 'unidade') {
      if (proprio && (tipo === 'zona' || tipo === 'unidade')) return tentar({ tipo: 'jogarCarta', jogador: 'humano', uid, zona: z, posicao: posPend }, '')
      return { valido: false, motivo: 'Solte a unidade em uma zona livre do seu campo.' }
    }
    if (c.tipo === 'armadilha') {
      if (proprio && tipo === 'suporte') return tentar({ tipo: 'jogarCarta', jogador: 'humano', uid, zona: z }, '')
      return { valido: false, motivo: 'Solte a armadilha em uma zona de suporte livre.' }
    }
    const a = analisarAcao(estado, 'humano', c, cat)
    if (a.exigeAlvo && a.donoAlvo) {
      if (tipo === 'unidade' && lado === a.donoAlvo && a.alvos.includes(z)) return tentar({ tipo: 'jogarCarta', jogador: 'humano', uid, alvo: z }, '')
      return { valido: false, motivo: 'Solte sobre uma unidade alvo válida (destacada).' }
    }
    if (key === 'terreno' || key === 'campo' || (proprio && (tipo === 'zona' || tipo === 'unidade' || tipo === 'suporte'))) return tentar({ tipo: 'jogarCarta', jogador: 'humano', uid }, '')
    return { valido: false, motivo: 'Solte a carta sobre o seu campo ou sobre o terreno.' }
  }

  function destinosValidos(uid: string): Set<string> {
    const s = new Set<string>()
    const c = cartaDoUid(uid)
    if (!c) return s
    const cand: string[] = []
    if (c.tipo === 'unidade') [0, 1, 2, 3, 4].forEach((z) => !v.eu.campo[z] && cand.push('zona:humano:' + z))
    else if (c.tipo === 'armadilha') [0, 1, 2, 3, 4].forEach((z) => !v.eu.suporte[z] && cand.push('suporte:humano:' + z))
    else {
      const a = analisarAcao(estado, 'humano', c, cat)
      if (a.exigeAlvo && a.donoAlvo) a.alvos.forEach((z) => cand.push('unidade:' + a.donoAlvo + ':' + z))
      else cand.push('terreno', 'campo')
    }
    cand.forEach((k) => avaliarDestino(uid, k).valido && s.add(k))
    return s
  }

  function destinoSob(x: number, y: number): string | null {
    const el = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null
    return el?.closest<HTMLElement>('[data-destino]')?.dataset.destino ?? null
  }

  /** Campo com rolagem horizontal interna (celular): perto das bordas, rola enquanto o ponteiro se move. */
  function autoRolar(e: PointerEvent) {
    const cont = document.querySelector<HTMLElement>('.duelo-lado--voce .duelo-zonas')
    if (!cont) return
    const r = cont.getBoundingClientRect()
    if (e.clientY < r.top - 40 || e.clientY > r.bottom + 40) return
    if (e.clientX < r.left + 40) cont.scrollLeft -= 16
    else if (e.clientX > r.right - 40) cont.scrollLeft += 16
  }

  const ouvintes = useRef({
    mover: (e: PointerEvent) => apiArrasto.current.mover(e),
    soltar: (e: PointerEvent) => apiArrasto.current.soltar(e),
    cancelar: () => apiArrasto.current.cancelar(),
  })
  const apiArrasto = useRef<{ mover: (e: PointerEvent) => void; soltar: (e: PointerEvent) => void; cancelar: () => void }>({ mover: () => {}, soltar: () => {}, cancelar: () => {} })

  function pararOuvintes() {
    window.removeEventListener('pointermove', ouvintes.current.mover)
    window.removeEventListener('pointerup', ouvintes.current.soltar)
    window.removeEventListener('pointercancel', ouvintes.current.cancelar)
  }

  function limparTimerArrasto() {
    if (arrRef.current?.timer !== undefined) window.clearTimeout(arrRef.current.timer)
  }

  function cancelarArrasto() {
    limparTimerArrasto()
    pararOuvintes()
    arrRef.current = null
    setArr(null)
  }

  /** Toque: o dedo ficou parado o bastante => entra em modo arrasto (feedback imediato: fantasma + zonas destacadas + vibração leve). */
  function armarToque(a: EstadoArrasto) {
    if (arrRef.current !== a || a.ativo) return
    const bloqueio = bloqueioArrasto(a.uid)
    if (bloqueio) {
      pararOuvintes()
      arrRef.current = null
      dizer(bloqueio, true)
      return
    }
    a.ativo = true
    a.ax = a.x
    a.ay = a.y
    setModo(null)
    setAviso(null)
    setFoco(null)
    setSel({ mao: a.uid })
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(12)
    } catch {
      /* vibração é opcional */
    }
    setArr({ uid: a.uid, x: a.x, y: a.y, sobre: destinoSob(a.x, a.y) })
  }

  function iniciarPointer(uid: string, e: { pointerId: number; pointerType: string; button: number; clientX: number; clientY: number; isPrimary?: boolean }) {
    if ((e.pointerType === 'mouse' && e.button !== 0) || e.isPrimary === false) return
    pararDeEngolirClique() // um novo toque/clique nunca é engolido
    pararOuvintes()
    const a: EstadoArrasto = { uid, id: e.pointerId, px: e.clientX, py: e.clientY, ativo: false, toque: e.pointerType === 'touch', x: e.clientX, y: e.clientY, ax: e.clientX, ay: e.clientY, moveu: false, timer: undefined }
    arrRef.current = a
    if (a.toque) a.timer = window.setTimeout(() => armarToque(a), PRESSAO_LONGA_MS)
    window.addEventListener('pointermove', ouvintes.current.mover)
    window.addEventListener('pointerup', ouvintes.current.soltar)
    window.addEventListener('pointercancel', ouvintes.current.cancelar)
  }

  function moverArrasto(e: PointerEvent) {
    const a = arrRef.current
    if (!a || e.pointerId !== a.id) return
    a.x = e.clientX
    a.y = e.clientY
    if (!a.ativo) {
      const d = Math.hypot(e.clientX - a.px, e.clientY - a.py)
      if (a.toque) {
        // moveu antes da pressão longa: é rolagem/gesto normal, não arrasto
        if (d > LIMIAR_TOQUE) cancelarArrasto()
        return
      }
      if (d < LIMIAR_MOUSE) return
      const bloqueio = bloqueioArrasto(a.uid)
      if (bloqueio) {
        pararOuvintes()
        arrRef.current = null
        suprimirProximoClique()
        dizer(bloqueio, true)
        return
      }
      a.ativo = true
      setModo(null)
      setAviso(null)
      setFoco(null)
      setSel({ mao: a.uid })
    }
    if (a.toque && !a.moveu && Math.hypot(e.clientX - a.ax, e.clientY - a.ay) > 6) a.moveu = true
    autoRolar(e)
    setArr({ uid: a.uid, x: e.clientX, y: e.clientY, sobre: destinoSob(e.clientX, e.clientY) })
  }

  function soltarArrasto(e: PointerEvent) {
    const a = arrRef.current
    if (!a || e.pointerId !== a.id) return
    limparTimerArrasto()
    pararOuvintes()
    arrRef.current = null
    if (!a.ativo) return // clique simples: segue o fluxo normal de seleção
    suprimirProximoClique()
    setArr(null)
    if (a.toque && !a.moveu) return // pressão longa solta sem mover: não joga (a carta fica selecionada)
    const r = avaliarDestino(a.uid, destinoSob(e.clientX, e.clientY))
    if (r.cmd) enviarOuEscolherFace(r.cmd)
    else dizer(r.motivo, true)
  }

  useEffect(() => {
    apiArrasto.current = { mover: moverArrasto, soltar: soltarArrasto, cancelar: cancelarArrasto }
  })
  useEffect(
    () => () => {
      limparTimerArrasto()
      pararOuvintes()
      pararDeEngolirClique()
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  // Toque: com o arrasto ativo a página não pode rolar. touchmove NÃO passivo só na área da mão e só com arrasto ativo (senão a rolagem é normal).
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.duelo-mao')
    if (!el) return
    const travar = (ev: Event) => {
      if (arrRef.current?.ativo && ev.cancelable) ev.preventDefault()
    }
    el.addEventListener('touchmove', travar, { passive: false })
    el.addEventListener('contextmenu', travar) // menu de pressão longa do navegador atrapalharia o arrasto
    return () => {
      el.removeEventListener('touchmove', travar)
      el.removeEventListener('contextmenu', travar)
    }
  }, [])

  const validos = useMemo(() => (arr ? destinosValidos(arr.uid) : new Set<string>()), [arr?.uid, estado, posPend]) // eslint-disable-line react-hooks/exhaustive-deps
  const classeDrop = (key: string) => (validos.has(key) ? ' zona--drop' + (arr?.sobre === key ? ' zona--sobre' : '') : '')

  // Esc: fecha/cancela por camadas; sem nada aberto, pede confirmação para abandonar.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (arrRef.current) cancelarArrasto() // arrasto em curso: Esc só cancela o arrasto
      else if (estado.resultado && !reproduzindo) onVoltar()
      else if (colocacaoPendente) setColocacaoPendente(null)
      else if (confirma) setConfirma(false)
      else if (modo) {
        setModo(null)
        setAviso(null)
      } else setConfirma(true)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [estado.resultado, reproduzindo, colocacaoPendente, confirma, modo, onVoltar])

  // ---------------------------------------------------------------- derivados de apresentação
  const efet = (dono: IdJogador, u: UnidadeEmCampo) => ({ atk: atkEfetivo(plano, dono, u, cat), def: defEfetiva(plano, dono, u, cat) })
  const atacanteAtual = modo?.tipo === 'atacar' ? modo.atacante : undefined
  const alvosAtaque = ataques.filter((a) => a.atacante === atacanteAtual)
  const podeDireto = alvosAtaque.some((a) => a.alvo === 'direto')
  const ultimaJogada = [...log].reverse().find((e) => e.tipo === 'carta_jogada' && e.carta.cartaId !== '?')
  const dicaCartaId = cartaSel?.id ?? foco ?? (ultimaJogada && ultimaJogada.tipo === 'carta_jogada' ? ultimaJogada.carta.cartaId : undefined)
  const dicaCarta = dicaCartaId ? cat.get(dicaCartaId) : undefined
  const terrenoCarta = v.terreno ? cat.get(v.terreno.cartaId) : undefined
  const conceitos = useMemo(() => {
    const vistos = new Map<string, { nome: string; texto: string }>()
    for (const e of log) {
      if (e.tipo !== 'carta_jogada' || e.carta.cartaId === '?') continue
      const c = cat.get(e.carta.cartaId)
      if (c && !vistos.has(c.id)) vistos.set(c.id, { nome: c.nome, texto: c.educacao })
    }
    return [...vistos.values()].slice(0, 3)
  }, [log])

  const bannerTexto = estado.resultado ? 'Fim do duelo' : estado.ativo === 'humano' && !reproduzindo ? 'Seu turno' : 'Turno do oponente'
  const faseTxt = estado.fase === 'PRINCIPAL' ? 'Principal' : estado.fase === 'COMBATE' ? 'Combate' : estado.fase

  // Efeitos visuais temporários (classes de animação) derivados dos eventos públicos novos; nunca bloqueiam o fluxo.
  const posicoes = useMemo(() => {
    const m: Record<string, Posicao> = {}
    v.eu.campo.forEach((u, z) => u && (m[chaveZona('humano', z)] = u.posicao))
    v.oponente.campo.forEach((u, z) => u && (m[chaveZona('oponente', z)] = u.posicao))
    return m
  }, [v])
  const fx = useEfeitosVisuais(log, posicoes)

  function renderZonaUnidade(lado: IdJogador, z: number) {
    const u = (lado === 'humano' ? v.eu.campo : v.oponente.campo)[z]
    const quem = lado === 'humano' ? 'sua' : 'do oponente'
    const chave = chaveZona(lado, z)
    const keyDestino = (u ? 'unidade:' : 'zona:') + lado + ':' + z
    const drop = classeDrop(keyDestino)
    const dropAttr = drop ? ({ 'aria-dropeffect': 'move' } as const) : {}
    const alvoValido =
      (modo?.tipo === 'alvo' && modo.dono === lado && modo.alvos.includes(z)) ||
      (modo?.tipo === 'atacar' && lado === 'oponente' && alvosAtaque.some((a) => a.alvo === z))
    const livreEscolha = modo?.tipo === 'zona' && lado === 'humano' && cartaSel?.tipo === 'unidade' && !u
    const atacantePossivel = modo?.tipo === 'atacar' && lado === 'humano' && ataques.some((a) => a.atacante === z)
    if (!u) {
      const rot = `Zona ${z + 1} ${quem}: vazia, escolher esta zona`
      if (livreEscolha) {
        return (
          <button key={z} type="button" className={'zona zona--vazia zona--valida' + drop} data-destino={keyDestino} {...dropAttr} data-foco="alvo" aria-label={rot} onClick={() => cliqueUnidade(lado, z)}>
            <span className="zona__losango" aria-hidden="true" />
          </button>
        )
      }
      // Carta destruída: o elemento permanece até o fim da animação (classe temporária), só visual e fora da árvore de acessibilidade.
      const fantasma = fx.destruidas.find((f) => f.lado === lado && f.zona === z)
      const cf = fantasma ? cat.get(fantasma.cartaId) : undefined
      return (
        <div key={z} className={'zona zona--vazia' + drop} data-destino={lado === 'humano' ? keyDestino : undefined} {...dropAttr} aria-hidden="true">
          <span className="zona__losango" aria-hidden="true" />
          {cf ? (
            <span className="zona__fantasma" data-fantasma="destruida">
              <CartaView carta={cf} tamanho="campo" posicao={fantasma!.posicao} efeito="destruida" lado={lado} rotulo={`${cf.nome}, destruída`} />
            </span>
          ) : null}
        </div>
      )
    }
    if ('oculta' in u && u.oculta) {
      const rot = `Zona ${z + 1} ${quem}: unidade virada para baixo, em ${u.posicao === 'ATAQUE' ? 'ataque' : 'defesa'}${u.atacou ? ', já atacou' : ''}${
        alvoValido ? ', alvo válido' : ''
      }`
      return (
        <div key={z} className={'zona' + drop} data-destino={keyDestino} {...dropAttr}>
          <CartaVerso
            tamanho="campo"
            posicao={u.posicao}
            destaque={alvoValido ? 'alvo' : null}
            focoAlvo={alvoValido}
            rotulo={rot}
            onClick={() => cliqueUnidade(lado, z)}
          />
        </div>
      )
    }
    const unidade = u as UnidadeEmCampo
    const c = cat.get(unidade.cartaId)!
    const { atk, def } = efet(lado, unidade)
    const rot = `Zona ${z + 1} ${quem}: ${c.nome}, ATK ${atk}, DEF ${def}, em ${u.posicao === 'ATAQUE' ? 'ataque' : 'defesa'}${u.atacou ? ', já atacou' : ''}${
      unidade.equipamentoUid ? ', equipada' : ''
    }${alvoValido ? ', alvo válido' : ''}${atacantePossivel ? ', pode atacar' : ''}`
    const efeito = fx.atacando.includes(chave) ? 'atacando' : fx.impacto.includes(chave) ? 'impacto' : fx.entrando.includes(chave) ? 'entrando' : null
    if (unidade.viradaParaBaixo) {
      return (
        <div key={z} className={'zona' + drop} data-destino={keyDestino} {...dropAttr}>
          <CartaVerso
            tamanho="campo"
            posicao={unidade.posicao}
            selecionada={sel.unidade === z || atacanteAtual === z}
            destaque={alvoValido ? 'alvo' : atacantePossivel ? 'valida' : null}
            focoAlvo={alvoValido || atacantePossivel}
            rotulo={`${rot}, virada para baixo`}
            onClick={() => cliqueUnidade(lado, z)}
          />
        </div>
      )
    }
    return (
      <div key={z} className={'zona' + drop} data-destino={keyDestino} {...dropAttr}>
        <CartaView
          carta={c}
          atk={atk}
          def={def}
          posicao={unidade.posicao}
          tamanho="campo"
          selecionada={lado === 'humano' && (sel.unidade === z || atacanteAtual === z)}
          destaque={alvoValido ? 'alvo' : atacantePossivel ? 'valida' : null}
          focoAlvo={alvoValido || atacantePossivel}
          efeito={efeito}
          lado={lado}
          rotulo={rot}
          onClick={() => cliqueUnidade(lado, z)}
        />
      </div>
    )
  }

  function renderSuporte(lado: IdJogador, z: number) {
    const s = (lado === 'humano' ? v.eu.suporte : v.oponente.suporte)[z]
    const quem = lado === 'humano' ? 'sua' : 'do oponente'
    const livre = modo?.tipo === 'zona' && lado === 'humano' && cartaSel?.tipo === 'armadilha' && !s
    const keyS = 'suporte:' + lado + ':' + z
    const dropS = lado === 'humano' ? classeDrop(keyS) : ''
    const dataS = lado === 'humano' ? keyS : undefined
    const dropSAttr = dropS ? ({ 'aria-dropeffect': 'move' } as const) : {}
    if (!s) {
      const rot = `Suporte ${z + 1} ${quem}: vazio, escolher esta zona`
      return livre ? (
        <button key={z} type="button" className={'suporte suporte--vazio zona--valida' + dropS} data-destino={dataS} {...dropSAttr} data-foco="alvo" aria-label={rot} onClick={() => cliqueSuporte(lado, z)}>
          <span className="zona__losango" aria-hidden="true" />
        </button>
      ) : (
        <div key={z} className={'suporte suporte--vazio' + dropS} data-destino={dataS} {...dropSAttr} aria-hidden="true">
          <span className="zona__losango" aria-hidden="true" />
        </div>
      )
    }
    if ('oculta' in s && s.oculta) {
      return (
        <div key={z} className="suporte" data-destino={dataS}>
          <CartaVerso rotulo={`Suporte ${z + 1} ${quem}: carta virada para baixo`} />
        </div>
      )
    }
    const full = s as { cartaId: string; tipo: string }
    const c = cat.get(full.cartaId)!
    const extra = full.tipo === 'armadilha' ? ', armadilha virada (visível só para você)' : ', equipamento'
    return (
      <div key={z} className={'suporte' + dropS} data-destino={dataS} {...dropSAttr}>
        <CartaView carta={c} tamanho="mini" rotulo={`Suporte ${z + 1} ${quem}: ${c.nome}${extra}`} onClick={() => cliqueSuporte(lado, z)} />
      </div>
    )
  }

  // Move o foco para o próximo elemento lógico (pedido pelas ações) depois que o DOM foi atualizado.
  useEffect(() => {
    const alvo = pedidoFoco.current
    if (!alvo) return
    pedidoFoco.current = null
    document.querySelector<HTMLElement>(alvo)?.focus()
  })

  const desistirVisivel = confirma && (!estado.resultado || reproduzindo)
  const dialogoAberto = !!colocacaoPendente || desistirVisivel || (!!estado.resultado && !reproduzindo)

  const posAtual = cartaSel?.tipo === 'unidade' ? posPend : undefined

  // Números do resumo da tela de resultado (só dados públicos: vida, cartas em jogo, rodadas).
  const dadosResultado = {
    vidaOponente: v.oponente.lp,
    vidaVoce: v.eu.lp,
    emJogoOponente: v.oponente.campo.filter(Boolean).length,
    emJogoVoce: v.eu.campo.filter(Boolean).length,
    rodadas: Math.ceil(estado.turno / 2),
  }

  return (
    <div className={`tela tela-partida${aviso?.texto ? ' tela-partida--aviso' : ''}${arr ? ' tela-partida--arrastando' : ''}`}>
      <div className="duelo-fundo" inert={dialogoAberto}>
        <CabecalhoDuelo />
        <h1 className="sr-only">Duelo contra {oponente.nome}</h1>

        <main className="duelo-corpo">
          <section className="duelo-tabuleiro" aria-label="Tabuleiro">
            <PainelJogador
              lado="oponente"
              nome="Oponente"
              subtitulo="IA do Litoral"
              vida={v.oponente.lp}
              rotuloVida={`Vida do oponente: ${v.oponente.lp}`}
              rotuloContagens="Cartas do oponente"
              baralho={v.oponente.baralhoTamanho}
              descarte={v.oponente.descarte.length}
              rotuloZonas="Zonas de unidade do oponente"
              rotuloSuportes="Zonas de suporte do oponente"
              zonas={[0, 1, 2, 3, 4].map((z) => renderZonaUnidade('oponente', z))}
              suportes={[0, 1, 2, 3, 4].map((z) => renderSuporte('oponente', z))}
              vidaFx={{ dano: fx.dano.oponente, cura: fx.cura.oponente }}
              maoOponente={
                <div className="duelo-mao-oponente" role="group" aria-label={`Mão do oponente: ${v.oponente.maoTamanho} cartas`}>
                  {Array.from({ length: v.oponente.maoTamanho }, (_, i) => (
                    <CartaVerso key={i} rotulo="Carta da mão do oponente" />
                  ))}
                </div>
              }
              acao={
                podeDireto ? (
                  <button type="button" className="duelo-btn duelo-btn--atacar duelo-direto" data-foco="alvo" onClick={ataqueDireto}>
                    <span className="duelo-btn__texto">
                      <strong>Ataque direto</strong>
                      <small>O oponente não tem unidades</small>
                    </span>
                  </button>
                ) : null
              }
            />

            <FaixaTerreno terreno={terrenoCarta} drop={validos.has('terreno') ? (arr?.sobre === 'terreno' ? 'sobre' : 'valido') : null} />

            <PainelJogador
              lado="voce"
              nome="Você"
              subtitulo="Protetor do Litoral"
              vida={v.eu.lp}
              rotuloVida={`Sua vida: ${v.eu.lp}`}
              rotuloContagens="Suas cartas"
              baralho={v.eu.baralhoTamanho}
              descarte={v.eu.descarte.length}
              rotuloZonas="Suas zonas de unidade"
              rotuloSuportes="Suas zonas de suporte"
              zonas={[0, 1, 2, 3, 4].map((z) => renderZonaUnidade('humano', z))}
              suportes={[0, 1, 2, 3, 4].map((z) => renderSuporte('humano', z))}
              vidaFx={{ dano: fx.dano.humano, cura: fx.cura.humano }}
              drop={validos.has('campo')}
              dataDestino="campo"
            />

            <MolduraOrnamentada as="section" tom="ciano" className="duelo-mao" aria-label={`Sua mão, ${mao.length} cartas`} classeMiolo="duelo-mao__miolo">
              <h2 className="duelo-mao__titulo">
                <span className="duelo-mao__icone" aria-hidden="true">
                  <IconeCartas />
                </span>
                Sua mão <small>({mao.length} cartas)</small>
              </h2>
              {telaBaixa ? null : <p className="duelo-mao__dica">{telaToque ? 'Segure e arraste a carta até o campo, ou use USAR CARTA' : 'Arraste a carta até o campo ou use USAR CARTA'}</p>}
              <div className="duelo-mao__cartas">
                {mao.map((m, i) => {
                  const c = cat.get(m.cartaId)!
                  return (
                    <CartaView
                      key={m.uid}
                      carta={c}
                      tamanho="mao"
                      posicao={m.uid === sel.mao ? posAtual : undefined}
                      selecionada={m.uid === sel.mao}
                      rotulo={`Mão ${i + 1}: ${descricaoCarta(c)}${m.uid === sel.mao ? ', selecionada' : ''}`}
                      onClick={() => escolherMao(m.uid)}
                      onPointerDown={(e) => iniciarPointer(m.uid, e)}
                      arrastando={arr?.uid === m.uid}
                      inativa={!minhaVez}
                    />
                  )
                })}
              </div>
            </MolduraOrnamentada>
          </section>

          <aside className="duelo-lateral" aria-label="Controles do duelo">
            <MolduraOrnamentada tom="ciano" className="duelo-comandos" classeMiolo="duelo-comandos__miolo">
              <BannerTurno rodada={Math.ceil(estado.turno / 2)} texto={bannerTexto} fase={faseTxt} meuTurno={bannerTexto === 'Seu turno'} mudou={fx.turnoMudou} />

              <div className="duelo-acoes">
                <BotaoAcao id="b-atacar" variante="atacar" titulo={modo?.tipo === 'atacar' ? 'Cancelar ataque' : 'Atacar'} sub="Ataca uma carta do oponente" motivo={modo?.tipo === 'atacar' ? null : motivoAtacar()} onClick={atacar} icone={<IconeEspadas />} />
                <BotaoAcao
                  id="b-defender"
                  variante="defender"
                  titulo="Defender"
                  sub={cartaSel?.tipo === 'unidade' ? `Entra em ${posPend === 'ATAQUE' ? 'ataque (toque: defesa)' : 'defesa (toque: ataque)'}` : 'Alterna a posição da unidade'}
                  motivo={motivoDefender()}
                  onClick={defender}
                  icone={<IconeEscudo />}
                />
                <BotaoAcao id="b-usar" variante="usar" titulo="Usar carta" sub="Baixa uma carta da sua mão" motivo={motivoUsar()} onClick={usarCarta} icone={<IconeCartas />} />
                {minhaVez && estado.fase === 'PRINCIPAL' && !estado.jogadaFeita && soDescarte ? (
                  <BotaoAcao id="b-descartar" variante="neutro" titulo="Descartar carta" sub="Sem jogada legal: descarte uma carta" motivo={sel.mao ? null : 'Selecione a carta a descartar.'} onClick={descartar} />
                ) : null}
                <BotaoAcao
                  id="b-encerrar"
                  variante="neutro"
                  icone={<IconeRelogioPixel />}
                  titulo="Encerrar turno"
                  sub="Passa a vez ao oponente"
                  motivo={motivoEncerrar()}
                  onClick={() => {
                    const m = motivoEncerrar()
                    if (m) dizer(m, true)
                    else enviar({ tipo: 'encerrarTurno', jogador: 'humano' })
                  }}
                />
              </div>

              <p className={`duelo-aviso${aviso?.erro ? ' duelo-aviso--erro' : ''}`} role="status" aria-live="polite">
                {aviso?.texto ?? ''}
              </p>

              <button type="button" className="duelo-desistir" id="b-desistir" onClick={() => setConfirma(true)} disabled={!!estado.resultado && !reproduzindo}>
                Desistir
              </button>
            </MolduraOrnamentada>

            <MolduraOrnamentada className="duelo-restantes-quadro" classeMiolo="duelo-restantes">
              <span className="duelo-restantes__icone" aria-hidden="true">
                <IconeCartas />
              </span>
              <span>Cartas restantes</span>
              <strong aria-label={`Cartas restantes no baralho: ${v.eu.baralhoTamanho}`}>{v.eu.baralhoTamanho}</strong>
            </MolduraOrnamentada>

            <DicaEducativa carta={dicaCarta} />

            {/* Registro oculto visualmente: continua anunciado a leitores de tela (aria-live). */}
            <section className="sr-only" aria-label="Registro do duelo">
              <ol role="log" aria-live="polite" aria-relevant="additions">
                {log.slice(-10).map((e, i, arr) => (
                  <li key={log.length - arr.length + i}>{e.texto}</li>
                ))}
              </ol>
            </section>
          </aside>
        </main>
      </div>

      {arr && cartaDoUid(arr.uid) ? (
        <div className="duelo-arrasto-fantasma" aria-hidden="true" style={{ left: arr.x, top: arr.y }}>
          <CartaView carta={cartaDoUid(arr.uid)!} tamanho="mao" rotulo="Carta sendo arrastada" />
        </div>
      ) : null}

      {desistirVisivel ? (
        <DialogoDesistir
          onConfirmar={() => {
            setConfirma(false)
            desistirAgora()
          }}
          onCancelar={() => setConfirma(false)}
        />
      ) : null}

      {colocacaoPendente ? (
        <DialogoFaceUnidade
          posicao={colocacaoPendente.posicao ?? 'ATAQUE'}
          onEscolher={(viradaParaBaixo) => {
            const cmd = colocacaoPendente
            setColocacaoPendente(null)
            enviar({ ...cmd, viradaParaBaixo })
          }}
          onCancelar={() => setColocacaoPendente(null)}
        />
      ) : null}

      {estado.resultado && !reproduzindo ? (
        <ResultadoDuelo resultado={estado.resultado} nomeOponente={oponente.nome} dados={dadosResultado} conceitos={conceitos} onNovamente={onNovamente} onVoltar={onVoltar} />
      ) : null}
    </div>
  )
}
