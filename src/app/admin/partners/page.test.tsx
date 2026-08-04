import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/optometristPartners', () => ({ listPendingPartners: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

function makePendingPartner(overrides: Record<string, unknown> = {}) {
  return {
    id: 'partner-1', customerId: 'cust-1', clinicName: 'Sharma Eye Care',
    kycStatus: 'pending' as const, kycDocumentKey: 'key.pdf', referralCode: 'VN-ABC123',
    createdAt: new Date('2026-02-01T10:00:00Z'), updatedAt: new Date(),
    customerName: 'Priya Sharma', customerEmail: 'priya@example.com',
    ...overrides,
  }
}

async function setup({
  role = 'admin',
  partners = [] as ReturnType<typeof makePendingPartner>[],
} = {}) {
  const { getSession } = await import('@/lib/session')
  const { listPendingPartners } = await import('@/lib/optometristPartners')
  vi.mocked(getSession).mockReturnValue(role ? { customerId: 'staff-1', role } : null)
  // mockResolvedValue (persistent), not -Once: the access-gate tests never
  // reach this call at all (notFound() throws first), which would otherwise
  // leave an unconsumed queued value to leak into a later test.
  vi.mocked(listPendingPartners).mockResolvedValue(partners)

  const AdminPartnersPage = (await import('./page')).default
  render(await AdminPartnersPage())
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('AdminPartnersPage — access gate', () => {
  it('404s for a non-reviewer role', async () => {
    await expect(setup({ role: 'customer' as never })).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s when there is no session', async () => {
    await expect(setup({ role: null as never })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('AdminPartnersPage — pending queue', () => {
  it('shows an empty state when there are no pending partners', async () => {
    await setup({ partners: [] })
    expect(screen.getByText(/no pending/i)).toBeInTheDocument()
  })

  it('lists a pending partner with clinic name and owner details', async () => {
    await setup({ partners: [makePendingPartner()] })

    expect(screen.getByText('Sharma Eye Care')).toBeInTheDocument()
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText('priya@example.com')).toBeInTheDocument()
  })

  it('links to the KYC document', async () => {
    await setup({ partners: [makePendingPartner({ id: 'partner-1' })] })

    expect(screen.getByRole('link', { name: /view kyc document/i })).toHaveAttribute(
      'href', '/api/kyc/partner-1/file'
    )
  })

  it('renders Approve and Reject actions targeting the review action', async () => {
    await setup({ partners: [makePendingPartner({ id: 'partner-1' })] })

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })
})
