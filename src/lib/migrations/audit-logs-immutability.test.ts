import { describe, it, expect } from 'vitest'
import postgres from 'postgres'

// audit_logs' entire purpose is proving nobody tampered with a record, so its
// immutability has to be enforced by Postgres itself (a trigger), not by
// application code that a future bug or a one-off psql session could bypass.
// That means this test has to run against a real database — a string match on
// the migration's SQL text would only prove the trigger text exists, not that
// Postgres actually rejects the mutation.
//
// DATABASE_URL isn't loaded by plain `npx vitest run` (this repo's own
// scripts use `node --env-file=.env.local` for that), so this suite skips
// cleanly wherever it isn't set, rather than forcing live-DB infra onto CI or
// every developer's machine.
const DATABASE_URL = process.env.DATABASE_URL

// Sentinel used to voluntarily roll back a transaction after asserting an
// INSERT succeeded, without ever needing DELETE (which the trigger rejects).
// If the INSERT itself had thrown, the rejection would be a PostgresError,
// not this — so asserting the rejection IS this sentinel proves the INSERT
// went through cleanly before the rollback happened.
class RollbackForTest extends Error {}

describe.skipIf(!DATABASE_URL)('audit_logs immutability (live Postgres)', () => {
  const sql = postgres(DATABASE_URL as string, { max: 1 })

  it('rejects UPDATE on an existing audit_logs row', async () => {
    // Each assertion runs inside its own transaction that gets rolled back
    // regardless of outcome, so the row (and the rejected mutation attempt)
    // never actually persists — there is no way to clean up via DELETE here,
    // since DELETE being rejected is the exact thing under test.
    await expect(
      sql.begin(async (tx) => {
        const [row] = await tx`
          INSERT INTO audit_logs (entity_type, entity_id, action)
          VALUES ('test_entity', gen_random_uuid(), 'created')
          RETURNING id
        `
        await tx`UPDATE audit_logs SET action = 'tampered' WHERE id = ${row.id}`
      })
    ).rejects.toThrow()
  })

  it('rejects DELETE on an existing audit_logs row', async () => {
    await expect(
      sql.begin(async (tx) => {
        const [row] = await tx`
          INSERT INTO audit_logs (entity_type, entity_id, action)
          VALUES ('test_entity', gen_random_uuid(), 'created')
          RETURNING id
        `
        await tx`DELETE FROM audit_logs WHERE id = ${row.id}`
      })
    ).rejects.toThrow()
  })

  it('allows before_json to be null on a create event', async () => {
    await expect(
      sql.begin(async (tx) => {
        await tx`
          INSERT INTO audit_logs (entity_type, entity_id, action, before_json, after_json)
          VALUES ('test_entity', gen_random_uuid(), 'created', NULL, ${sql.json({ name: 'new' })})
        `
        throw new RollbackForTest('discard test insert')
      })
    ).rejects.toThrow(RollbackForTest)
  })

  it('allows after_json to be null on a delete event', async () => {
    await expect(
      sql.begin(async (tx) => {
        await tx`
          INSERT INTO audit_logs (entity_type, entity_id, action, before_json, after_json)
          VALUES ('test_entity', gen_random_uuid(), 'deleted', ${sql.json({ name: 'old' })}, NULL)
        `
        throw new RollbackForTest('discard test insert')
      })
    ).rejects.toThrow(RollbackForTest)
  })
})
