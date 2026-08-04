import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'store-001',
    name: 'VisionNova Partner — Koramangala',
    address_line1: '123 80 Feet Road',
    address_line2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560034',
    phone: '+91-80-1234-5678',
    created_at: new Date(),
    ...overrides,
  }
}

describe('getPartnerStores', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns all partner stores when no city filter is given', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([row()])

    const { getPartnerStores } = await import('./stores')
    const result = await getPartnerStores()

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('VisionNova Partner — Koramangala')
    expect(result[0].city).toBe('Bengaluru')
  })

  it('filters by city when one is given', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    spy.mockResolvedValueOnce([row()])

    const { getPartnerStores } = await import('./stores')
    await getPartnerStores('Bengaluru')

    const params = spy.mock.calls[0].slice(1)
    expect(params).toContain('%Bengaluru%')
  })
})
