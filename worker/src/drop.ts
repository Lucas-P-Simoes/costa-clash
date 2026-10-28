// Drop de cartas por vitória no Duelo Livre. Tabelas e sorteio vivem em src/data/dropsOponentes.ts (compartilhado).
// O duelo roda no navegador, então o servidor NÃO prova a vitória; ele limita o abuso: o resgate exige um duelo
// iniciado por esta conta, vale uma única vez, só depois de DURACAO_MINIMA_DUELO_MS, e a carta é sorteada aqui.
import { MAX_COPIAS_COLECAO, sortearDrop, tabelaDropDoOponente } from '../../src/data/dropsOponentes'
import { buscarDuelo, carregarColecao, registrarDuelo, resgatarDuelo, VALIDADE_DUELO_MS } from './dados'
import { erro, lerJson, resposta } from './http'
import { consumir, criarLimite, DUELO_INICIO_JANELA_MS, DUELO_INICIO_MAX } from './limite'
import { autenticar, MSG_MUITAS, MSG_NAO_AUTENTICADO, objeto } from './rotas'
import type { Contexto } from './rotas'

/** Nenhum duelo real termina em menos tempo que isto (8.000 de vida por lado). */
export const DURACAO_MINIMA_DUELO_MS = 30_000

const MSG_DUELO_INVALIDO = 'Duelo não encontrado ou expirado.'

function aleatorioSeguro(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32
}

/** POST /api/duelo/iniciar {oponenteId} -> {dueloId} */
export async function iniciarDuelo(c: Contexto): Promise<Response> {
  const u = await autenticar(c)
  if (!u) return erro(401, 'nao_autenticado', MSG_NAO_AUTENTICADO, c.extra)
  const corpo = await lerJson(c.request, c.extra)
  if (!corpo.ok) return corpo.resposta
  const o = objeto(corpo.json)
  if (!o || typeof o.oponenteId !== 'string' || !tabelaDropDoOponente(o.oponenteId)) {
    return erro(400, 'dados_invalidos', 'Adversário inválido.', c.extra)
  }
  const db = c.env.DB
  const limite = await criarLimite('duelo-inicio', u.id, DUELO_INICIO_MAX, DUELO_INICIO_JANELA_MS, c.agora)
  if (!(await consumir(db, limite, c.agora))) return erro(429, 'muitas_tentativas', MSG_MUITAS, c.extra)
  const dueloId = crypto.randomUUID()
  await registrarDuelo(db, dueloId, u.id, o.oponenteId, c.agora)
  return resposta(201, { dueloId }, c.extra)
}

/** POST /api/duelo/vitoria {dueloId} -> {carta: id | null, quantidade, colecao} */
export async function resgatarVitoria(c: Contexto): Promise<Response> {
  const u = await autenticar(c)
  if (!u) return erro(401, 'nao_autenticado', MSG_NAO_AUTENTICADO, c.extra)
  const corpo = await lerJson(c.request, c.extra)
  if (!corpo.ok) return corpo.resposta
  const o = objeto(corpo.json)
  if (!o || typeof o.dueloId !== 'string' || o.dueloId === '' || o.dueloId.length > 64) {
    return erro(400, 'dados_invalidos', 'Informe o duelo.', c.extra)
  }
  const db = c.env.DB
  const duelo = await buscarDuelo(db, o.dueloId, u.id)
  if (!duelo || duelo.iniciado_em <= c.agora - VALIDADE_DUELO_MS) return erro(404, 'duelo_invalido', MSG_DUELO_INVALIDO, c.extra)
  if (duelo.resgate !== null) return erro(409, 'duelo_resgatado', 'A recompensa deste duelo já foi entregue.', c.extra)
  if (c.agora - duelo.iniciado_em < DURACAO_MINIMA_DUELO_MS) return erro(409, 'duelo_curto', 'Duelo curto demais para render recompensa.', c.extra)

  const colecaoAntes = new Map((await carregarColecao(db, u.id)).map((i) => [i.cartaId, i.quantidade]))
  const carta = sortearDrop(duelo.oponente_id, colecaoAntes, aleatorioSeguro)
  const resgatou = await resgatarDuelo(db, o.dueloId, u.id, crypto.randomUUID(), carta, MAX_COPIAS_COLECAO)
  if (!resgatou) return erro(409, 'duelo_resgatado', 'A recompensa deste duelo já foi entregue.', c.extra)
  const colecao = await carregarColecao(db, u.id)
  const quantidade = carta ? (colecao.find((i) => i.cartaId === carta)?.quantidade ?? 0) : 0
  return resposta(200, { carta, quantidade, colecao }, c.extra)
}
