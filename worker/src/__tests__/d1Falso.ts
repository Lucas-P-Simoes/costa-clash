// D1 falso para testes: SQLite em memória (node:sqlite) com a migração REAL aplicada.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'

export function criarD1() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  sqlite.exec(readFileSync(join(import.meta.dirname, '../../migrations/0001_init.sql'), 'utf8'))

  function preparar(sql: string, valores: SQLInputValue[] = []) {
    const stmt = {
      bind: (...v: unknown[]) => preparar(sql, v as SQLInputValue[]),
      first: <T>() => Promise.resolve((sqlite.prepare(sql).get(...valores) as T | undefined) ?? null),
      all: <T>() => Promise.resolve({ results: sqlite.prepare(sql).all(...valores) as T[] }),
      run: () => {
        sqlite.prepare(sql).run(...valores)
        return Promise.resolve({ success: true })
      },
    }
    return stmt
  }

  const db = {
    prepare: (sql: string) => preparar(sql),
    batch: (cmds: Array<{ run: () => Promise<unknown> }>) => {
      sqlite.exec('BEGIN')
      try {
        for (const c of cmds) void c.run()
        sqlite.exec('COMMIT')
      } catch (e) {
        sqlite.exec('ROLLBACK')
        return Promise.reject(e)
      }
      return Promise.resolve([])
    },
  }
  return { db: db as unknown as D1Database, sqlite }
}
