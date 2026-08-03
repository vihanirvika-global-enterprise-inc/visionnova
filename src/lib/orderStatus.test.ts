import { describe, it, expect } from 'vitest'
import { ORDER_STATUS_LABELS, orderStatusLabel } from './orderStatus'
import type { OrderStatus } from '@/types'

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
