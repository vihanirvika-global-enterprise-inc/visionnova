import { vi, type Mock } from 'vitest'

// postgres.js query results are arrays that also carry iterator and metadata
// properties (`ResultQueryMeta`), so a plain fixture array is not assignable to
// the real return type. Tests never assert on that metadata, so the cast lives
// here once — documented — instead of an `as any` at every call site.
type SqlMock = Mock<(...args: unknown[]) => Promise<unknown>>

export function mockSql(sqlFn: unknown): SqlMock {
  return vi.mocked(sqlFn as never) as unknown as SqlMock
}
