import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'fs'
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

  it('contains a product_images migration with the PRD-specified columns', async () => {
    const { MIGRATIONS_DIR } = await import('./migrations.js')
    expect(listMigrationFiles(MIGRATIONS_DIR)).toContain('create-product-images.sql')

    const sql = readFileSync(join(MIGRATIONS_DIR, 'create-product-images.sql'), 'utf8')
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS product_images/)
    expect(sql).toMatch(/product_id\s+UUID NOT NULL REFERENCES products\(id\)/)
    expect(sql).toMatch(/url\s+TEXT NOT NULL/)
    expect(sql).toMatch(/alt\s+TEXT/)
    expect(sql).toMatch(/sort_order\s+INTEGER NOT NULL DEFAULT 0/)
  })

  it('contains a coupons migration with the PRD-specified columns', async () => {
    const { MIGRATIONS_DIR } = await import('./migrations.js')
    expect(listMigrationFiles(MIGRATIONS_DIR)).toContain('create-coupons.sql')

    const sql = readFileSync(join(MIGRATIONS_DIR, 'create-coupons.sql'), 'utf8')
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS coupons/)
    expect(sql).toMatch(/code\s+TEXT NOT NULL UNIQUE/)
    expect(sql).toMatch(/type\s+TEXT NOT NULL CHECK \(type IN \('percent', 'fixed'\)\)/)
    expect(sql).toMatch(/value\s+NUMERIC\(10, 2\) NOT NULL/)
    expect(sql).toMatch(/valid_from\s+TIMESTAMPTZ NOT NULL/)
    expect(sql).toMatch(/valid_to\s+TIMESTAMPTZ NOT NULL/)
    expect(sql).toMatch(/max_uses\s+INTEGER NOT NULL/)
    expect(sql).toMatch(/current_uses\s+INTEGER NOT NULL DEFAULT 0/)
  })

  it('contains a product_variants migration with the PRD-specified columns', async () => {
    const { MIGRATIONS_DIR } = await import('./migrations.js')
    expect(listMigrationFiles(MIGRATIONS_DIR)).toContain('create-product-variants.sql')

    const sql = readFileSync(join(MIGRATIONS_DIR, 'create-product-variants.sql'), 'utf8')
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS product_variants/)
    expect(sql).toMatch(/product_id\s+UUID NOT NULL REFERENCES products\(id\)/)
    expect(sql).toMatch(/color\s+TEXT NOT NULL/)
    expect(sql).toMatch(/sku\s+TEXT NOT NULL UNIQUE/)
    expect(sql).toMatch(/stock_qty\s+INTEGER NOT NULL DEFAULT 0 CHECK \(stock_qty >= 0\)/)
  })

  it('contains a carts migration with the PRD-specified Cart and CartItem columns', async () => {
    const { MIGRATIONS_DIR } = await import('./migrations.js')
    expect(listMigrationFiles(MIGRATIONS_DIR)).toContain('create-carts.sql')

    const sql = readFileSync(join(MIGRATIONS_DIR, 'create-carts.sql'), 'utf8')

    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS carts/)
    expect(sql).toMatch(/user_id\s+UUID REFERENCES customers\(id\)/)
    expect(sql).toMatch(/session_id\s+TEXT NOT NULL/)

    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS cart_items/)
    expect(sql).toMatch(/cart_id\s+UUID NOT NULL REFERENCES carts\(id\)/)
    expect(sql).toMatch(/product_id\s+UUID NOT NULL REFERENCES products\(id\)/)
    expect(sql).toMatch(/variant_id\s+UUID REFERENCES product_variants\(id\)/)
    expect(sql).toMatch(/qty\s+INTEGER NOT NULL CHECK \(qty > 0\)/)
    expect(sql).toMatch(/unit_price\s+NUMERIC\(10, 2\) NOT NULL CHECK \(unit_price >= 0\)/)

    // carts must be created before cart_items in file order, since cart_items
    // references carts(id) and migrations apply top-to-bottom in one file
    expect(sql.indexOf('CREATE TABLE IF NOT EXISTS carts')).toBeLessThan(
      sql.indexOf('CREATE TABLE IF NOT EXISTS cart_items')
    )
  })

  it('contains a migration that allows the ops role on customers', async () => {
    const { MIGRATIONS_DIR } = await import('./migrations.js')
    expect(listMigrationFiles(MIGRATIONS_DIR)).toContain('allow-ops-role.sql')

    const sql = readFileSync(join(MIGRATIONS_DIR, 'allow-ops-role.sql'), 'utf8')
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS customers_role_check/)
    expect(sql).toMatch(
      /CHECK \(role IN \('customer', 'optometrist', 'ops', 'admin'\)\)/
    )
  })

  it('contains an audit_logs migration with the PRD-specified columns', async () => {
    const { MIGRATIONS_DIR } = await import('./migrations.js')
    expect(listMigrationFiles(MIGRATIONS_DIR)).toContain('create-audit-logs.sql')

    const sql = readFileSync(join(MIGRATIONS_DIR, 'create-audit-logs.sql'), 'utf8')
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS audit_logs/)

    // actor_user_id: nullable — automated/system writes (stock decrement on
    // order-paid, webhook-driven status change, coupon-expiry job) have no
    // human actor, and forcing one would mean fabricating a fake user row.
    expect(sql).toMatch(/actor_user_id\s+UUID REFERENCES customers\(id\),/)

    // entity_type/entity_id/action must never be ambiguous, regardless of actor.
    expect(sql).toMatch(/entity_type\s+TEXT NOT NULL/)
    expect(sql).toMatch(/entity_id\s+UUID NOT NULL/)
    expect(sql).toMatch(/action\s+TEXT NOT NULL/)

    // before_json: nullable — a create action has no prior state.
    expect(sql).toMatch(/before_json\s+JSONB,/)
    // after_json: nullable — a delete action has no resulting state.
    expect(sql).toMatch(/after_json\s+JSONB,/)

    expect(sql).toMatch(/timestamp\s+TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/)
  })
})
