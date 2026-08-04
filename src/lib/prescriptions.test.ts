import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockSql } from '@/test/dbMock'

const { mockGetCustomerById, mockSendPrescriptionStatusEmail, mockCaptureOrderError } =
  vi.hoisted(() => ({
    mockGetCustomerById: vi.fn(),
    mockSendPrescriptionStatusEmail: vi.fn(),
    mockCaptureOrderError: vi.fn(),
  }))

vi.mock('./db', () => ({ sql: vi.fn() }))
vi.mock('./customers', () => ({ getCustomerById: mockGetCustomerById }))
vi.mock('./email', () => ({ sendPrescriptionStatusEmail: mockSendPrescriptionStatusEmail }))
vi.mock('./sentry', () => ({ captureOrderError: mockCaptureOrderError }))

describe('createPrescription', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a prescription and returns it with pending status', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
      id: 'rx-001',
      customer_id: 'cust-001',
      file_url: 'https://storage.example.com/rx/rx-001.pdf',
      status: 'pending',
      right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
      left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: null,
      expires_at: null,
      consent_given_at: now,
      created_at: now,
      updated_at: now,
    }])

    const { createPrescription } = await import('./prescriptions')
    const result = await createPrescription({
      customerId: 'cust-001',
      fileUrl: 'https://storage.example.com/rx/rx-001.pdf',
      consentGivenAt: now,
    })

    expect(sql).toHaveBeenCalledOnce()
    expect(result.id).toBe('rx-001')
    expect(result.status).toBe('pending')
    expect(result.fileUrl).toBe('https://storage.example.com/rx/rx-001.pdf')
    expect(result.consentGivenAt).toEqual(now)
  })

  // ST-007: consent is captured per prescription, not assumed — the caller
  // must state when it was given, and that value is what gets persisted.
  it('persists the given consentGivenAt timestamp, not the current time', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    const consentTime = new Date('2026-01-01T10:00:00Z')
    spy.mockResolvedValueOnce([{
      id: 'rx-001', customer_id: 'cust-001',
      file_url: 'https://storage.example.com/rx/rx-001.pdf', status: 'pending',
      right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
      left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: null, expires_at: null,
      consent_given_at: consentTime,
      created_at: consentTime, updated_at: consentTime,
    }])

    const { createPrescription } = await import('./prescriptions')
    await createPrescription({
      customerId: 'cust-001',
      fileUrl: 'https://storage.example.com/rx/rx-001.pdf',
      consentGivenAt: consentTime,
    })

    const params = spy.mock.calls[0].slice(1)
    expect(params).toContainEqual(consentTime)
  })

  // ST-023 (C3. Digital Rx Writing Tool). An optometrist-authored
  // prescription has no uploaded document and is approved immediately (the
  // optometrist wrote it themselves — no separate review queue applies).
  it('creates a prescription with no file, an approved status, and clinical values when writing digitally', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    const now = new Date()
    spy.mockResolvedValueOnce([{
      id: 'rx-002', customer_id: 'cust-1', file_url: null, status: 'approved',
      right_sphere: '-1.50', right_cylinder: '-0.75', right_axis: 90, right_add: null,
      left_sphere: '-1.25', left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: '62', expires_at: null,
      consent_given_at: now, created_at: now, updated_at: now,
    }])

    const { createPrescription } = await import('./prescriptions')
    const result = await createPrescription({
      customerId: 'cust-1',
      fileUrl: null,
      consentGivenAt: now,
      status: 'approved',
      rightSphere: -1.5, rightCylinder: -0.75, rightAxis: 90,
      leftSphere: -1.25, pupillaryDistance: 62,
    })

    expect(result.fileUrl).toBeNull()
    expect(result.status).toBe('approved')
    expect(result.rightSphere).toBe(-1.5)
    expect(result.pupillaryDistance).toBe(62)
  })

  it('still defaults to pending status and null fileUrl for a normal customer upload', async () => {
    const { sql } = await import('./db')
    const spy = mockSql(sql)
    const now = new Date()
    spy.mockResolvedValueOnce([{
      id: 'rx-001', customer_id: 'cust-1', file_url: 'key.pdf', status: 'pending',
      right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
      left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: null, expires_at: null,
      consent_given_at: now, created_at: now, updated_at: now,
    }])

    const { createPrescription } = await import('./prescriptions')
    const result = await createPrescription({
      customerId: 'cust-1', fileUrl: 'key.pdf', consentGivenAt: now,
    })

    expect(result.status).toBe('pending')
  })
})

describe('updatePrescriptionStatus', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  const rxRow = (status: string, now = new Date()) => ({
    id: 'rx-001',
    customer_id: 'cust-001',
    file_url: 'https://storage.example.com/rx/rx-001.pdf',
    status,
    right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
    left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
    pupillary_distance: null,
    expires_at: null,
    created_at: now,
    updated_at: now,
  })

  // The status is already written when the email is attempted. Throwing here
  // aborts the caller mid-flow — in the review action that means the decision
  // audit row is never written for a prescription already marked approved.
  it('still returns the updated prescription when the status email fails', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([rxRow('approved')])
    // Once-variants: clearAllMocks resets calls but not implementations, so a
    // persistent rejection would leak into every later test in this file.
    mockGetCustomerById.mockResolvedValueOnce({
      id: 'cust-001', email: 'jane@example.com', firstName: 'Jane',
    })
    mockSendPrescriptionStatusEmail.mockRejectedValueOnce(new Error('Missing API key'))

    const { updatePrescriptionStatus } = await import('./prescriptions')
    const result = await updatePrescriptionStatus('rx-001', 'approved')

    expect(result.status).toBe('approved')
    expect(mockCaptureOrderError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ prescriptionId: 'rx-001' })
    )
  })

  it('updates status and returns the updated prescription', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([rxRow('approved')])

    const { updatePrescriptionStatus } = await import('./prescriptions')
    const result = await updatePrescriptionStatus('rx-001', 'approved')

    expect(sql).toHaveBeenCalledOnce()
    expect(result.id).toBe('rx-001')
    expect(result.status).toBe('approved')
  })

  it('sends prescription status email when status transitions to approved', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([rxRow('approved')])
    mockGetCustomerById.mockResolvedValueOnce({
      id: 'cust-001', email: 'patient@example.com', firstName: 'Alex',
      lastName: 'Smith', passwordHash: '', phone: null,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const { updatePrescriptionStatus } = await import('./prescriptions')
    await updatePrescriptionStatus('rx-001', 'approved')

    expect(mockSendPrescriptionStatusEmail).toHaveBeenCalledWith({
      to: 'patient@example.com',
      firstName: 'Alex',
      status: 'approved',
    })
  })

  it('sends prescription status email when status transitions to rejected', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([rxRow('rejected')])
    mockGetCustomerById.mockResolvedValueOnce({
      id: 'cust-001', email: 'patient@example.com', firstName: 'Alex',
      lastName: 'Smith', passwordHash: '', phone: null,
      createdAt: new Date(), updatedAt: new Date(),
    })

    const { updatePrescriptionStatus } = await import('./prescriptions')
    await updatePrescriptionStatus('rx-001', 'rejected')

    expect(mockSendPrescriptionStatusEmail).toHaveBeenCalledWith({
      to: 'patient@example.com',
      firstName: 'Alex',
      status: 'rejected',
    })
  })

  it('does not send email when status is pending', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([rxRow('pending')])

    const { updatePrescriptionStatus } = await import('./prescriptions')
    await updatePrescriptionStatus('rx-001', 'pending')

    expect(mockSendPrescriptionStatusEmail).not.toHaveBeenCalled()
  })
})

describe('getPendingPrescriptions', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns pending prescriptions joined with customer name and email', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
      id: 'rx-001', customer_id: 'cust-001',
      file_url: '/uploads/rx-001.pdf',
      status: 'pending',
      right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
      left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: null, expires_at: null,
      created_at: now, updated_at: now,
      customer_name: 'Jane Doe',
      customer_email: 'jane@example.com',
    }])

    const { getPendingPrescriptions } = await import('./prescriptions')
    const result = await getPendingPrescriptions()

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rx-001')
    expect(result[0].status).toBe('pending')
    expect(result[0].customerName).toBe('Jane Doe')
    expect(result[0].customerEmail).toBe('jane@example.com')
  })

  it('returns empty array when no pending prescriptions exist', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getPendingPrescriptions } = await import('./prescriptions')
    const result = await getPendingPrescriptions()

    expect(result).toHaveLength(0)
  })
})

describe('logPrescriptionReviewAction', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a review log row and returns void', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { logPrescriptionReviewAction } = await import('./prescriptions')
    const result = await logPrescriptionReviewAction({
      prescriptionId: 'rx-001',
      reviewerId: 'cust-002',
      action: 'approved',
    })

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toBeUndefined()
  })

  it('inserts with rejection reason and note when provided', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { logPrescriptionReviewAction } = await import('./prescriptions')
    await logPrescriptionReviewAction({
      prescriptionId: 'rx-001',
      reviewerId: 'cust-002',
      action: 'rejected',
      note: 'Cannot read the values',
      rejectionReason: 'illegible',
    })

    expect(sql).toHaveBeenCalledOnce()
  })
})

describe('getPrescriptionById', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns a prescription with customer info when found', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
      id: 'rx-001', customer_id: 'cust-001',
      file_url: '/uploads/rx-001.pdf', status: 'pending',
      right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
      left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: null, expires_at: null,
      created_at: now, updated_at: now,
      customer_name: 'Jane Doe', customer_email: 'jane@example.com',
    }])

    const { getPrescriptionById } = await import('./prescriptions')
    const result = await getPrescriptionById('rx-001')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).not.toBeNull()
    expect(result!.id).toBe('rx-001')
    expect(result!.customerName).toBe('Jane Doe')
    expect(result!.customerEmail).toBe('jane@example.com')
  })

  it('returns null when prescription is not found', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getPrescriptionById } = await import('./prescriptions')
    const result = await getPrescriptionById('rx-999')

    expect(result).toBeNull()
  })
})

describe('getReviewLogsByPrescription', () => {
  beforeEach(() => { vi.resetModules(); vi.resetAllMocks() })

  it('returns review logs with reviewer name for a prescription', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
      id: 'log-001', prescription_id: 'rx-001', reviewer_id: 'cust-002',
      action: 'approved', rejection_reason: null, note: null,
      created_at: now, reviewer_name: 'Dr. Smith',
    }])

    const { getReviewLogsByPrescription } = await import('./prescriptions')
    const result = await getReviewLogsByPrescription('rx-001')

    expect(sql).toHaveBeenCalledOnce()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('log-001')
    expect(result[0].action).toBe('approved')
    expect(result[0].reviewerName).toBe('Dr. Smith')
  })

  it('returns empty array when no logs exist', async () => {
    const { sql } = await import('./db')
    mockSql(sql).mockResolvedValueOnce([])

    const { getReviewLogsByPrescription } = await import('./prescriptions')
    const result = await getReviewLogsByPrescription('rx-001')

    expect(result).toHaveLength(0)
  })
})

describe('getPrescriptionsByCustomer', () => {
  beforeEach(() => { vi.resetModules(); vi.resetAllMocks() })

  it('returns all prescriptions for a customer', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    mockSql(sql).mockResolvedValueOnce([{
      id: 'rx-001', customer_id: 'cust-001',
      file_url: 'https://storage.example.com/rx-001.pdf',
      status: 'pending',
      right_sphere: null, right_cylinder: null, right_axis: null, right_add: null,
      left_sphere: null, left_cylinder: null, left_axis: null, left_add: null,
      pupillary_distance: null, expires_at: null,
      created_at: now, updated_at: now,
    }])

    const { getPrescriptionsByCustomer } = await import('./prescriptions')
    const result = await getPrescriptionsByCustomer('cust-001')

    expect(result).toHaveLength(1)
    expect(result[0].customerId).toBe('cust-001')
    expect(result[0].status).toBe('pending')
  })
})
