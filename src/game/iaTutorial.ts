// IA do tutorial (Guardião do Mangue): joga como a IA normal, mas NUNCA ataca, para a lição não ser interrompida.
// Não dá vantagem ilegal: só deixa de usar uma jogada que a IA normal faria. A IA dos demais oponentes não muda.
import { CATALOGO } from '../data/catalogo'
import type { Comando } from './acoes'
import { decidirComando } from './ia'
import type { Carta } from './tipos'
import type { VisaoDuelo } from './visao'

export function decidirComandoTutorial(visao: VisaoDuelo, catalogo: readonly Carta[] = CATALOGO): Comando {
  const cmd = decidirComando(visao, catalogo)
  return cmd.tipo === 'atacar' ? { tipo: 'encerrarTurno', jogador: visao.perspectiva } : cmd
}
