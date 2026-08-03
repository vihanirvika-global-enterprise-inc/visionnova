import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prescriptions', () => ({
  getReviewLogsByPrescription: vi.fn(),
}))
vi.mock('@/lib/prescriptionAccess', async () => {
  const actual = await vi.importActual<typeof import('@/lib/prescriptionAccess')>(
    '@/lib/prescriptionAccess'
  )
  return { ...actual, readPrescriptionMetadataForSession: vi.fn() }
})
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
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

async function renderPage(id = 'rx-001') {
  const ReviewPrescriptionPage = (await import('./page')).default
  render(await ReviewPrescriptionPage({ params: { id } }))
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  const { getReviewLogsByPrescription } = await import('@/lib/prescriptions')
  const { readPrescriptionMetadataForSession } = await import('@/lib/prescriptionAccess')
  const { getSession } = await import('@/lib/session')
  vi.mocked(getReviewLogsByPrescription).mockResolvedValue([])
  vi.mocked(readPrescriptionMetadataForSession).mockResolvedValue({
    ok: true, prescription: mockPrescription,
  })
  vi.mocked(getSession).mockReturnValue({ customerId: 'reviewer-001', role: 'optometrist' })
})

describe('ReviewPrescriptionPage', () => {
  it('renders the patient name', async () => {
    await renderPage()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders a link to the prescription file', async () => {
    await renderPage()

    // Never the stored key: the file is reachable only through the
    // session-checked route.
    const link = screen.getByRole('link', { name: /view prescription/i })
    expect(link).toHaveAttribute('href', '/api/prescriptions/rx-001/file')
  })

  // The trail is recorded on every read; a reviewer needs a way to reach it
  // without writing SQL.
  it('links to the access log', async () => {
    await renderPage()

    expect(screen.getByRole('link', { name: /access log/i })).toHaveAttribute(
      'href',
      '/admin/prescriptions/rx-001/access-log'
    )
  })

  it('renders an Approve submit button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
  })

  it('renders a Reject submit button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('shows review history when logs exist', async () => {
    const { getReviewLogsByPrescription } = await import('@/lib/prescriptions')
    vi.mocked(getReviewLogsByPrescription).mockResolvedValueOnce([{
      id: 'log-001', prescriptionId: 'rx-001', reviewerId: 'cust-002',
      reviewerName: 'Dr. Smith', action: 'approved' as const,
      rejectionReason: null, note: null, createdAt: now,
    }])

    await renderPage()

    expect(screen.getByText(/review history/i)).toBeInTheDocument()
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument()
    expect(screen.getByText(/approved/i)).toBeInTheDocument()
  })
})

// This screen shows the patient's name, email and submission date. Middleware
// gates /admin, but the page re-checks rather than trusting a matcher stays
// correct — matching the access-log page's existing pattern.
describe('ReviewPrescriptionPage — role gate', () => {
  it.each([
    ['no session', null],
    ['a plain customer', { customerId: 'cust-001', role: 'customer' }],
    ['ops', { customerId: 'ops-001', role: 'ops' }],
  ])('404s %s without reading the prescription', async (_label, session) => {
    const { getSession } = await import('@/lib/session')
    const { readPrescriptionMetadataForSession } = await import('@/lib/prescriptionAccess')
    vi.mocked(getSession).mockReturnValue(session as never)

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(readPrescriptionMetadataForSession).not.toHaveBeenCalled()
  })

  it.each(['optometrist', 'admin'])('allows a %s through', async (role) => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockReturnValue({ customerId: 'reviewer-001', role })

    await renderPage()

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })
})

// Opening this screen exposes patient identity, so it belongs on the DPDP
// trail even though no file is fetched.
describe('ReviewPrescriptionPage — metadata access logging', () => {
  it('records the metadata read through the audited access door', async () => {
    const { readPrescriptionMetadataForSession } = await import('@/lib/prescriptionAccess')

    await renderPage()

    expect(readPrescriptionMetadataForSession).toHaveBeenCalledWith(
      'rx-001',
      { customerId: 'reviewer-001', role: 'optometrist' }
    )
  })

  it('404s when the audited read is denied rather than rendering unlogged', async () => {
    const { readPrescriptionMetadataForSession } = await import('@/lib/prescriptionAccess')
    vi.mocked(readPrescriptionMetadataForSession).mockResolvedValue({
      ok: false, reason: 'audit_failed',
    })

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s an unknown prescription', async () => {
    const { readPrescriptionMetadataForSession } = await import('@/lib/prescriptionAccess')
    vi.mocked(readPrescriptionMetadataForSession).mockResolvedValue({
      ok: false, reason: 'not_found',
    })

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
