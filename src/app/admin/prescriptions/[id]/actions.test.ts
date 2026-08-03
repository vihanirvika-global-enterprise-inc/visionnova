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
  // Why the email fix matters here: updatePrescriptionStatus writes the decision
  // and then sends mail. If the send throws, the throw propagates and
  // logPrescriptionReviewAction never runs — leaving a prescription marked
  // approved with no record of who approved it.
  it('still writes the review audit when the status email fails', async () => {
    vi.mocked(Prescriptions.updatePrescriptionStatus).mockResolvedValue({
      id: 'rx-001', status: 'approved',
    } as any)

    const { reviewPrescription } = await import('./actions')
    const fd = new FormData()
    fd.append('prescriptionId', 'rx-001')
    fd.append('action', 'approved')

    await reviewPrescription(fd)

    expect(Prescriptions.logPrescriptionReviewAction).toHaveBeenCalledWith(
      expect.objectContaining({
        prescriptionId: 'rx-001',
        reviewerId: 'reviewer-001',
        action: 'approved',
      })
    )
  })

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

// Middleware's /admin matcher intercepts this action today, but that is a
// config-line guarantee on the decision that approves medical data. The role
// check belongs on the action itself.
describe('reviewPrescription — role gate', () => {
  it.each([
    ['customer', 'a plain customer'],
    ['ops', 'ops, deliberately excluded from clinical review'],
  ])('refuses a %s session (%s) without changing status or writing a review log', async (role) => {
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'cust-001', role })

    const { reviewPrescription } = await import('./actions')
    const fd = new FormData()
    fd.set('prescriptionId', 'rx-001')
    fd.set('action', 'approved')

    await reviewPrescription(fd)

    expect(Prescriptions.updatePrescriptionStatus).not.toHaveBeenCalled()
    expect(Prescriptions.logPrescriptionReviewAction).not.toHaveBeenCalled()
  })

  it.each(['optometrist', 'admin'])('allows a %s session through', async (role) => {
    vi.mocked(Session.getSession).mockReturnValue({ customerId: 'reviewer-001', role })

    const { reviewPrescription } = await import('./actions')
    const fd = new FormData()
    fd.set('prescriptionId', 'rx-001')
    fd.set('action', 'approved')

    await reviewPrescription(fd)

    expect(Prescriptions.updatePrescriptionStatus).toHaveBeenCalledWith('rx-001', 'approved')
  })
})
