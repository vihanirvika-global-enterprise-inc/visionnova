import { describe, it, expect } from 'vitest'
import postgres from 'postgres'

// Emails are normalised in application code (src/lib/customers.ts), but that
// only governs rows written through createCustomer. Two things it cannot do
// on its own: fix rows that predate the normalisation, and stop a raw INSERT
// from a psql session or a future code path reintroducing a case variant.
// Both are the migration's job, so both have to be asserted against a real
// database rather than by string-matching the migration's SQL text.
//
// DATABASE_URL isn't loaded by plain `npx vitest run` (this repo's own scripts
// use `node --env-file=.env.local` for that), so this suite skips cleanly
// wherever it isn't set.
const DATABASE_URL = process.env.DATABASE_URL

// Sentinel used to roll back after asserting on inserted rows, so the fixtures
// never persist.
class RollbackForTest extends Error {}

describe.skipIf(!DATABASE_URL)('customer email normalisation (live Postgres)', () => {
  const sql = postgres(DATABASE_URL as string, { max: 1 })

  it('leaves no stored email in a non-normalised form', async () => {
    const rows = await sql`
      SELECT email FROM customers WHERE email <> lower(btrim(email))
    `
    expect(rows.map((row) => row.email)).toEqual([])
  })

  it('rejects a second account differing from an existing one only by case', async () => {
    await expect(
      sql.begin(async (tx) => {
        const base = `case-guard-${Date.now()}@example.com`
        await tx`
          INSERT INTO customers (email, password_hash, first_name, last_name)
          VALUES (${base}, 'x', 'Case', 'Guard')
        `
        // Bypasses createCustomer deliberately: the point is that Postgres
        // refuses this even when the application layer is not involved.
        await tx`
          INSERT INTO customers (email, password_hash, first_name, last_name)
          VALUES (${base.toUpperCase()}, 'x', 'Case', 'Guard')
        `
        throw new RollbackForTest()
      })
    ).rejects.not.toBeInstanceOf(RollbackForTest)
  })
})
