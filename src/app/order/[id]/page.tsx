import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrderById } from '@/lib/orders'
import { getOrderItems } from '@/lib/orderItems'
import { getProductById } from '@/lib/products'
import { getSession } from '@/lib/session'
import { formatPrice } from '@/lib/formatters'
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = getSession()
  const order = session ? await getOrderById(params.id) : null

  // notFound rather than a 403 for every failure: confirming that someone
  // else's order exists is itself a disclosure.
  if (!session || !order || order.customerId !== session.customerId) {
    notFound()
  }

  const items = await getOrderItems(order.id)
  const products = await Promise.all(items.map((item) => getProductById(item.productId)))

  const address = order.shippingAddress
  const hasShipped = order.status === 'shipped' || order.status === 'delivered'

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/account" className="text-sm text-primary hover:underline">
        ← Back to my account
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-dark">Order #{order.id}</h1>
      <p data-testid="order-placed-date" className="mt-1 text-sm text-muted">
        Placed on {order.createdAt.toLocaleDateString('en-IN')}
      </p>

      <section aria-labelledby="progress-heading" className="card mt-8 p-6">
        <h2 id="progress-heading" className="mb-6 text-lg font-semibold text-dark">
          Progress
        </h2>
        <OrderStatusTimeline status={order.status} />
      </section>

      <section aria-labelledby="items-heading" className="card mt-6 p-6">
        <h2 id="items-heading" className="mb-4 text-lg font-semibold text-dark">
          Items
        </h2>
        <ul>
          {items.map((item, index) => (
            <li
              key={item.id}
              data-testid={`order-item-${item.id}`}
              className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"
            >
              <div>
                <p className="font-medium text-dark">
                  {products[index]?.name ?? 'Item no longer available'}
                </p>
                <span className="text-xs text-muted">
                  Quantity: {item.quantity} × {formatPrice(item.unitPrice)}
                </span>
              </div>
              <p className="font-medium text-dark">
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="font-semibold text-dark">Total</p>
          <p data-testid="order-total" className="text-lg font-bold text-primary">
            {formatPrice(order.totalAmount)}
          </p>
        </div>
      </section>

      <section aria-labelledby="shipment-heading" className="card mt-6 p-6">
        <h2 id="shipment-heading" className="mb-4 text-lg font-semibold text-dark">
          Shipment
        </h2>
        <address data-testid="shipment-info" className="text-sm not-italic text-dark">
          {address.line1}
          {address.line2 ? <><br />{address.line2}</> : null}
          <br />
          {address.city}, {address.state} {address.postalCode}
          <br />
          {address.country}
        </address>

        {hasShipped ? (
          <p data-testid="shipped-date" className="mt-4 text-sm text-muted">
            Dispatched on {order.updatedAt.toLocaleDateString('en-IN')}
          </p>
        ) : null}
      </section>
    </main>
  )
}
