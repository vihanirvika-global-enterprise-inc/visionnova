// Every id in this schema is a Postgres uuid column, and Postgres throws
// `invalid input syntax for type uuid` on anything that is not one. That error
// escapes as a 500 on some routes and, where an error boundary catches it, as
// a 200 on others — neither is the 404 a mistyped URL deserves. Route
// handlers check the shape with this before touching the database.
//
// Deliberately narrow: canonical 8-4-4-4-12 hex only. Postgres also accepts
// braced and unhyphenated forms, but no URL we generate uses them, so allowing
// them would only widen what reaches the query for no benefit.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}
