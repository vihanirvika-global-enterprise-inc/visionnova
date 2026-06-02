import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('createPrescription', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a prescription and returns it with pending status', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    vi.mocked(sql).mockResolvedValueOnce([{
      id: 'rx-001',
      customer_id: 'cust-001',
      file_url: 'https://storage.example.com/rx/rx-001.pdf',
      status: 'pending',
      right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
      left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: null,
      expires_at: null,
      created_at: now,
      updated_at: now,
    }])

    const { createPrescription } = await import('./prescriptions')
    const result = await createPrescription({
      customerId: 'cust-001',
      fileUrl: 'https://storage.example.com/rx/rx-001.pdf',
    })

    expect(sql).toHaveBeenCalledOnce()
    expect(result.id).toBe('rx-001')
    expect(result.status).toBe('pending')
    expect(result.fileUrl).toBe('https://storage.example.com/rx/rx-001.pdf')
  })
})

describe('updatePrescriptionStatus', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('updates status and returns the updated prescription', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    vi.mocked(sql).mockResolvedValueOnce([{
      id: 'rx-001',
      customer_id: 'cust-001',
      file_url: 'https://storage.example.com/rx/rx-001.pdf',
      status: 'approved',
      right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
      left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: null,
      expires_at: null,
      created_at: now,
      updated_at: now,
    }])

    const { updatePrescriptionStatus } = await import('./prescriptions')
    const result = await updatePrescriptionStatus('rx-001', 'approved')

    expect(sql).toHaveBeenCalledOnce()
    expect(result.id).toBe('rx-001')
    expect(result.status).toBe('approved')
  })
})
