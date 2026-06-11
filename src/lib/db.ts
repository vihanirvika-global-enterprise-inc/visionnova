import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | undefined

function getPool(): ReturnType<typeof postgres> {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _sql = postgres(url, { prepare: false, max: 1 })
  }
  return _sql
}

// Lazy proxy — pool is only created on the first actual DB call.
// Prevents build-time failures when DATABASE_URL is not set in CI/Vercel.
export const sql = new Proxy(
  (() => {}) as unknown as ReturnType<typeof postgres>,
  {
    apply(_target, _thisArg, argArray) {
      return (getPool() as unknown as (...args: unknown[]) => unknown).apply(_thisArg, argArray)
    },
    get(_target, prop) {
      return (getPool() as unknown as Record<string | symbol, unknown>)[prop]
    },
  }
)
