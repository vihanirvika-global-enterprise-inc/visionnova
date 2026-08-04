import { describe, it, expect } from 'vitest'
import { ORDER_STATUS_LABELS, orderStatusLabel, ORDER_TABS, filterOrdersByTab } from './orderStatus'
import type { OrderStatus, Order } from '@/types'

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'payment_failed', 'processing', 'shipped', 'delivered', 'cancelled',
]

describe('ORDER_STATUS_LABELS', () => {
  it('covers every one of the 7 order statuses', () => {
    for (const status of ALL_STATUSES) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy()
    }
  })

  // The raw enum values are database identifiers, not customer-facing copy.
  it('never exposes a raw snake_case enum value as a label', () => {
    for (const label of Object.values(ORDER_STATUS_LABELS)) {
      expect(label).not.toMatch(/_/)
    }
  })
})

describe('orderStatusLabel', () => {
  it.each([
    ['pending', 'Placed'],
    ['paid', 'Paid'],
    ['payment_failed', 'Payment failed'],
    ['processing', 'Processing'],
    ['shipped', 'Shipped'],
    ['delivered', 'Delivered'],
    ['cancelled', 'Cancelled'],
  ] as const)('maps %s to %s', (status, expected) => {
    expect(orderStatusLabel(status)).toBe(expected)
  })

  // Defensive: a status added to the DB enum but not yet to the label map
  // should degrade to something readable rather than rendering nothing.
  it('falls back to the raw value for an unrecognised status rather than rendering empty', () => {
    expect(orderStatusLabel('some_future_status' as OrderStatus)).toBe('some_future_status')
  })
})

// ST-017 (B2. My Orders & Order Detail — "order tabs filter correctly").
describe('filterOrdersByTab', () => {
  function makeOrder(overrides: Partial<Order> = {}): Order {
    const now = new Date()
    return {
      id: 'order-1', customerId: 'cust-1', status: 'pending', totalAmount: 100,
      shippingAddress: { line1: '1 MG Road', city: 'Bengaluru', state: 'KA', postalCode: '560001', country: 'IN' },
      carrier: null, trackingNumber: null, shippedAt: null, deliveredAt: null,
      createdAt: now, updatedAt: now,
      ...overrides,
    }
  }

  it('returns every order for the "all" tab', () => {
    const orders = [
      makeOrder({ id: '1', status: 'pending' }),
      makeOrder({ id: '2', status: 'delivered' }),
      makeOrder({ id: '3', status: 'cancelled' }),
    ]
    expect(filterOrdersByTab(orders, 'all')).toHaveLength(3)
  })

  it('groups pending, paid, and processing under the "processing" tab', () => {
    const orders = [
      makeOrder({ id: '1', status: 'pending' }),
      makeOrder({ id: '2', status: 'paid' }),
      makeOrder({ id: '3', status: 'processing' }),
      makeOrder({ id: '4', status: 'shipped' }),
    ]
    const result = filterOrdersByTab(orders, 'processing')
    expect(result.map((o) => o.id)).toEqual(['1', '2', '3'])
  })

  it('filters to only shipped orders for the "shipped" tab', () => {
    const orders = [
      makeOrder({ id: '1', status: 'shipped' }),
      makeOrder({ id: '2', status: 'delivered' }),
    ]
    expect(filterOrdersByTab(orders, 'shipped').map((o) => o.id)).toEqual(['1'])
  })

  it('filters to only delivered orders for the "delivered" tab', () => {
    const orders = [
      makeOrder({ id: '1', status: 'shipped' }),
      makeOrder({ id: '2', status: 'delivered' }),
    ]
    expect(filterOrdersByTab(orders, 'delivered').map((o) => o.id)).toEqual(['2'])
  })

  it('groups cancelled and payment_failed under the "cancelled" tab', () => {
    const orders = [
      makeOrder({ id: '1', status: 'cancelled' }),
      makeOrder({ id: '2', status: 'payment_failed' }),
      makeOrder({ id: '3', status: 'delivered' }),
    ]
    expect(filterOrdersByTab(orders, 'cancelled').map((o) => o.id)).toEqual(['1', '2'])
  })

  it('defines exactly the 5 expected tabs, in display order', () => {
    expect(ORDER_TABS.map((t) => t.key)).toEqual(['all', 'processing', 'shipped', 'delivered', 'cancelled'])
  })
})
