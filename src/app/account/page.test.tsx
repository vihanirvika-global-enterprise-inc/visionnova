import { render, screen, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Order, Prescription, Customer, OrderStatus, EyeTestAppointment } from '@/types'

vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionsByCustomer: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerById: vi.fn() }))
vi.mock('@/lib/eyeTestAppointments', () => ({
  getAppointmentsByCustomer: vi.fn(),
  getOptometrists: vi.fn(),
}))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT') }),
}))

const CUSTOMER_ID = 'cust-001'

function makeOrder(overrides: Partial<Order> = {}): Order {
  const now = new Date()
  return {
    id: 'order-001', customerId: CUSTOMER_ID, status: 'delivered',
    totalAmount: 2499,
    shippingAddress: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN' },
    carrier: null, trackingNumber: null, shippedAt: null, deliveredAt: null,
    createdAt: now, updatedAt: now,
    ...overrides,
  }
}

function makePrescription(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: 'rx-001', customerId: CUSTOMER_ID,
    fileUrl: 'https://storage.example.com/rx-001.pdf',
    status: 'approved',
    consentGivenAt: new Date(),
    rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null,
    leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null,
    pupillaryDistance: null, expiresAt: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: CUSTOMER_ID, email: 'asha@example.com', passwordHash: 'hash',
    firstName: 'Asha', lastName: 'Rao', phone: null, role: 'customer',
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

function makeOptometrist(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'opt-001', email: 'opt@visionnova.com', passwordHash: 'hash',
    firstName: 'Ada', lastName: 'Lovelace', phone: null, role: 'optometrist',
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

function makeAppointment(overrides: Partial<EyeTestAppointment> = {}): EyeTestAppointment {
  return {
    id: 'appt-001', customerId: CUSTOMER_ID, optometristId: 'opt-001',
    scheduledAt: new Date('2026-03-02T10:00:00.000Z'), status: 'scheduled',
    createdAt: new Date(),
    ...overrides,
  }
}

async function setup({
  orders = [] as Order[],
  prescriptions = [] as Prescription[],
  customer = makeCustomer() as Customer | null,
  appointments = [] as EyeTestAppointment[],
  optometrists = [] as Customer[],
  searchParams = {} as { orderTab?: string },
} = {}) {
  const { getOrdersByCustomer } = await import('@/lib/orders')
  const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
  const { getCustomerById } = await import('@/lib/customers')
  const { getAppointmentsByCustomer, getOptometrists } = await import('@/lib/eyeTestAppointments')
  vi.mocked(getOrdersByCustomer).mockResolvedValueOnce(orders)
  vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce(prescriptions)
  vi.mocked(getCustomerById).mockResolvedValueOnce(customer)
  vi.mocked(getAppointmentsByCustomer).mockResolvedValueOnce(appointments)
  vi.mocked(getOptometrists).mockResolvedValueOnce(optometrists)

  const AccountPage = (await import('./page')).default
  render(await AccountPage({ searchParams }))
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  const { getSession } = await import('@/lib/session')
  vi.mocked(getSession).mockReturnValue({ customerId: CUSTOMER_ID, role: 'customer' })
})

describe('AccountPage', () => {
  it('shows an empty state when there are no orders', async () => {
    await setup()
    expect(screen.getByText('No orders yet')).toBeInTheDocument()
  })

  it('renders a list of orders for the customer', async () => {
    await setup({ orders: [makeOrder()] })
    expect(screen.getByText(/order-001/)).toBeInTheDocument()
  })

  it('links each order to its tracking screen', async () => {
    await setup({ orders: [makeOrder({ status: 'shipped' })] })
    expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute(
      'href', '/order/order-001'
    )
  })

  // Prices are INR; a dollar sign on a rupee figure misstates the amount by ~83x.
  it('shows order totals in rupees, never dollars', async () => {
    await setup({ orders: [makeOrder()] })
    const total = screen.getByTestId('order-total-order-001')
    expect(total).toHaveTextContent('₹')
    expect(total).not.toHaveTextContent('$')
  })

  it('renders a link to upload a prescription', async () => {
    await setup()
    expect(screen.getByRole('link', { name: /upload prescription/i })).toHaveAttribute(
      'href', '/prescription-upload'
    )
  })

  it('renders a link to the wishlist', async () => {
    await setup()
    expect(screen.getByRole('link', { name: /my wishlist/i })).toHaveAttribute(
      'href', '/account/wishlist'
    )
  })

  it('renders a link to privacy', async () => {
    await setup()
    expect(screen.getByRole('link', { name: /my privacy/i })).toHaveAttribute(
      'href', '/account/privacy'
    )
  })

  it('fetches orders and prescriptions for the session customer', async () => {
    const { getOrdersByCustomer } = await import('@/lib/orders')
    const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
    await setup()

    expect(getOrdersByCustomer).toHaveBeenCalledWith(CUSTOMER_ID)
    expect(getPrescriptionsByCustomer).toHaveBeenCalledWith(CUSTOMER_ID)
  })

  it('renders the customer prescription status', async () => {
    await setup({ prescriptions: [makePrescription({ status: 'approved' })] })
    expect(screen.getByText(/approved/i)).toBeInTheDocument()
  })
})

// Middleware now rejects an invalid session before the page runs, so this is
// unreachable in practice — but the page must not depend on that. The old
// `?? ''` fallback only failed closed by accident of customer_id being a uuid
// column; against a text column it would have silently rendered an empty
// account, telling a customer with a broken session they have no orders.
describe('AccountPage — no valid session', () => {
  it('redirects to /login rather than querying with an empty customer id', async () => {
    const { getSession } = await import('@/lib/session')
    const { redirect } = await import('next/navigation')
    const { getOrdersByCustomer } = await import('@/lib/orders')
    vi.mocked(getSession).mockReturnValue(null)

    const AccountPage = (await import('./page')).default

    await expect(AccountPage({})).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
    expect(getOrdersByCustomer).not.toHaveBeenCalled()
  })
})

describe('AccountPage — greeting', () => {
  it('greets the customer by their real first name', async () => {
    await setup({ customer: makeCustomer({ firstName: 'Asha' }) })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Asha/)
  })

  it('looks the customer up by the session customer id, once', async () => {
    const { getCustomerById } = await import('@/lib/customers')
    await setup()

    expect(getCustomerById).toHaveBeenCalledWith(CUSTOMER_ID)
    expect(getCustomerById).toHaveBeenCalledTimes(1)
  })

  // The session can outlive the customer row (deleted account, stale cookie).
  // The page must still render rather than crashing on a null customer.
  it('falls back to a generic greeting when the customer record is missing', async () => {
    await setup({ customer: null })
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})

describe('AccountPage — prescription expiry', () => {
  it('shows the expiry date when the prescription has one', async () => {
    await setup({
      prescriptions: [makePrescription({ expiresAt: new Date('2027-03-15T00:00:00Z') })],
    })

    const expiry = screen.getByTestId('rx-expiry-rx-001')
    expect(expiry).toHaveTextContent(/2027/)
    expect(expiry).toHaveTextContent(/expires/i)
  })

  // expires_at is nullable — an unverified or legacy prescription has none.
  it('says so explicitly rather than rendering a blank or invalid date when expiry is null', async () => {
    await setup({ prescriptions: [makePrescription({ expiresAt: null })] })

    const expiry = screen.getByTestId('rx-expiry-rx-001')
    expect(expiry).toHaveTextContent(/no expiry/i)
    expect(expiry).not.toHaveTextContent(/invalid/i)
    expect(expiry).not.toHaveTextContent(/NaN/)
  })
})

// ST-018 (B3. My Prescriptions Vault — "every Rx access is written to the
// audit log"). The link itself doesn't log anything — it points at the
// already-audited API route (readPrescriptionForSession) — this only proves
// customers can actually reach that route from their own dashboard.
describe('AccountPage — prescription file access', () => {
  it('links each prescription to its file via the audited API route', async () => {
    await setup({ prescriptions: [makePrescription({ id: 'rx-001' })] })

    const link = screen.getByRole('link', { name: /view file/i })
    expect(link).toHaveAttribute('href', '/api/prescriptions/rx-001/file')
  })

  // ST-023: a digitally-authored prescription (Digital Rx Writing Tool) has
  // no uploaded document — the link would open nothing.
  it('does not render a View File link for a digitally-authored prescription with no file', async () => {
    await setup({ prescriptions: [makePrescription({ id: 'rx-001', fileUrl: null })] })

    expect(screen.queryByRole('link', { name: /view file/i })).not.toBeInTheDocument()
  })
})

// EP-010 BUG-004 / FTC Eyeglass Rule (16 CFR 456.2): the patient must be
// able to get a copy of their prescription. A digitally-authored Rx has no
// file to view, so the clinical values themselves have to be reachable here
// instead — before this, they existed only in the database.
describe('AccountPage — digitally-authored prescription details', () => {
  it('shows the actual clinical values for a prescription with no file', async () => {
    await setup({
      prescriptions: [makePrescription({
        id: 'rx-001', fileUrl: null,
        rightSphere: -2.5, rightCylinder: -0.75, rightAxis: 90, rightAdd: null,
        leftSphere: -2.25, leftCylinder: -0.5, leftAxis: 85, leftAdd: null,
        pupillaryDistance: 62,
      })],
    })

    const details = screen.getByTestId('rx-clinical-values-rx-001')
    expect(details).toHaveTextContent('-2.5')
    expect(details).toHaveTextContent('-0.75')
    expect(details).toHaveTextContent('90')
    expect(details).toHaveTextContent('62')
  })

  it('does not render clinical-value details for a prescription that has an uploaded file', async () => {
    await setup({ prescriptions: [makePrescription({ id: 'rx-001', fileUrl: 'https://storage.example.com/rx-001.pdf' })] })

    expect(screen.queryByTestId('rx-clinical-values-rx-001')).not.toBeInTheDocument()
  })
})

describe('AccountPage — rejected prescription re-upload', () => {
  it('offers a re-upload link on a rejected prescription', async () => {
    await setup({ prescriptions: [makePrescription({ status: 'rejected' })] })

    const link = screen.getByRole('link', { name: /re-upload/i })
    expect(link).toHaveAttribute('href', '/prescription-upload')
  })

  it.each(['approved', 'pending'] as const)(
    'does not offer a re-upload link on a %s prescription',
    async (status) => {
      await setup({ prescriptions: [makePrescription({ status })] })
      expect(screen.queryByRole('link', { name: /re-upload/i })).not.toBeInTheDocument()
    }
  )

  // Previously the only upload affordance lived in the empty state, so a
  // customer whose sole prescription was rejected had nowhere to go.
  it('keeps an upload affordance available when the list is non-empty', async () => {
    await setup({ prescriptions: [makePrescription({ status: 'rejected' })] })
    expect(screen.getByRole('link', { name: /upload (a )?(new )?prescription/i })).toHaveAttribute(
      'href', '/prescription-upload'
    )
  })
})

describe('AccountPage — order status labels', () => {
  it.each([
    ['pending', 'Placed'],
    ['paid', 'Paid'],
    ['payment_failed', 'Payment failed'],
    ['processing', 'Processing'],
    ['shipped', 'Shipped'],
    ['delivered', 'Delivered'],
    ['cancelled', 'Cancelled'],
  ] as const)('renders %s as the human-readable label %s', async (status, label) => {
    await setup({ orders: [makeOrder({ status: status as OrderStatus })] })

    const badge = screen.getByTestId('order-status-order-001')
    expect(badge).toHaveTextContent(label)
  })

  it('never renders a raw snake_case enum value to the customer', async () => {
    await setup({ orders: [makeOrder({ status: 'payment_failed' })] })

    const badge = screen.getByTestId('order-status-order-001')
    expect(badge).not.toHaveTextContent('payment_failed')
  })
})

// ST-017 (B2. My Orders & Order Detail — "order tabs filter correctly").
describe('AccountPage — order tabs', () => {
  it('renders all 5 filter tabs', async () => {
    await setup({ orders: [makeOrder()] })

    const nav = screen.getByRole('navigation', { name: /filter orders/i })
    expect(within(nav).getByRole('link', { name: 'All' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Processing' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Shipped' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Delivered' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Cancelled' })).toBeInTheDocument()
  })

  it('shows every order under the default "all" tab', async () => {
    await setup({
      orders: [
        makeOrder({ id: 'order-shipped', status: 'shipped' }),
        makeOrder({ id: 'order-delivered', status: 'delivered' }),
      ],
    })

    expect(screen.getByText(/order-shipped/)).toBeInTheDocument()
    expect(screen.getByText(/order-delivered/)).toBeInTheDocument()
  })

  it('filters to only shipped orders when orderTab=shipped', async () => {
    await setup({
      orders: [
        makeOrder({ id: 'order-shipped', status: 'shipped' }),
        makeOrder({ id: 'order-delivered', status: 'delivered' }),
      ],
      searchParams: { orderTab: 'shipped' },
    })

    expect(screen.getByText(/order-shipped/)).toBeInTheDocument()
    expect(screen.queryByText(/order-delivered/)).not.toBeInTheDocument()
  })

  it('shows a per-tab empty state when the tab has no matching orders', async () => {
    await setup({
      orders: [makeOrder({ id: 'order-delivered', status: 'delivered' })],
      searchParams: { orderTab: 'cancelled' },
    })

    expect(screen.getByText('No orders in this view')).toBeInTheDocument()
    expect(screen.queryByText('No orders yet')).not.toBeInTheDocument()
  })

  it('marks the active tab', async () => {
    await setup({ orders: [makeOrder()], searchParams: { orderTab: 'shipped' } })

    expect(screen.getByRole('link', { name: 'Shipped' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current')
  })

  it('falls back to "all" for an unrecognised orderTab value rather than showing nothing', async () => {
    await setup({
      orders: [makeOrder({ id: 'order-1', status: 'shipped' })],
      searchParams: { orderTab: 'not-a-real-tab' },
    })

    expect(screen.getByText(/order-1/)).toBeInTheDocument()
  })
})

describe('AccountPage — eye test appointments', () => {
  it('shows an empty state and a link to book when there are no appointments', async () => {
    await setup()
    expect(screen.getByText(/no eye test appointments/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /book an eye test/i })).toHaveAttribute(
      'href', '/eye-test'
    )
  })

  it('lists an appointment with the optometrist name and scheduled time', async () => {
    await setup({
      appointments: [makeAppointment()],
      optometrists: [makeOptometrist()],
    })

    expect(screen.getByText(/dr\. ada lovelace/i)).toBeInTheDocument()
  })

  // The optometrist_id on an appointment can outlive the customer row it
  // points at (role change, deletion) — the list must degrade, not crash.
  it('degrades gracefully when the optometrist for an appointment cannot be found', async () => {
    await setup({
      appointments: [makeAppointment()],
      optometrists: [],
    })

    expect(screen.getByText(/appt-001/i)).toBeInTheDocument()
  })
})
