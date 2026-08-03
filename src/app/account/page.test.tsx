import { render, screen, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Order, Prescription, Customer, OrderStatus } from '@/types'

vi.mock('@/lib/orders', () => ({ getOrdersByCustomer: vi.fn() }))
vi.mock('@/lib/prescriptions', () => ({ getPrescriptionsByCustomer: vi.fn() }))
vi.mock('@/lib/customers', () => ({ getCustomerById: vi.fn() }))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

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

async function setup({
  orders = [] as Order[],
  prescriptions = [] as Prescription[],
  customer = makeCustomer() as Customer | null,
} = {}) {
  const { getOrdersByCustomer } = await import('@/lib/orders')
  const { getPrescriptionsByCustomer } = await import('@/lib/prescriptions')
  const { getCustomerById } = await import('@/lib/customers')
  vi.mocked(getOrdersByCustomer).mockResolvedValueOnce(orders)
  vi.mocked(getPrescriptionsByCustomer).mockResolvedValueOnce(prescriptions)
  vi.mocked(getCustomerById).mockResolvedValueOnce(customer)

  const AccountPage = (await import('./page')).default
  render(await AccountPage())
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
