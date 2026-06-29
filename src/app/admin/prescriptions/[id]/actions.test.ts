import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as NextHeaders from 'next/headers'
import * as NextNavigation from 'next/navigation'
import * as Prescriptions from '@/lib/prescriptions'
import * as Session from '@/lib/session'

vi.mock('@/lib/prescriptions', () => ({
  updatePrescriptionStatus: vi.fn(),
  logPrescriptionReviewAction: vi.fn(),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

let mockSet: ReturnType<typeof vi.fn>
let mockGet: ReturnType<typeof vi.fn>
let mockDelete: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockSet = vi.fn()
  mockGet = vi.fn()
  mockDelete = vi.fn()
  vi.spyOn(NextHeaders, 'cookies').mockReturnValue(
    { set: mockSet, get: mockGet, delete: mockDelete } as any
  )
  vi.mocked(Session.getSession).mockReturnValue({ customerId: 'reviewer-001', role: 'optometrist' })
  vi.mocked(Prescriptions.updatePrescriptionStatus).mockResolvedValue({} as any)
  vi.mocked(Prescriptions.logPrescriptionReviewAction).mockResolvedValue(undefined)
})

afterEach(() => { vi.restoreAllMocks() })

describe('reviewPrescription', () => {
  it('calls updatePrescriptionStatus and logPrescriptionReviewAction on approval', async () => {
    const { reviewPrescription } = await import('./actions')
    const fd = new FormData()
    fd.set('prescriptionId', 'rx-001')
    fd.set('action', 'approved')

    await reviewPrescription(fd)

    expect(Prescriptions.updatePrescriptionStatus).toHaveBeenCalledWith('rx-001', 'approved')
    expect(Prescriptions.logPrescriptionReviewAction).toHaveBeenCalledWith(
      expect.objectContaining({ prescriptionId: 'rx-001', reviewerId: 'reviewer-001', action: 'approved' })
    )
  })

  it('passes rejectionReason and note when rejecting', async () => {
    const { reviewPrescription } = await import('./actions')
    const fd = new FormData()
    fd.set('prescriptionId', 'rx-001')
    fd.set('action', 'rejected')
    fd.set('rejectionReason', 'illegible')
    fd.set('note', 'Cannot read the lens values')

    await reviewPrescription(fd)

    expect(Prescriptions.logPrescriptionReviewAction).toHaveBeenCalledWith(
      expect.objectContaining({ rejectionReason: 'illegible', note: 'Cannot read the lens values' })
    )
  })

  it('redirects to /admin/prescriptions after review', async () => {
    const { reviewPrescription } = await import('./actions')
    const fd = new FormData()
    fd.set('prescriptionId', 'rx-001')
    fd.set('action', 'approved')

    await reviewPrescription(fd)

    expect(NextNavigation.redirect).toHaveBeenCalledWith('/admin/prescriptions')
  })

  it('redirects to /login when there is no session', async () => {
    vi.mocked(Session.getSession).mockReturnValue(null)

    const { reviewPrescription } = await import('./actions')
    const fd = new FormData()
    fd.set('prescriptionId', 'rx-001')
    fd.set('action', 'approved')

    await reviewPrescription(fd)

    expect(NextNavigation.redirect).toHaveBeenCalledWith('/login')
    expect(Prescriptions.updatePrescriptionStatus).not.toHaveBeenCalled()
  })
})
