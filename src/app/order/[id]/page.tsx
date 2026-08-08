import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrderById } from '@/lib/orders'
import { getOrderItems } from '@/lib/orderItems'
import { getProductById } from '@/lib/products'
import { getSession } from '@/lib/session'
import { isUuid } from '@/lib/uuid'
import { formatPrice } from '@/lib/formatters'
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline'

export const dynamic = 'force-dynamic'

// Mirrors findProductOr404 on the PDP. Every rejection is notFound() rather
// than a 403 or a 400: confirming that someone else's order exists, or that an
// id is merely the wrong shape, is itself a disclosure.
//
// Session first, then shape, then ownership — an anonymous caller learns
// nothing about id formats, and a signed-in one learns nothing about orders
// that are not theirs. The shape check runs before the query because orders.id
// is a uuid column: a raw string reached Postgres, threw `invalid input syntax
// for type uuid`, and surfaced as a 500.
async function findOrderOr404(id: string) {
  const session = getSession()
  if (!session || !isUuid(id)) {
    notFound()
  }

  const order = await getOrderById(id)
  if (!order || order.customerId !== session.customerId) {
    notFound()
  }

  return order
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await findOrderOr404(params.id)

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

      <section
        aria-labelledby="shipment-heading"
        data-testid="shipment-info"
        className="card mt-6 p-6"
      >
        <h2 id="shipment-heading" className="mb-4 text-lg font-semibold text-dark">
          Shipment
        </h2>
        <address className="text-sm not-italic text-dark">
          {address.line1}
          {address.line2 ? <><br />{address.line2}</> : null}
          <br />
          {address.city}, {address.state} {address.postalCode}
          <br />
          {address.country}
        </address>

        {order.carrier || order.trackingNumber ? (
          <dl className="mt-4 text-sm">
            {order.carrier ? (
              <div className="flex gap-2">
                <dt className="text-muted">Carrier</dt>
                <dd className="font-medium text-dark">{order.carrier}</dd>
              </div>
            ) : null}
            {order.trackingNumber ? (
              <div className="mt-1 flex gap-2">
                <dt className="text-muted">Tracking number</dt>
                <dd className="font-medium text-dark">{order.trackingNumber}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {/* TODO (A12): the mockup offered an "Open carrier tracking" deep link.
            Not built — orders.carrier holds a free-text name ("BlueDart"),
            and there is no carrier registry mapping a name to a URL template,
            so any link would be a guessed URL pattern for a third party.
            Bundled with the schema backlog: model carriers properly (code +
            tracking URL template), then link. The tracking number is shown so
            a customer can paste it into the carrier's own site meanwhile. */}
        {order.shippedAt ? (
          <p data-testid="shipped-date" className="mt-4 text-sm text-muted">
            Dispatched on {order.shippedAt.toLocaleDateString('en-IN')}
          </p>
        ) : null}

        {order.deliveredAt ? (
          <p data-testid="delivered-date" className="mt-1 text-sm text-muted">
            Delivered on {order.deliveredAt.toLocaleDateString('en-IN')}
          </p>
        ) : null}

        {/* Orders shipped before these columns existed carry no tracking. Say so
            rather than inventing a date from updatedAt. */}
        {hasShipped && !order.carrier && !order.trackingNumber && !order.shippedAt ? (
          <p className="mt-4 text-sm text-muted">
            Tracking details are not available for this order.
          </p>
        ) : null}
      </section>

      {/* ST-017: return/exchange, only offered once the order is actually
          delivered — matches /help's real, established process (email
          support), rather than pretending a self-service return workflow
          exists that this app doesn't have. */}
      {order.status === 'delivered' && (
        <section aria-labelledby="return-heading" className="card mt-6 p-6">
          <h2 id="return-heading" className="mb-2 text-lg font-semibold text-dark">
            Need a return or exchange?
          </h2>
          <p className="mb-4 text-sm text-muted">
            30-day returns on non-prescription frames, 14-day returns on prescription
            glasses. Email us with your order number and we&apos;ll confirm your return
            and arrange collection.
          </p>
          <a
            href={`mailto:support@visionnova.com?subject=${encodeURIComponent(
              `Return request — Order #${order.id}`
            )}&body=${encodeURIComponent(`I'd like to return/exchange order #${order.id}.\n\nReason: `)}`}
            className="btn-secondary text-sm"
          >
            Request Return / Exchange
          </a>
        </section>
      )}
    </main>
  )
}
