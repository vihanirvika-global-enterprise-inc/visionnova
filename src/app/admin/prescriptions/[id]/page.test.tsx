import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prescriptions', () => ({
  getPrescriptionById: vi.fn(),
  getReviewLogsByPrescription: vi.fn(),
}))
vi.mock('./actions', () => ({ reviewPrescription: vi.fn() }))

const now = new Date()
const mockPrescription = {
  id: 'rx-001', customerId: 'cust-001',
  fileUrl: '/uploads/rx-001.pdf',
  status: 'pending' as const,
  rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
  leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
  pupillaryDistance: null, expiresAt: null,
  createdAt: now, updatedAt: now,
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
}

describe('ReviewPrescriptionPage', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { getReviewLogsByPrescription } = await import('@/lib/prescriptions')
    vi.mocked(getReviewLogsByPrescription).mockResolvedValue([])
  })

  it('renders the patient name', async () => {
    const { getPrescriptionById } = await import('@/lib/prescriptions')
    vi.mocked(getPrescriptionById).mockResolvedValueOnce(mockPrescription)

    const ReviewPrescriptionPage = (await import('./page')).default
    render(await ReviewPrescriptionPage({ params: { id: 'rx-001' } }))

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders a link to the prescription file', async () => {
    const { getPrescriptionById } = await import('@/lib/prescriptions')
    vi.mocked(getPrescriptionById).mockResolvedValueOnce(mockPrescription)

    const ReviewPrescriptionPage = (await import('./page')).default
    render(await ReviewPrescriptionPage({ params: { id: 'rx-001' } }))

    // Never the stored key: the file is reachable only through the
    // session-checked route.
    const link = screen.getByRole('link', { name: /view prescription/i })
    expect(link).toHaveAttribute('href', '/api/prescriptions/rx-001/file')
  })

  it('renders an Approve submit button', async () => {
    const { getPrescriptionById } = await import('@/lib/prescriptions')
    vi.mocked(getPrescriptionById).mockResolvedValueOnce(mockPrescription)

    const ReviewPrescriptionPage = (await import('./page')).default
    render(await ReviewPrescriptionPage({ params: { id: 'rx-001' } }))

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
  })

  it('renders a Reject submit button', async () => {
    const { getPrescriptionById } = await import('@/lib/prescriptions')
    vi.mocked(getPrescriptionById).mockResolvedValueOnce(mockPrescription)

    const ReviewPrescriptionPage = (await import('./page')).default
    render(await ReviewPrescriptionPage({ params: { id: 'rx-001' } }))

    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('shows review history when logs exist', async () => {
    const { getPrescriptionById, getReviewLogsByPrescription } = await import('@/lib/prescriptions')
    vi.mocked(getPrescriptionById).mockResolvedValueOnce(mockPrescription)
    vi.mocked(getReviewLogsByPrescription).mockResolvedValueOnce([{
      id: 'log-001', prescriptionId: 'rx-001', reviewerId: 'cust-002',
      reviewerName: 'Dr. Smith', action: 'approved' as const,
      rejectionReason: null, note: null, createdAt: now,
    }])

    const ReviewPrescriptionPage = (await import('./page')).default
    render(await ReviewPrescriptionPage({ params: { id: 'rx-001' } }))

    expect(screen.getByText(/review history/i)).toBeInTheDocument()
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument()
    expect(screen.getByText(/approved/i)).toBeInTheDocument()
  })
})
