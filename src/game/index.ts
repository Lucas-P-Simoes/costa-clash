// API pública do motor de duelo (consumida pela UI na fase B). Puro: sem React/DOM/localStorage/Math.random.
export { criarDuelo, executarTurnoIA, executarTurnoIAComPassos } from './duelo'
export type { OpcoesDuelo, ResultadoCriarDuelo, PassoIA, ResultadoTurnoIA } from './duelo'
export { aplicarComando, jogadasLegais, ataquesLegais, validarJogarCarta } from './acoes'
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
export { atkEfetivo, defEfetiva, bonusTerreno } from './combate'
export { validarBaralhoDuelo } from './baralho'
export type { ResultadoValidacaoBaralho } from './baralho'
export { criarRng, embaralhar } from './rng'
export type { Rng } from './rng'
export { visaoParaJogador, logPublico, eventosPublicos } from './visao'
export type { VisaoDuelo, VisaoPropria, VisaoAdversario, SuporteVisivel, UnidadeVisivel } from './visao'
export { decidirComando } from './ia'
export { mapaCatalogo, invariantes, totalCartas, outro } from './estado'
export type {
  EstadoDuelo,
  EstadoJogador,
  UnidadeEmCampo,
  SuporteEmZona,
  TerrenoAtivo,
  CartaInstancia,
  IdJogador,
  Posicao,
  Fase,
  Resultado,
  MotivoFim,
  Evento,
  DadosEvento,
} from './estado'
export { analisarAcao } from './efeitos'
export { validarAtaque } from './combate'
export { listarJogadas } from './acoes'
