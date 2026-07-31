import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

vi.mock('./db', () => ({ sql: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

const logRow = {
  id: 'log-001',
  prescription_id: 'rx-001',
  accessor_id: 'cust-001',
  accessor_role: 'optometrist',
  accessed_at: new Date('2026-07-31T10:00:00Z'),
}

describe('logPrescriptionAccess', () => {
  it('records who read which prescription and when', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([logRow])

    const { logPrescriptionAccess } = await import('./prescriptionAccessLogs')
    await logPrescriptionAccess({
      prescriptionId: 'rx-001',
      accessorId: 'cust-001',
      accessorRole: 'optometrist',
    })

    expect(sql).toHaveBeenCalledOnce()
  })
})

describe('getAccessLogsByPrescription', () => {
  it('returns the audit trail newest first', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([logRow])

    const { getAccessLogsByPrescription } = await import('./prescriptionAccessLogs')
    const logs = await getAccessLogsByPrescription('rx-001')

    expect(logs).toEqual([
      {
        id: 'log-001',
        prescriptionId: 'rx-001',
        accessorId: 'cust-001',
        accessorRole: 'optometrist',
        accessedAt: logRow.accessed_at,
      },
    ])
  })

  it('returns an empty trail when nothing has been read', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getAccessLogsByPrescription } = await import('./prescriptionAccessLogs')
    expect(await getAccessLogsByPrescription('rx-001')).toEqual([])
  })
})
