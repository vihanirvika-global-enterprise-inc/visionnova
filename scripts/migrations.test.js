import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { listMigrationFiles, applyMigrations } from './migrations.js'

let dir

// Minimal stand-in for the postgres.js client: the runner only needs unsafe()
// and begin(), so the fake records every statement it is handed.
function makeFakeSql({ alreadyApplied = [] } = {}) {
  const statements = []
  const recorded = [...alreadyApplied]

  const client = {
    statements,
    recorded,
    async unsafe(query, params) {
      statements.push({ query, params })
      if (query.includes('SELECT name FROM schema_migrations')) {
        return recorded.map((name) => ({ name }))
      }
      if (query.startsWith('INSERT INTO schema_migrations')) {
        recorded.push(params[0])
      }
      return []
    },
    async begin(fn) {
      return fn(client)
    },
  }

  return client
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'visionnova-migrations-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function writeMigration(name, body = 'SELECT 1;') {
  writeFileSync(join(dir, name), body, 'utf8')
}

describe('listMigrationFiles', () => {
  it('returns .sql files in filename order', () => {
    writeMigration('c-third.sql')
    writeMigration('a-first.sql')
    writeMigration('b-second.sql')

    expect(listMigrationFiles(dir)).toEqual([
      'a-first.sql',
      'b-second.sql',
      'c-third.sql',
    ])
  })

  it('ignores non-sql files', () => {
    writeMigration('real.sql')
    writeFileSync(join(dir, 'README.md'), '# notes', 'utf8')

    expect(listMigrationFiles(dir)).toEqual(['real.sql'])
  })

  it('returns an empty list when there are no migrations', () => {
    expect(listMigrationFiles(dir)).toEqual([])
  })
})

describe('applyMigrations', () => {
  it('creates the ledger table before doing anything else', async () => {
    writeMigration('a-first.sql')
    const sql = makeFakeSql()

    await applyMigrations(sql, dir, () => {})

    expect(sql.statements[0].query).toContain('CREATE TABLE IF NOT EXISTS schema_migrations')
  })

  it('applies pending migrations in filename order', async () => {
    writeMigration('a-first.sql', 'ALTER TABLE a;')
    writeMigration('b-second.sql', 'ALTER TABLE b;')
    const sql = makeFakeSql()

    const applied = await applyMigrations(sql, dir, () => {})

    expect(applied).toEqual(['a-first.sql', 'b-second.sql'])
    const bodies = sql.statements.filter((s) => s.query.startsWith('ALTER TABLE'))
    expect(bodies.map((s) => s.query)).toEqual(['ALTER TABLE a;', 'ALTER TABLE b;'])
  })

  it('records each applied migration in the ledger', async () => {
    writeMigration('a-first.sql')
    const sql = makeFakeSql()

    await applyMigrations(sql, dir, () => {})

    expect(sql.recorded).toContain('a-first.sql')
  })

  // Idempotency is structural: a migration already in the ledger is never run
  // again, whatever its SQL happens to do.
  it('skips migrations already recorded in the ledger', async () => {
    writeMigration('a-first.sql', 'ALTER TABLE a;')
    writeMigration('b-second.sql', 'ALTER TABLE b;')
    const sql = makeFakeSql({ alreadyApplied: ['a-first.sql'] })

    const applied = await applyMigrations(sql, dir, () => {})

    expect(applied).toEqual(['b-second.sql'])
    expect(sql.statements.some((s) => s.query === 'ALTER TABLE a;')).toBe(false)
  })

  it('is a no-op on a second run', async () => {
    writeMigration('a-first.sql', 'ALTER TABLE a;')
    const sql = makeFakeSql()

    await applyMigrations(sql, dir, () => {})
    const secondRun = await applyMigrations(sql, dir, () => {})

    expect(secondRun).toEqual([])
    const applications = sql.statements.filter((s) => s.query === 'ALTER TABLE a;')
    expect(applications).toHaveLength(1)
  })

  it('does not record a migration whose SQL failed', async () => {
    writeMigration('a-broken.sql', 'BROKEN SQL;')
    const sql = makeFakeSql()
    const originalUnsafe = sql.unsafe.bind(sql)
    sql.unsafe = async (query, params) => {
      if (query === 'BROKEN SQL;') throw new Error('syntax error')
      return originalUnsafe(query, params)
    }

    await expect(applyMigrations(sql, dir, () => {})).rejects.toThrow(/syntax error/)
    expect(sql.recorded).not.toContain('a-broken.sql')
  })
})

describe('the real migrations directory', () => {
  it('contains the order-status migration that unblocks paid', async () => {
    const { MIGRATIONS_DIR } = await import('./migrations.js')
    expect(listMigrationFiles(MIGRATIONS_DIR)).toContain(
      'allow-payment-order-statuses.sql'
    )
  })
})
