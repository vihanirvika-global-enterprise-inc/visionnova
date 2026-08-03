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
  access_type: 'file',
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
      accessType: 'file',
    })

    expect(sql).toHaveBeenCalledOnce()
  })

  it.each(['file', 'metadata'] as const)('persists a %s read type', async (accessType) => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([logRow])

    const { logPrescriptionAccess } = await import('./prescriptionAccessLogs')
    await logPrescriptionAccess({
      prescriptionId: 'rx-001',
      accessorId: 'cust-001',
      accessorRole: 'optometrist',
      accessType,
    })

    expect(spy.mock.calls[0].slice(1)).toContain(accessType)
  })
})

describe('getAccessLogsByPrescription', () => {
  // A subject-access response naming raw UUIDs answers nobody's question, so
  // the accessor's name is joined in.
  it('returns the audit trail newest first, with accessor names', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql).mockResolvedValueOnce([
      { ...logRow, accessor_name: 'Dr Rao' },
    ])

    const { getAccessLogsByPrescription } = await import('./prescriptionAccessLogs')
    const logs = await getAccessLogsByPrescription('rx-001')

    expect(logs).toEqual([
      {
        id: 'log-001',
        prescriptionId: 'rx-001',
        accessorId: 'cust-001',
        accessorName: 'Dr Rao',
        accessorRole: 'optometrist',
        accessType: 'file',
        accessedAt: logRow.accessed_at,
      },
    ])

    const query = (spy.mock.calls[0][0] as string[]).join('?')
    expect(query).toMatch(/JOIN customers/i)
    expect(query).toMatch(/ORDER BY .*accessed_at DESC/i)
  })

  it('falls back when the accessor record has since been removed', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([{ ...logRow, accessor_name: null }])

    const { getAccessLogsByPrescription } = await import('./prescriptionAccessLogs')
    const [log] = await getAccessLogsByPrescription('rx-001')

    expect(log.accessorName).toBe('Unknown user')
  })

  it('returns an empty trail when nothing has been read', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getAccessLogsByPrescription } = await import('./prescriptionAccessLogs')
    expect(await getAccessLogsByPrescription('rx-001')).toEqual([])
  })
})
