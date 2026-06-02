import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('./db', () => ({ sql: vi.fn() }))

describe('createOptometristReview', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('inserts a review and returns it', async () => {
    const { sql } = await import('./db')
    const now = new Date()
    vi.mocked(sql).mockResolvedValueOnce([{
      id: 'review-001', prescription_id: 'rx-001',
      reviewer_name: 'Dr. Smith', status: 'approved',
      notes: 'Looks good', reviewed_at: now, created_at: now,
    }])

    const { createOptometristReview } = await import('./optometristReviews')
    const result = await createOptometristReview({
      prescriptionId: 'rx-001', reviewerName: 'Dr. Smith',
      status: 'approved', notes: 'Looks good',
    })

    expect(result.id).toBe('review-001')
    expect(result.status).toBe('approved')
    expect(result.reviewerName).toBe('Dr. Smith')
  })
})
