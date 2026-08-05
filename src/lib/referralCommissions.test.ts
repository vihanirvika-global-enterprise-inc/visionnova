import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

// ST-024 (C4. Referral & Commission Tracker) — ledger shell only, per
// explicit scoping decision. This lib has exactly one read function and no
// write path: nothing in this codebase populates referral_commissions yet,
// since there is no real attribution or commission-rate business rule to
// compute it from.
describe('getCommissionLedger', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns the ledger entries for a partner', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{
      id: 'comm-1', partner_id: 'partner-1', order_id: 'order-1',
      amount: null, status: 'pending', created_at: new Date(),
    }])

    const { getCommissionLedger } = await import('./referralCommissions')
    const result = await getCommissionLedger('partner-1')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBeNull()
    expect(result[0].status).toBe('pending')
  })

  it('returns an empty ledger when nothing has been attributed yet', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getCommissionLedger } = await import('./referralCommissions')
    expect(await getCommissionLedger('partner-1')).toEqual([])
  })
})
