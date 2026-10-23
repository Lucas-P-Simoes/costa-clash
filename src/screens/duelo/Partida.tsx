import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CartaVerso, CartaView } from '../../components/duelo/CartaView'
import { useFocoDialogo } from '../../components/duelo/useFocoDialogo'
import { descricaoCarta, rotuloTipo } from '../../components/duelo/textoCarta'
import { IconeCartas, IconeEspadas, OrnamentoOnda } from '../../components/ui/Icones'
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
import type { Comando, EstadoDuelo, IdJogador, PassoIA, Posicao, UnidadeEmCampo, VisaoDuelo } from '../../game'
import { estadoDeVisao } from '../../game/visao'
import topoEsquerda from '../../assets/login/topo-esquerda.png'
import topoDireita from '../../assets/login/topo-direita.png'
import cenaMangue from '../../assets/duelo/dica-mangue.png'
import { ResultadoDuelo } from './ResultadoDuelo'
import './duelo.css'

const cat = mapaCatalogo(CATALOGO)

type Modo = null | { tipo: 'zona' } | { tipo: 'alvo'; alvos: number[]; dono: IdJogador } | { tipo: 'atacar'; atacante?: number }
interface Aviso {
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

function IconeCoracao({ cor }: { cor: string }) {
  return (
    <svg className="duelo-coracao pixel-art" viewBox="0 0 9 8" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      <path fill={cor} d="M1 0h2v1h1v1h1V1h1V0h2v1h1v3H8v1H7v1H6v1H5v1H4V7H3V6H2V5H1V4H0V1h1z" />
    </svg>
  )
}

function Botao({ id, variante, titulo, sub, motivo, onClick, icone }: { id: string; variante: string; titulo: string; sub: string; motivo: string | null; onClick: () => void; icone?: ReactNode }) {
  return (
    <div className="duelo-btn-wrap">
      <button
        type="button"
        id={id}
        className={`duelo-btn duelo-btn--${variante}`}
        aria-disabled={motivo ? true : undefined}
        aria-describedby={motivo ? `${id}-motivo` : undefined}
        title={motivo ?? undefined}
        onClick={onClick}
      >
        {icone ? <span className="duelo-btn__icone" aria-hidden="true">{icone}</span> : null}
        <span className="duelo-btn__texto">
          <strong>{titulo}</strong>
          <small>{sub}</small>
        </span>
      </button>
      {motivo ? (
        <span id={`${id}-motivo`} className="duelo-btn__motivo">
          {motivo}
        </span>
      ) : null}
    </div>
  )
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

/** Tela do duelo. Toda regra vem do motor (`src/game`); aqui só há seleção, modos guiados e apresentação. */
export function Partida({ estadoInicial, oponente, onVoltar, onNovamente, atrasoIA }: Props) {
  const [estado, setEstado] = useState(estadoInicial)
  const [reproduzindo, setReproduzindo] = useState(false)
  const [sel, setSel] = useState<{ mao?: string; unidade?: number }>({})
  const [modoRaw, setModo] = useState<Modo>(null)
  const [posPend, setPosPend] = useState<Posicao>('ATAQUE')
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [confirma, setConfirma] = useState(false)
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
  const minhaVez = estado.ativo === 'humano' && !estado.resultado && !reproduzindo
  const legais = useMemo(() => (minhaVez ? jogadasLegais(estado) : []), [estado, minhaVez])
  const ataques = useMemo(() => (minhaVez && estado.fase === 'COMBATE' ? ataquesLegais(estado) : []), [estado, minhaVez])
  const mao = v.eu.mao
  const cartaSel = sel.mao ? cat.get(mao.find((c) => c.uid === sel.mao)?.cartaId ?? '') : undefined
  const podeSeguir = estado.jogadaFeita || mao.length === 0
  const soDescarte = legais.length > 0 && legais.every((c) => c.tipo === 'descartar')

  function dizer(texto: string, erro = false) {
    setAviso({ texto, erro })
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

  // ---------------------------------------------------------------- motivos (botões desabilitados)
  function motivoUsar(): string | null {
    if (!minhaVez) return 'Aguarde a sua vez.'
    if (estado.fase !== 'PRINCIPAL') return 'A jogada da mão só vale na fase principal.'
    if (estado.jogadaFeita) return 'Você já fez a jogada da mão neste turno.'
    if (!cartaSel || !sel.mao) return 'Selecione uma carta da mão.'
    if (legais.some((c) => c.tipo === 'jogarCarta' && c.uid === sel.mao)) return null
    if (soDescarte) return 'Nenhuma carta pode ser jogada agora: use DESCARTAR CARTA.'
    if (cartaSel.tipo === 'acao') {
      const a = analisarAcao(estado, 'humano', cartaSel, cat)
      if (a.bloqueio) return a.bloqueio
    }
    return validarJogarCarta(estado, cat, { tipo: 'jogarCarta', jogador: 'humano', uid: sel.mao }) ?? 'Esta carta não pode ser jogada agora.'
  }

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
      enviar({ tipo: 'jogarCarta', jogador: 'humano', uid: sel.mao as string, zona: z, posicao: posPend })
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
    if (u) {
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

  // Esc: fecha/cancela por camadas; sem nada aberto, pede confirmação para abandonar.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (estado.resultado && !reproduzindo) onVoltar()
      else if (confirma) setConfirma(false)
      else if (modo) {
        setModo(null)
        setAviso(null)
      } else setConfirma(true)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [estado.resultado, reproduzindo, confirma, modo, onVoltar])

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

  function renderZonaUnidade(lado: IdJogador, z: number) {
    const u = (lado === 'humano' ? v.eu.campo : v.oponente.campo)[z]
    const quem = lado === 'humano' ? 'sua' : 'do oponente'
    const alvoValido =
      (modo?.tipo === 'alvo' && modo.dono === lado && modo.alvos.includes(z)) ||
      (modo?.tipo === 'atacar' && lado === 'oponente' && alvosAtaque.some((a) => a.alvo === z))
    const livreEscolha = modo?.tipo === 'zona' && lado === 'humano' && cartaSel?.tipo === 'unidade' && !u
    const atacantePossivel = modo?.tipo === 'atacar' && lado === 'humano' && ataques.some((a) => a.atacante === z)
    if (!u) {
      const rot = `Zona ${z + 1} ${quem}: vazia, escolher esta zona`
      return livreEscolha ? (
        <button key={z} type="button" className="zona zona--vazia zona--valida" data-foco="alvo" aria-label={rot} onClick={() => cliqueUnidade(lado, z)}>
          <span className="zona__losango" aria-hidden="true" />
        </button>
      ) : (
        <div key={z} className="zona zona--vazia" aria-hidden="true">
          <span className="zona__losango" aria-hidden="true" />
        </div>
      )
    }
    const c = cat.get(u.cartaId)!
    const { atk, def } = efet(lado, u)
    const rot = `Zona ${z + 1} ${quem}: ${c.nome}, ATK ${atk}, DEF ${def}, em ${u.posicao === 'ATAQUE' ? 'ataque' : 'defesa'}${u.atacou ? ', já atacou' : ''}${
      u.equipamentoUid ? ', equipada' : ''
    }${alvoValido ? ', alvo válido' : ''}${atacantePossivel ? ', pode atacar' : ''}`
    return (
      <div key={z} className="zona">
        <CartaView
          carta={c}
          atk={atk}
          def={def}
          posicao={u.posicao}
          tamanho="campo"
          selecionada={lado === 'humano' && (sel.unidade === z || atacanteAtual === z)}
          destaque={alvoValido ? 'alvo' : atacantePossivel ? 'valida' : null}
          focoAlvo={alvoValido || atacantePossivel}
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
    if (!s) {
      const rot = `Suporte ${z + 1} ${quem}: vazio, escolher esta zona`
      return livre ? (
        <button key={z} type="button" className="suporte suporte--vazio zona--valida" data-foco="alvo" aria-label={rot} onClick={() => cliqueSuporte(lado, z)}>
          <span className="zona__losango" aria-hidden="true" />
        </button>
      ) : (
        <div key={z} className="suporte suporte--vazio" aria-hidden="true">
          <span className="zona__losango" aria-hidden="true" />
        </div>
      )
    }
    if ('oculta' in s && s.oculta) {
      return (
        <div key={z} className="suporte">
          <CartaVerso rotulo={`Suporte ${z + 1} ${quem}: carta virada para baixo`} />
        </div>
      )
    }
    const full = s as { cartaId: string; tipo: string }
    const c = cat.get(full.cartaId)!
    const extra = full.tipo === 'armadilha' ? ', armadilha virada (visível só para você)' : ', equipamento'
    return (
      <div key={z} className="suporte">
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
  const dialogoAberto = desistirVisivel || (!!estado.resultado && !reproduzindo)

  const posAtual = cartaSel?.tipo === 'unidade' ? posPend : undefined

  return (
    <div className={`tela tela-partida${aviso?.texto ? ' tela-partida--aviso' : ''}`}>
      <div className="duelo-fundo" inert={dialogoAberto}>
      <header className="duelo-topo">
        <img className="duelo-topo__img duelo-topo__img--esq" src={topoEsquerda} alt="" aria-hidden="true" />
        <img className="duelo-topo__img duelo-topo__img--dir" src={topoDireita} alt="" aria-hidden="true" />
        <div className="duelo-topo__logo">
          <p className="cabecalho__nome">Costa Clash</p>
          <p className="cabecalho__subtitulo">Batalha pelo Litoral</p>
        </div>
        <p className="duelo-topo__frase">Conhecimento hoje, litorais vivos amanhã.</p>
        <h1 className="sr-only">Duelo contra {oponente.nome}</h1>
      </header>

      <main className="duelo-corpo">
        <section className="duelo-tabuleiro" aria-label="Tabuleiro">
          <div className="moldura moldura--interna duelo-lado duelo-lado--oponente">
            <div className="duelo-lado__topo">
              <div className="duelo-nome duelo-nome--oponente">
                <h2>{oponente.nome}</h2>
                <p>IA do Litoral</p>
              </div>
              <p className="duelo-vida duelo-vida--oponente" aria-label={`Vida do oponente: ${v.oponente.lp}`}>
                <IconeCoracao cor="#ff5a4a" />
                <span>Vida:</span> <strong>{v.oponente.lp}</strong>
              </p>
              <ul className="duelo-contagens" aria-label="Cartas do oponente">
                <li>Baralho: {v.oponente.baralhoTamanho}</li>
                <li>Descarte: {v.oponente.descarte.length}</li>
              </ul>
              <div className="duelo-mao-oponente" role="group" aria-label={`Mão do oponente: ${v.oponente.maoTamanho} cartas`}>
                {Array.from({ length: v.oponente.maoTamanho }, (_, i) => (
                  <CartaVerso key={i} rotulo="Carta da mão do oponente" />
                ))}
              </div>
              {podeDireto ? (
                <button type="button" className="duelo-btn duelo-btn--atacar duelo-direto" data-foco="alvo" onClick={ataqueDireto}>
                  <span className="duelo-btn__texto">
                    <strong>Ataque direto</strong>
                    <small>O oponente não tem unidades</small>
                  </span>
                </button>
              ) : null}
            </div>
            <div className="duelo-zonas" role="group" aria-label="Zonas de unidade do oponente">
              {[0, 1, 2, 3, 4].map((z) => renderZonaUnidade('oponente', z))}
            </div>
            <div className="duelo-suportes" role="group" aria-label="Zonas de suporte do oponente">
              {[0, 1, 2, 3, 4].map((z) => renderSuporte('oponente', z))}
            </div>
          </div>

          <p className="duelo-terreno" aria-label="Terreno global">
            <OrnamentoOnda className="duelo-terreno__orn" />
            <span>
              Terreno: <strong>{terrenoCarta ? terrenoCarta.nome.replace(/^Terreno: */, '') : 'nenhum'}</strong>
              {terrenoCarta?.efeito ? ` (+${terrenoCarta.efeito.valor} ATK e DEF, ${terrenoCarta.efeito.alvo})` : ''}
            </span>
          </p>

          <div className="moldura moldura--interna duelo-lado duelo-lado--voce">
            <div className="duelo-lado__topo">
              <div className="duelo-nome duelo-nome--voce">
                <h2>Você</h2>
                <p>Protetor do Litoral</p>
              </div>
              <p className="duelo-vida duelo-vida--voce" aria-label={`Sua vida: ${v.eu.lp}`}>
                <IconeCoracao cor="#3fdcf0" />
                <span>Vida:</span> <strong>{v.eu.lp}</strong>
              </p>
              <ul className="duelo-contagens" aria-label="Suas cartas">
                <li>Baralho: {v.eu.baralhoTamanho}</li>
                <li>Descarte: {v.eu.descarte.length}</li>
              </ul>
            </div>
            <div className="duelo-zonas" role="group" aria-label="Suas zonas de unidade">
              {[0, 1, 2, 3, 4].map((z) => renderZonaUnidade('humano', z))}
            </div>
            <div className="duelo-suportes" role="group" aria-label="Suas zonas de suporte">
              {[0, 1, 2, 3, 4].map((z) => renderSuporte('humano', z))}
            </div>
          </div>

          <section className="moldura moldura--interna duelo-mao" aria-label={`Sua mão, ${mao.length} cartas`}>
            <h2 className="duelo-mao__titulo">
              <span className="duelo-mao__icone" aria-hidden="true">
                <IconeCartas />
              </span>
              Sua mão <small>({mao.length} cartas)</small>
            </h2>
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
                    inativa={!minhaVez}
                  />
                )
              })}
            </div>
          </section>
        </section>

        <aside className="duelo-lateral" aria-label="Controles do duelo">
          <div className="duelo-turno textura-pedra" role="status" aria-live="polite">
            <p className="duelo-turno__rotulo">Rodada {Math.ceil(estado.turno / 2)}</p>
            <p className="duelo-turno__texto">{bannerTexto}</p>
            <p className="duelo-turno__fase">Fase: {faseTxt}</p>
          </div>

          <div className="duelo-acoes">
            <Botao id="b-atacar" variante="atacar" titulo={modo?.tipo === 'atacar' ? 'Cancelar ataque' : 'Atacar'} sub="Ataca uma carta do oponente" motivo={modo?.tipo === 'atacar' ? null : motivoAtacar()} onClick={atacar} icone={<IconeEspadas />} />
            <Botao
              id="b-defender"
              variante="defender"
              titulo="Defender"
              sub={cartaSel?.tipo === 'unidade' ? `Entra em ${posPend === 'ATAQUE' ? 'ataque (toque: defesa)' : 'defesa (toque: ataque)'}` : 'Alterna a posição da unidade'}
              motivo={motivoDefender()}
              onClick={defender}
            />
            <Botao id="b-usar" variante="usar" titulo="Usar carta" sub="Baixa uma carta da sua mão" motivo={motivoUsar()} onClick={usarCarta} icone={<IconeCartas />} />
            {minhaVez && estado.fase === 'PRINCIPAL' && !estado.jogadaFeita && soDescarte ? (
              <Botao id="b-descartar" variante="neutro" titulo="Descartar carta" sub="Sem jogada legal: descarte uma carta" motivo={sel.mao ? null : 'Selecione a carta a descartar.'} onClick={descartar} />
            ) : null}
            <Botao id="b-encerrar" variante="neutro" titulo="Encerrar turno" sub="Passa a vez ao oponente" motivo={motivoEncerrar()} onClick={() => {
              const m = motivoEncerrar()
              if (m) dizer(m, true)
              else enviar({ tipo: 'encerrarTurno', jogador: 'humano' })
            }} />
          </div>

          <p className={`duelo-aviso${aviso?.erro ? ' duelo-aviso--erro' : ''}`} role="status" aria-live="polite">
            {aviso?.texto ?? ''}
          </p>

          <button type="button" className="duelo-desistir" id="b-desistir" onClick={() => setConfirma(true)} disabled={!!estado.resultado && !reproduzindo}>
            Desistir
          </button>

          <p className="duelo-restantes">
            <span className="duelo-restantes__icone" aria-hidden="true">
              <IconeCartas />
            </span>
            <span>Cartas restantes</span>
            <strong aria-label={`Cartas restantes no baralho: ${v.eu.baralhoTamanho}`}>{v.eu.baralhoTamanho}</strong>
          </p>

          <section className="moldura moldura--interna duelo-dica" aria-label="Dica educativa">
            <h2>Dica educativa</h2>
            {dicaCarta ? (
              <>
                <p className="duelo-dica__carta">
                  {dicaCarta.nome} <small>({rotuloTipo(dicaCarta)})</small>
                </p>
                <p>{dicaCarta.educacao}</p>
              </>
            ) : (
              <p>Selecione uma carta ou observe as jogadas para ver uma dica sobre o litoral.</p>
            )}
            <img className="duelo-dica__img" src={cenaMangue} alt="" aria-hidden="true" />
          </section>

          <section className="duelo-log" aria-label="Registro do duelo">
            <h2>Registro</h2>
            <ol role="log" aria-live="polite" aria-relevant="additions">
              {log.slice(-10).map((e, i, arr) => (
                <li key={log.length - arr.length + i}>{e.texto}</li>
              ))}
            </ol>
          </section>
        </aside>
      </main>
      </div>

      {desistirVisivel ? (
        <DialogoDesistir
          onConfirmar={() => {
            setConfirma(false)
            desistirAgora()
          }}
          onCancelar={() => setConfirma(false)}
        />
      ) : null}

      {estado.resultado && !reproduzindo ? (
        <ResultadoDuelo resultado={estado.resultado} nomeOponente={oponente.nome} conceitos={conceitos} onNovamente={onNovamente} onVoltar={onVoltar} />
      ) : null}
    </div>
  )
}
