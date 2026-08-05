import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerById: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionsByCustomer: vi.fn() }))
vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))

const CUSTOMER_ID = 'cust-001'

function makeCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: CUSTOMER_ID, email: 'asha@example.com', passwordHash: 'hash',
    firstName: 'Asha', lastName: 'Rao', phone: null, role: 'customer' as const,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

function makePrescription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rx-001', customerId: CUSTOMER_ID, fileUrl: 'key.pdf', status: 'approved' as const,
    consentGivenAt: new Date('2026-02-01T10:00:00Z'),
    rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
    leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
    pupillaryDistance: null, expiresAt: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

async function setup({
  customer = makeCustomer(),
  prescriptions = [] as ReturnType<typeof makePrescription>[],
  orders = [] as unknown[],
} = {}) {
  const { getSession } = await import('@/lib/session')
  const { getCustomerById } = await import('@/lib/customers')
  const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
  const { getOrdersByCustomer } = await import('@/lib/orders')
  vi.mocked(getSession).mockReturnValue({ customerId: CUSTOMER_ID, role: 'customer' })
  vi.mocked(getCustomerById).mockResolvedValueOnce(customer as never)
  vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce(prescriptions as never)
  vi.mocked(getOrdersByCustomer).mockResolvedValueOnce(orders as never)

  const PrivacyPage = (await import('./page')).default
  render(await PrivacyPage())
}

const ORIGINAL_ENV = process.env

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

describe('PrivacyPage — access gate', () => {
  it('redirects to /login when there is no session', async () => {
    const { getSession } = await import('@/lib/session')
    const { redirect } = await import('next/navigation')
    vi.mocked(getSession).mockReturnValue(null)

    const PrivacyPage = (await import('./page')).default
    await expect(PrivacyPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
  })
})

describe('PrivacyPage — data summary', () => {
  it("shows the customer's own email and record counts", async () => {
    await setup({
      customer: makeCustomer({ email: 'asha@example.com' }),
      prescriptions: [makePrescription()],
      orders: [{}, {}],
    })

    expect(screen.getByText('asha@example.com')).toBeInTheDocument()
    expect(screen.getByText(/1 prescription/i)).toBeInTheDocument()
    expect(screen.getByText(/2 orders/i)).toBeInTheDocument()
  })
})

describe('PrivacyPage — consent status', () => {
  it('shows when consent was given for a prescription', async () => {
    await setup({
      prescriptions: [makePrescription({ id: 'rx-001', consentGivenAt: new Date('2026-02-01T10:00:00Z') })],
    })

    expect(screen.getByTestId('consent-status-rx-001')).toHaveTextContent(/2026/)
  })

  // Prescriptions uploaded before consent capture existed have no
  // consentGivenAt — must say so honestly, not fabricate a date.
  it('says consent predates capture for a prescription with no consentGivenAt', async () => {
    await setup({
      prescriptions: [makePrescription({ id: 'rx-002', consentGivenAt: null })],
    })

    expect(screen.getByTestId('consent-status-rx-002')).toHaveTextContent(/predates|not recorded/i)
  })
})

describe('PrivacyPage — data subject rights', () => {
  it('offers a data access/export request via email', async () => {
    await setup()

    const link = screen.getByRole('link', { name: /request.*data|export/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@visionnova.com'))
  })

  it('offers a correction/erasure request via email', async () => {
    await setup()

    const link = screen.getByRole('link', { name: /delete|erasure|correct/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@visionnova.com'))
  })

  it('offers a consent withdrawal request via email', async () => {
    await setup({ prescriptions: [makePrescription()] })

    const link = screen.getByRole('link', { name: /withdraw consent/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@visionnova.com'))
  })
})

describe('PrivacyPage — Grievance Officer', () => {
  it('shows the configured Grievance Officer contact', async () => {
    process.env.GRIEVANCE_OFFICER_NAME = 'Priya Sharma'
    process.env.GRIEVANCE_OFFICER_EMAIL = 'grievance@visionnova.com'

    await setup()

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'grievance@visionnova.com' })).toHaveAttribute(
      'href', 'mailto:grievance@visionnova.com'
    )
  })

  it('shows a loud alert, not silence, when the Grievance Officer is unconfigured', async () => {
    delete process.env.GRIEVANCE_OFFICER_NAME
    delete process.env.GRIEVANCE_OFFICER_EMAIL

    await setup()

    expect(screen.getByRole('alert')).toHaveTextContent(/grievance officer/i)
  })
})
