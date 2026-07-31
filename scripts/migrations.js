// Migration runner shared by npm run db:setup.
//
// Migrations are tracked in a schema_migrations ledger rather than relying on
// each file being written idempotently. That makes re-running safe regardless
// of what a given migration does, so a future non-idempotent migration cannot
// quietly corrupt a database on a second run.
const { readFileSync, readdirSync } = require('fs')
const { join } = require('path')

const MIGRATIONS_DIR = join(__dirname, '../src/lib/migrations')

const CREATE_LEDGER = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`

const SELECT_APPLIED = 'SELECT name FROM schema_migrations'
const RECORD_APPLIED = 'INSERT INTO schema_migrations (name) VALUES ($1)'

function listMigrationFiles(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
}

async function applyMigrations(sql, dir = MIGRATIONS_DIR, log = console.log) {
  await sql.unsafe(CREATE_LEDGER)

  const rows = await sql.unsafe(SELECT_APPLIED)
  const applied = new Set(rows.map((row) => row.name))

  const pending = listMigrationFiles(dir).filter((file) => !applied.has(file))

  if (pending.length === 0) {
    log('No pending migrations.')
    return []
  }

  for (const file of pending) {
    const contents = readFileSync(join(dir, file), 'utf8')
    // One transaction per migration: a failure rolls back its ledger entry too,
    // so a half-applied migration is never marked done.
    await sql.begin(async (tx) => {
      await tx.unsafe(contents)
      await tx.unsafe(RECORD_APPLIED, [file])
    })
    log(`  applied ${file}`)
  }

  return pending
}

module.exports = { MIGRATIONS_DIR, listMigrationFiles, applyMigrations }
