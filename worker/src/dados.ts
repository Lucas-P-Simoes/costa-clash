// Acesso ao D1. Todas as consultas são parametrizadas (bind).
import { BARALHO_INICIAL, colecaoInicial } from './inicial'
import type { ItemColecao, Perfil } from './tipos'

export interface LinhaUsuario {
  id: string
  email: string
  senha_hash: string
  senha_salt: string
  iteracoes: number
}

export const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000

export function buscarUsuarioPorEmail(db: D1Database, email: string): Promise<LinhaUsuario | null> {
  return db.prepare('SELECT id, email, senha_hash, senha_salt, iteracoes FROM usuarios WHERE email = ?').bind(email).first<LinhaUsuario>()
}

export function buscarUsuarioPorSessao(db: D1Database, tokenHash: string, agora: number): Promise<{ id: string; email: string } | null> {
  return db
    .prepare('SELECT u.id AS id, u.email AS email FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ? AND s.expira_em > ?')
    .bind(tokenHash, agora)
    .first<{ id: string; email: string }>()
}

export function inserirSessao(db: D1Database, tokenHash: string, usuarioId: string, agora: number): D1PreparedStatement {
  return db
    .prepare('INSERT INTO sessoes (token_hash, usuario_id, criado_em, expira_em) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, usuarioId, agora, agora + DURACAO_SESSAO_MS)
}

export async function criarSessao(db: D1Database, tokenHash: string, usuarioId: string, agora: number): Promise<void> {
  await inserirSessao(db, tokenHash, usuarioId, agora).run()
  // Limpeza oportunista de sessões vencidas.
  await db.prepare('DELETE FROM sessoes WHERE expira_em <= ?').bind(agora).run()
}

export async function removerSessao(db: D1Database, tokenHash: string): Promise<void> {
  await db.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(tokenHash).run()
}

/** Cria usuário + coleção inicial + baralho inicial + sessão numa única transação (batch). */
export async function criarUsuarioCompleto(
  db: D1Database,
  u: { id: string; email: string; hash: string; salt: string; iteracoes: number },
  tokenHash: string,
  agora: number,
): Promise<void> {
  const cmds: D1PreparedStatement[] = [
    db
      .prepare('INSERT INTO usuarios (id, email, senha_hash, senha_salt, iteracoes, criado_em) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(u.id, u.email, u.hash, u.salt, u.iteracoes, agora),
    ...colecaoInicial().map((c) => db.prepare('INSERT INTO colecao (usuario_id, carta_id, quantidade) VALUES (?, ?, ?)').bind(u.id, c.cartaId, c.quantidade)),
    db.prepare('INSERT INTO baralhos (usuario_id, cartas_json, atualizado_em) VALUES (?, ?, ?)').bind(u.id, JSON.stringify(BARALHO_INICIAL), agora),
    inserirSessao(db, tokenHash, u.id, agora),
  ]
  await db.batch(cmds)
}

export async function carregarColecao(db: D1Database, usuarioId: string): Promise<ItemColecao[]> {
  const r = await db
    .prepare('SELECT carta_id AS cartaId, quantidade FROM colecao WHERE usuario_id = ? ORDER BY carta_id')
    .bind(usuarioId)
    .all<ItemColecao>()
  return r.results
}

export async function carregarBaralho(db: D1Database, usuarioId: string): Promise<string[]> {
  const l = await db.prepare('SELECT cartas_json FROM baralhos WHERE usuario_id = ?').bind(usuarioId).first<{ cartas_json: string }>()
  if (!l) return []
  try {
    const v: unknown = JSON.parse(l.cartas_json)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function salvarBaralho(db: D1Database, usuarioId: string, cartas: string[], agora: number): Promise<void> {
  await db
    .prepare('INSERT INTO baralhos (usuario_id, cartas_json, atualizado_em) VALUES (?, ?, ?) ON CONFLICT(usuario_id) DO UPDATE SET cartas_json = excluded.cartas_json, atualizado_em = excluded.atualizado_em')
    .bind(usuarioId, JSON.stringify(cartas), agora)
    .run()
}

export async function carregarPerfil(db: D1Database, u: { id: string; email: string }): Promise<Perfil> {
  const [baralho, colecao] = await Promise.all([carregarBaralho(db, u.id), carregarColecao(db, u.id)])
  return { id: u.id, email: u.email, baralho, colecao }
}

// ----- limite de tentativas (operações atômicas: uma única instrução SQL cada) -----

/** Incrementa e devolve a nova contagem numa só instrução (atômico mesmo sob concorrência). */
export async function consumirContagem(db: D1Database, chave: string, janela: number, agora: number): Promise<number> {
  const l = await db
    .prepare('INSERT INTO tentativas_login (chave, janela, contagem) VALUES (?, ?, 1) ON CONFLICT(chave, janela) DO UPDATE SET contagem = contagem + 1 RETURNING contagem')
    .bind(chave, janela)
    .first<{ contagem: number }>()
  const contagem = l?.contagem ?? 1
  // Limpeza oportunista de janelas antigas (mais de 2 h), só quando a janela começa.
  if (contagem === 1) await db.prepare('DELETE FROM tentativas_login WHERE janela < ?').bind(agora - 2 * 60 * 60 * 1000).run()
  return contagem
}

/** Devolve uma tentativa (usada no contador por IP quando o login dá certo). */
export async function devolverContagem(db: D1Database, chave: string, janela: number): Promise<void> {
  await db.prepare('UPDATE tentativas_login SET contagem = MAX(contagem - 1, 0) WHERE chave = ? AND janela = ?').bind(chave, janela).run()
}

export async function zerarContagem(db: D1Database, chave: string): Promise<void> {
  await db.prepare('DELETE FROM tentativas_login WHERE chave = ?').bind(chave).run()
}
