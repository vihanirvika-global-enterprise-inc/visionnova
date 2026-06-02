import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const mockSql = vi.fn()
vi.mock('postgres', () => ({ default: vi.fn(() => mockSql) }))

describe('db', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, DATABASE_URL: 'postgres://test:test@localhost/testdb' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('exports a sql client built from DATABASE_URL', async () => {
    const postgres = (await import('postgres')).default as ReturnType<typeof vi.fn>
    const { sql } = await import('./db')

    expect(postgres).toHaveBeenCalledWith('postgres://test:test@localhost/testdb')
    expect(sql).toBeDefined()
  })

  it('throws if DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL
    await expect(import('./db')).rejects.toThrow('DATABASE_URL is not set')
  })
})
