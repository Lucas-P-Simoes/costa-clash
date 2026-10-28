// Estado da recompensa (drop de carta) mostrado na tela de resultado. O sorteio é do servidor; aqui só há apresentação.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ItemColecao, ResultadoInicioDuelo, ServicoAuth, UsuarioAutenticado } from '../../auth/servicoAuth'

export type EstadoRecompensa =
  | { tipo: 'sem_conta' }
  | { tipo: 'sorteando' }
  | { tipo: 'carta'; cartaId: string; quantidade: number; cartasDistintas: number }
  | { tipo: 'sem_carta' }
  | { tipo: 'erro'; mensagem: string }

const MSG_SEM_SERVICO = 'Recompensas indisponíveis no momento.'

/**
 * Registra no servidor o início de cada partida (chave `partida`, ex.: a seed) e, ao chamar `aoVencer`, resgata a
 * vitória. Sem usuário logado devolve `sem_conta`. `aoAtualizarColecao` recebe a coleção nova do servidor.
 * Respostas que chegam depois de trocar de partida são descartadas.
 */
export function useRecompensaDuelo(
  oponenteId: string,
  partida: number,
  usuario: UsuarioAutenticado | undefined,
  servico: ServicoAuth | undefined,
  aoAtualizarColecao?: (colecao: ItemColecao[]) => void,
): { recompensa: EstadoRecompensa | undefined; aoVencer: () => void } {
  const [atual, setAtual] = useState<{ partida: number; estado: EstadoRecompensa } | undefined>()
  const inicio = useRef<{ partida: number; promessa: Promise<ResultadoInicioDuelo> } | null>(null)
  const logado = !!usuario

  useEffect(() => {
    const iniciar = servico?.iniciarDuelo
    inicio.current =
      logado && iniciar
        ? { partida, promessa: iniciar.call(servico, oponenteId).catch((): ResultadoInicioDuelo => ({ ok: false, codigo: 'indisponivel', mensagem: MSG_SEM_SERVICO })) }
        : null
  }, [oponenteId, partida, logado, servico])

  const aoVencer = useCallback(() => {
    const valer = (estado: EstadoRecompensa) => setAtual({ partida, estado })
    if (!logado) return valer({ tipo: 'sem_conta' })
    const ini = inicio.current
    const resgatar = servico?.resgatarVitoria
    if (!ini || ini.partida !== partida || !resgatar) return valer({ tipo: 'erro', mensagem: MSG_SEM_SERVICO })
    valer({ tipo: 'sorteando' })
    void (async () => {
      try {
        const i = await ini.promessa
        if (!i.ok) return valer({ tipo: 'erro', mensagem: i.mensagem })
        const r = await resgatar.call(servico, i.dueloId)
        if (!r.ok) return valer({ tipo: 'erro', mensagem: r.mensagem })
        aoAtualizarColecao?.(r.colecao)
        valer(r.carta ? { tipo: 'carta', cartaId: r.carta, quantidade: r.quantidade, cartasDistintas: r.colecao.length } : { tipo: 'sem_carta' })
      } catch {
        valer({ tipo: 'erro', mensagem: MSG_SEM_SERVICO })
      }
    })()
  }, [logado, servico, partida, aoAtualizarColecao])

  return { recompensa: atual?.partida === partida ? atual.estado : undefined, aoVencer }
}
