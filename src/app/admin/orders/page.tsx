import { redirect } from 'next/navigation'
import { getOrdersAwaitingDispatch } from '@/lib/orders'
import { formatPrice } from '@/lib/formatters'
import { markOrderShipped } from './actions'

export const dynamic = 'force-dynamic'

// A <form action> must resolve to void, but markOrderShipped returns its
// validation errors so it stays unit-testable. This adapter bridges the two and
// surfaces the message instead of discarding it.
async function dispatchOrder(formData: FormData) {
  'use server'
  const result = await markOrderShipped(formData)
  if (result?.error) {
    redirect(`/admin/orders?error=${encodeURIComponent(result.error)}`)
  }
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { error?: string }
} = {}) {
  const orders = await getOrdersAwaitingDispatch()
  const error = searchParams?.error

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-dark">Orders awaiting dispatch</h1>
      <p className="mt-1 text-sm text-muted">
        Paid and processing orders, oldest first.
      </p>

      {error ? (
        <div role="alert" className="card mt-6 border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {orders.length === 0 ? (
        <p className="card mt-8 p-6 text-muted">No orders awaiting dispatch.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {orders.map((order) => {
            const address = order.shippingAddress
            return (
              <li key={order.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-dark">Order #{order.id}</p>
                    <p className="mt-1 text-xs text-muted">
                      Placed {order.createdAt.toLocaleDateString('en-IN')} ·{' '}
                      {formatPrice(order.totalAmount)} · {order.status}
                    </p>
                    <address className="mt-2 text-sm not-italic text-dark">
                      {address.line1}, {address.city}, {address.state}{' '}
                      {address.postalCode}
                    </address>
                  </div>
                </div>

                <form action={dispatchOrder} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="orderId" value={order.id} />

                  <div className="flex-1">
                    <label
                      htmlFor={`carrier-${order.id}`}
                      className="mb-1 block text-sm font-medium text-dark"
                    >
                      Carrier
                    </label>
                    <input
                      id={`carrier-${order.id}`}
                      name="carrier"
                      type="text"
                      required
                      className="input-field"
                    />
                  </div>

                  <div className="flex-1">
                    <label
                      htmlFor={`tracking-${order.id}`}
                      className="mb-1 block text-sm font-medium text-dark"
                    >
                      Tracking number
                    </label>
                    <input
                      id={`tracking-${order.id}`}
                      name="trackingNumber"
                      type="text"
                      required
                      className="input-field"
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Mark shipped
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
