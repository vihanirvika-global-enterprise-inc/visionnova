import type { OrderStatus, Order } from '@/types'

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

// ST-017 (B2. My Orders & Order Detail — "order tabs filter correctly").
// 5 tabs rather than one per status: 7 raw statuses is too many controls for
// a customer to scan, so pending/paid/processing collapse into "Processing"
// (all mean "not yet shipped") and cancelled/payment_failed collapse into
// "Cancelled" (both are exits, per OrderStatusTimeline's own reasoning).
export type OrderTab = 'all' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export const ORDER_TABS: { key: OrderTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const TAB_STATUSES: Record<Exclude<OrderTab, 'all'>, OrderStatus[]> = {
  processing: ['pending', 'paid', 'processing'],
  shipped: ['shipped'],
  delivered: ['delivered'],
  cancelled: ['cancelled', 'payment_failed'],
}

export function filterOrdersByTab(orders: Order[], tab: OrderTab): Order[] {
  if (tab === 'all') return orders
  return orders.filter((order) => TAB_STATUSES[tab].includes(order.status))
}
