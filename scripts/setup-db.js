// Run with: npm run db:setup
const { readFileSync } = require('fs')
const { join } = require('path')
const postgres = require('postgres')
const { applyMigrations, MIGRATIONS_DIR } = require('./migrations')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Error: DATABASE_URL is not set. Copy .env.example to .env.local and fill in the values.')
    process.exit(1)
  }

  const sql = postgres(url)
  const schema = readFileSync(join(__dirname, '../src/lib/schema.sql'), 'utf8')

  const redacted = url.replace(/\/\/[^@]+@/, '//***@')
  console.log(`Applying schema to ${redacted} ...`)
  await sql.unsafe(schema)
  console.log('Schema applied successfully.')

  console.log('Applying migrations ...')
  const applied = await applyMigrations(sql, MIGRATIONS_DIR)
  if (applied.length > 0) {
    console.log(`Applied ${applied.length} migration(s).`)
  }

  await sql.end()
}

main().catch((err) => {
  console.error('Setup failed:', err.message)
  process.exit(1)
})
