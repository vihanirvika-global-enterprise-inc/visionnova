import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerByEmail: vi.fn() }))
vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionsByCustomer: vi.fn() }))
vi.mock('@/lib/prescriptionAccessLogs', () => ({ getAccessLogsByCustomer: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import { getSession } from '@/lib/session'
import { getCustomerByEmail } from '@/lib/customers'
import { getOrdersByCustomer } from '@/lib/orders'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'
import { getAccessLogsByCustomer } from '@/lib/prescriptionAccessLogs'
import SupportConsolePage from './page'

const CUSTOMER_ID = 'cust-001'
const PRESCRIPTION_ID = 'rx-001'

const customer = {
  id: 'cust-001',
  email: 'sam@example.com',
  firstName: 'Sam',
  lastName: 'Jones',
  phone: '+91 98765 43210',
  role: 'customer' as const,
  createdAt: new Date('2026-01-05T09:00:00Z'),
  updatedAt: new Date('2026-01-05T09:00:00Z'),
}

const order = {
  id: 'order-001',
  customerId: 'cust-001',
  status: 'shipped' as const,
  totalAmount: 2499,
  shippingAddress: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN' },
  carrier: 'Delhivery',
  trackingNumber: 'DL123456789',
  shippedAt: new Date('2026-07-20T09:00:00Z'),
  deliveredAt: null,
  createdAt: new Date('2026-07-18T09:00:00Z'),
  updatedAt: new Date('2026-07-20T09:00:00Z'),
}

const prescription = {
  id: 'rx-001',
  customerId: 'cust-001',
  fileUrl: 'k.pdf',
  status: 'approved' as const,
  consentGivenAt: new Date('2026-07-01T09:00:00Z'),
  rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
  leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
  pupillaryDistance: null,
  expiresAt: null,
  createdAt: new Date('2026-07-01T09:00:00Z'),
  updatedAt: new Date('2026-07-01T09:00:00Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockReturnValue({ customerId: 'admin-1', role: 'admin' })
  vi.mocked(getCustomerByEmail).mockResolvedValue(customer as never)
  vi.mocked(getOrdersByCustomer).mockResolvedValue([order] as never)
  vi.mocked(getPrescriptionsByCustomer).mockResolvedValue([prescription] as never)
  vi.mocked(getAccessLogsByCustomer).mockResolvedValue([] as never)
})

async function renderPage(searchParams: { email?: string } = {}) {
  return render(await SupportConsolePage({ searchParams }))
}

describe('SupportConsolePage — gating', () => {
  it('404s an unauthenticated request', async () => {
    vi.mocked(getSession).mockReturnValue(null)

    await expect(renderPage({ email: 'sam@example.com' })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getCustomerByEmail).not.toHaveBeenCalled()
  })

  // Full order + Rx history is exactly the kind of consolidated PII view that
  // shouldn't be reachable by a plain customer role.
  it('404s a plain customer', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'cust-001', role: 'customer' })

    await expect(renderPage({ email: 'sam@example.com' })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getCustomerByEmail).not.toHaveBeenCalled()
  })

  // Contract change: the ops console admits ops, not optometrist. An
  // optometrist's gate is the prescription review queue, which is unchanged.
  it.each(['ops', 'admin'])('allows a %s', async (role) => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'staff-1', role })

    await renderPage({ email: 'sam@example.com' })

    expect(getCustomerByEmail).toHaveBeenCalledWith('sam@example.com')
  })
})

describe('SupportConsolePage — search', () => {
  it('shows only the search form when no lookup has been made yet', async () => {
    await renderPage()

    expect(screen.getByLabelText(/customer email/i)).toBeInTheDocument()
    expect(getCustomerByEmail).not.toHaveBeenCalled()
    expect(screen.queryByText(order.id)).not.toBeInTheDocument()
  })

  it('reports plainly when no customer matches the email', async () => {
    vi.mocked(getCustomerByEmail).mockResolvedValue(null)

    await renderPage({ email: 'nobody@example.com' })

    expect(screen.getByText(/no customer found/i)).toBeInTheDocument()
    expect(getOrdersByCustomer).not.toHaveBeenCalled()
  })
})

describe('SupportConsolePage — customer found', () => {
  it('identifies the customer', async () => {
    await renderPage({ email: 'sam@example.com' })

    expect(screen.getByText('Sam Jones')).toBeInTheDocument()
    expect(screen.getByText('sam@example.com')).toBeInTheDocument()
  })

  it('lists the full order history with shipment details', async () => {
    await renderPage({ email: 'sam@example.com' })

    expect(getOrdersByCustomer).toHaveBeenCalledWith('cust-001')
    expect(screen.getByText(/order-001/)).toBeInTheDocument()
    expect(screen.getByText(/Delhivery/)).toBeInTheDocument()
    expect(screen.getByText(/DL123456789/)).toBeInTheDocument()
  })

  // Clinical values (sphere/cylinder/axis) are deliberately not shown here —
  // opening those is a read of health data and belongs behind the audited
  // door at /admin/prescriptions/[id], not a bulk unaudited fetch on a
  // support search.
  it('lists prescriptions as a summary linking to the audited review screen', async () => {
    await renderPage({ email: 'sam@example.com' })

    expect(getPrescriptionsByCustomer).toHaveBeenCalledWith('cust-001')
    const link = screen.getByRole('link', { name: /rx-001/i })
    expect(link).toHaveAttribute('href', '/admin/prescriptions/rx-001')
    expect(screen.getByText(/approved/i)).toBeInTheDocument()
  })

  it('shows an empty state when the customer has no orders', async () => {
    vi.mocked(getOrdersByCustomer).mockResolvedValue([])

    await renderPage({ email: 'sam@example.com' })

    expect(screen.getByText(/no orders/i)).toBeInTheDocument()
  })

  it('shows an empty state when the customer has no prescriptions', async () => {
    vi.mocked(getPrescriptionsByCustomer).mockResolvedValue([])

    await renderPage({ email: 'sam@example.com' })

    expect(screen.getByText(/no prescriptions/i)).toBeInTheDocument()
  })
})

// A support agent fielding "who has seen my prescription?" needs the same
// trail the customer sees on /account/privacy. Same accessor, same rows.
describe('SupportConsolePage — access log', () => {
  it('shows who has read this customer’s prescriptions', async () => {
    vi.mocked(getAccessLogsByCustomer).mockResolvedValue([
      {
        id: 'log-1', prescriptionId: 'rx-1', accessorId: 'staff-9',
        accessorName: 'Dr Meera Nair', accessorRole: 'optometrist',
        accessType: 'file', accessedAt: new Date('2026-08-01T10:00:00Z'),
      },
    ] as never)

    await renderPage({ email: 'asha@example.com' })

    const section = screen.getByRole('region', { name: /access log/i })
    expect(within(section).getByText(/Dr Meera Nair/)).toBeInTheDocument()
  })

  it('says so plainly when nobody has accessed anything', async () => {
    vi.mocked(getAccessLogsByCustomer).mockResolvedValue([] as never)

    await renderPage({ email: 'asha@example.com' })

    const section = screen.getByRole('region', { name: /access log/i })
    expect(within(section).getByText(/no recorded access/i)).toBeInTheDocument()
  })

  it('scopes the trail to the looked-up customer', async () => {
    await renderPage({ email: 'asha@example.com' })

    expect(getAccessLogsByCustomer).toHaveBeenCalledWith(CUSTOMER_ID)
  })

  it('queries nothing before a search', async () => {
    await renderPage({})

    expect(getAccessLogsByCustomer).not.toHaveBeenCalled()
  })
})

// After the ops/clinical gate split, /admin/prescriptions/[id] is optometrist
// and admin only — so an ops agent following this link lands on
// /unauthorized. A link the current user cannot open is worse than none.
describe('SupportConsolePage — prescription link', () => {
  it('links to the review screen for a role that can open it', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'staff-1', role: 'admin' })

    await renderPage({ email: 'asha@example.com' })

    expect(screen.getByRole('link', { name: /prescription #/i }))
      .toHaveAttribute('href', `/admin/prescriptions/${PRESCRIPTION_ID}`)
  })

  it('does not link for an ops agent, who would land on /unauthorized', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'staff-1', role: 'ops' })

    await renderPage({ email: 'asha@example.com' })

    expect(screen.queryByRole('link', { name: /prescription #/i })).not.toBeInTheDocument()
  })

  it('still shows the prescription and its status to an ops agent', async () => {
    vi.mocked(getSession).mockReturnValue({ customerId: 'staff-1', role: 'ops' })

    await renderPage({ email: 'asha@example.com' })

    expect(screen.getByText(new RegExp(`Prescription #${PRESCRIPTION_ID}`))).toBeInTheDocument()
  })
})

// RULING: this stays a lookup console. Ticketing is a subsystem on the schema
// backlog — no queue, SLA, thread, canned replies or case actions has a table.
describe('SupportConsolePage — ships no ticket system', () => {
  it('offers no ticket queue or SLA timer', async () => {
    const { container } = await renderPage({ email: 'asha@example.com' })
    const text = container.textContent ?? ''

    expect(text).not.toMatch(/ticket|sla|open cases|overdue|hrs left/i)
  })

  it('offers no threaded conversation or reply box', async () => {
    await renderPage({ email: 'asha@example.com' })

    expect(screen.queryByRole('textbox', { name: /reply|message/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send|reply/i })).not.toBeInTheDocument()
  })

  it('offers no canned replies', async () => {
    const { container } = await renderPage({ email: 'asha@example.com' })

    expect(container.textContent ?? '').not.toMatch(/canned|delivery eta|apology \+ credit/i)
  })

  // These would each need an action that writes somewhere. None exists, and a
  // refund button that refunds nothing is the worst possible false affordance
  // on a console an agent uses while a customer is on the phone.
  it('offers no refund, replace or escalate action', async () => {
    await renderPage({ email: 'asha@example.com' })

    for (const label of [/refund/i, /replace/i, /escalate/i]) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
    }
  })

  it('states no lifetime-value or ticket-count metric it cannot compute', async () => {
    const { container } = await renderPage({ email: 'asha@example.com' })

    expect(container.textContent ?? '').not.toMatch(/lifetime|ltv|tickets? open/i)
  })
})
