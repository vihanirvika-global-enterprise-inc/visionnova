import type { OrderStatus } from '@/types'

// Single source of customer-facing wording for order status, shared by the
// account-page badges and the order-tracking timeline so the two surfaces
// can never disagree about what a given status is called.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Placed',
  paid: 'Paid',
  payment_failed: 'Payment failed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status
}
