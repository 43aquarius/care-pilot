/**
 * Offline, instant database initializer — replaces the network-fragile
 * `prisma db push` at container boot.
 *
 * - Creates db/custom.db (SQLite) if missing, via bun:sqlite (built in).
 * - Applies the Prisma-generated DDL (.zscripts/schema.sql) only when the
 *   schema is absent, so it is idempotent and safe on every boot.
 * - Never touches the network; runs in milliseconds.
 *
 * Usage: bun .zscripts/db-init.ts
 */
import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')
const DB_PATH = resolve(ROOT, 'db/custom.db')
const DDL_PATH = resolve(ROOT, '.zscripts/schema.sql')

function init() {
  if (!existsSync(DB_PATH)) {
    mkdirSync(dirname(DB_PATH), { recursive: true })
    console.log('[db-init] database file missing — creating')
  }
  const db = new Database(DB_PATH, { create: true })
  try {
    const hasUser = db
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='User'")
      .get()
    if (hasUser) {
      console.log('[db-init] schema already present — nothing to do')
      return
    }
    const ddl = readFileSync(DDL_PATH, 'utf8')
    // split into individual statements (the DDL contains no embedded ';')
    const statements = ddl
      .split(/;\s*\n/)
      .map((s) => s.replace(/--[^\n]*/g, '').trim())
      .filter((s) => s.length > 0)
    console.log(`[db-init] applying ${statements.length} DDL statements`)
    for (const stmt of statements) db.run(stmt)
    db.run('PRAGMA foreign_keys = ON')
    console.log('[db-init] schema created')
  } finally {
    db.close()
  }
}

init()
