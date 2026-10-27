// Harness de testes e2e/viewport (SÓ servido pelo servidor de desenvolvimento; NÃO entra no build de produção).
// Monta telas em estados difíceis de alcançar pela UI, sem rede nem serviço real:
//   ?cena=conta                      TelaConta com serviço de auth FALSO injetado (nenhuma API é chamada)
//   ?cena=duelo-campo[&seed=N]       Partida com unidades em ataque e em defesa, um verso e suportes dos dois lados (estado gerado pelo motor)
//   ?cena=resultado-vitoria|resultado-derrota|resultado-empate   Partida já encerrada (diálogo de resultado)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/tokens.css'
import '../src/styles/responsivo.css'
import '../src/styles/base.css'
import '../src/styles/componentes.css'
import App from '../src/App'
import type { ServicoAuth, UsuarioAutenticado } from '../src/auth/servicoAuth'
import { BARALHO_INICIAL } from '../src/data/baralhoInicial'
import { BARALHOS_OPONENTES } from '../src/data/baralhosOponentes'
import { OPONENTES } from '../src/data/oponentes'
import { aplicarComando, criarDuelo, executarTurnoIA } from '../src/game'
import type { EstadoDuelo } from '../src/game'
import { Partida } from '../src/screens/duelo/Partida'

const busca = new URLSearchParams(window.location.search)
const cena = busca.get('cena') ?? 'conta'
const oponente = OPONENTES[0]!
const baralhoOp = BARALHOS_OPONENTES[oponente.id] ?? BARALHO_INICIAL

function novo(seed: number): EstadoDuelo {
  const r = criarDuelo({ baralhoJogador: BARALHO_INICIAL, baralhoOponente: baralhoOp, seed })
  if (!r.ok) throw new Error(r.erros.join('; '))
  return r.estado
}

function comVersoPublico(estado: EstadoDuelo): EstadoDuelo {
  const oponente = estado.jogadores.oponente
  const indice = oponente.campo.findIndex(Boolean)
  if (indice < 0) return estado
  return {
    ...estado,
    jogadores: {
      ...estado.jogadores,
      oponente: {
        ...oponente,
        campo: oponente.campo.map((unidade, zona) => (zona === indice && unidade ? { ...unidade, viradaParaBaixo: true } : unidade)),
      },
    },
  }
}

/** Procura (determinístico) um estado na vez do humano com unidade em ataque e em defesa, um verso e suportes. */
function estadoComCampo(seedPedida: number | null): EstadoDuelo {
  const ok = (e: EstadoDuelo) => {
    const eu = e.jogadores.humano
    const op = e.jogadores.oponente
    const un = eu.campo.filter(Boolean)
    return (
      !e.resultado &&
      e.ativo === 'humano' &&
      un.some((u) => u!.posicao === 'ATAQUE') &&
      un.some((u) => u!.posicao === 'DEFESA') &&
      eu.suporte.some(Boolean) &&
      op.campo.filter(Boolean).length >= 2
    )
  }
  const seeds = seedPedida ? [seedPedida] : Array.from({ length: 400 }, (_, i) => 100 + i)
  let melhor: EstadoDuelo | null = null
  for (const s of seeds) {
    let e = novo(s)
    for (let i = 0; i < 24 && !e.resultado; i++) {
      // O motor joga o lado ativo (IA); para o humano, forçamos posição de defesa na primeira unidade em ataque.
      const r = executarTurnoIA(e)
      if (!r.ok) break
      e = r.estado
      if (e.ativo === 'humano') {
        const eu = e.jogadores.humano
        const un = eu.campo.map((u, z) => ({ u, z })).filter((x) => x.u)
        if (un.length >= 2 && !un.some((x) => x.u!.posicao === 'DEFESA')) {
          const t = aplicarComando(e, { tipo: 'mudarPosicao', jogador: 'humano', zona: un[0]!.z, posicao: 'DEFESA' })
          if (t.ok) e = t.estado
        }
        if (ok(e)) return comVersoPublico(e)
        melhor = melhor ?? e
      }
    }
  }
  if (melhor) return comVersoPublico(melhor)
  return novo(1)
}

const SERVICO_FALSO: ServicoAuth = {
  entrar: () => Promise.resolve({ ok: false, codigo: 'nao_configurado', mensagem: 'harness' }),
  temSessaoSalva: () => true,
  restaurarSessao: () =>
    Promise.resolve({
      ok: true,
      usuario: { id: 'u1', email: 'teste@example.com', baralho: [...BARALHO_INICIAL], colecao: BARALHO_INICIAL.slice(0, 20).map((cartaId) => ({ cartaId, quantidade: 1 })) } satisfies UsuarioAutenticado,
    }),
  sair: () => Promise.resolve(),
}

function montarCena() {
  if (cena === 'conta') return <App servicoAuth={SERVICO_FALSO} />
  let estado: EstadoDuelo
  if (cena === 'duelo-campo') estado = estadoComCampo(Number(busca.get('seed')) || null)
  else {
    const base = novo(7)
    if (cena === 'resultado-vitoria') estado = aplicarComando(base, { tipo: 'desistir', jogador: 'oponente' }).estado
    else if (cena === 'resultado-derrota') estado = aplicarComando(base, { tipo: 'desistir', jogador: 'humano' }).estado
    else estado = { ...base, resultado: { vencedor: null, motivo: 'empate_lp' } }
  }
  return <Partida estadoInicial={estado} oponente={oponente} atrasoIA={0} onVoltar={() => undefined} onNovamente={() => undefined} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {montarCena()}
  </StrictMode>,
)
