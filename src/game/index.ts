// API pública do motor de duelo (consumida pela UI na fase B). Puro: sem React/DOM/localStorage/Math.random.
export { criarDuelo, executarTurnoIA, executarTurnoIAComPassos } from './duelo'
export type { OpcoesDuelo, ResultadoCriarDuelo, PassoIA, ResultadoTurnoIA, DecisorIA } from './duelo'
export { decidirComandoTutorial } from './iaTutorial'
export {
  aplicarComando,
  jogadasLegais,
  ataquesLegais,
  alvosAtaqueLegais,
  atacantesDisponiveis,
  simularAtaque,
  validarDescartar,
  validarJogarCarta,
} from './acoes'
export type {
  Comando,
  ComandoJogarCarta,
  ComandoMudarPosicao,
  ComandoDescartar,
  ComandoAvancarFase,
  ComandoEncerrarTurno,
  ComandoAtacar,
  ComandoDesistir,
  ResultadoComando,
} from './acoes'
export { atkEfetivo, defEfetiva } from './combate'
export { validarBaralhoDuelo } from './baralho'
export type { ResultadoValidacaoBaralho } from './baralho'
export { criarRng, embaralhar } from './rng'
export type { Rng } from './rng'
export { visaoParaJogador, logPublico, eventosPublicos } from './visao'
export type { VisaoDuelo, VisaoPropria, VisaoAdversario, UnidadeVisivel } from './visao'
export { decidirComando, avaliarAtaque, escolherMelhorAtaque, PESOS_ATAQUE_IA } from './ia'
export type { AvaliacaoAtaque, PesosAtaqueIA } from './ia'
export { mapaCatalogo, invariantes, totalCartas, outro } from './estado'
export type {
  EstadoDuelo,
  EstadoJogador,
  UnidadeEmCampo,
  CartaInstancia,
  IdJogador,
  Posicao,
  Fase,
  Resultado,
  MotivoFim,
  Evento,
  DadosEvento,
} from './estado'
export { validarAtaque } from './combate'
export { listarJogadas } from './acoes'
