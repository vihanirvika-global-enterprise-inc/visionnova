import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { OPS_CONSOLE_ROLES } from '@/lib/roles'
import { getCustomerByEmail } from '@/lib/customers'
import { getOrdersByCustomer } from '@/lib/orders'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'
import { formatPrice } from '@/lib/formatters'

export const dynamic = 'force-dynamic'

// ST-028 Customer Service Console: one screen for a support agent to see a
// customer's full order and prescription history during a call, without
// hopping between the customer-only order page and the admin Rx queue.
export default async function SupportConsolePage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const session = getSession()

  // Middleware gates /admin, but this screen surfaces order and health data
  // for whichever customer is searched, so it re-checks independently.
  if (!session || !OPS_CONSOLE_ROLES.includes(session.role)) {
    notFound()
  }

  const email = searchParams.email?.trim().toLowerCase()
  const customer = email ? await getCustomerByEmail(email) : null

  const [orders, prescriptions] = customer
    ? await Promise.all([
        getOrdersByCustomer(customer.id),
        getPrescriptionsByCustomer(customer.id),
      ])
    : [[], []]

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-dark">Customer Service Console</h1>
      <p className="mt-1 text-sm text-muted">
        Look up a customer by email to see their orders and prescriptions in one place.
      </p>

      <form method="get" className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-dark">
            Customer email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={searchParams.email ?? ''}
            required
            className="input-field"
          />
        </div>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {email && !customer ? (
        <p className="card mt-8 p-6 text-muted">No customer found for {email}.</p>
      ) : null}

      {customer ? (
        <div className="mt-8 flex flex-col gap-8">
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-dark">
              {customer.firstName} {customer.lastName}
            </h2>
            <p className="mt-1 text-sm text-muted">{customer.email}</p>
            {customer.phone ? <p className="text-sm text-muted">{customer.phone}</p> : null}
            <p className="mt-2 text-xs text-muted">
              Customer since {customer.createdAt.toLocaleDateString('en-IN')}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-dark">Orders</h2>
            {orders.length === 0 ? (
              <p className="card mt-3 p-6 text-muted">No orders yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {orders.map((order) => (
                  <li key={order.id} className="card p-4">
                    <p className="font-medium text-dark">
                      Order #{order.id} · {order.status}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Placed {order.createdAt.toLocaleDateString('en-IN')} ·{' '}
                      {formatPrice(order.totalAmount)}
                    </p>
                    {order.carrier && order.trackingNumber ? (
                      <p className="mt-1 text-xs text-muted">
                        {order.carrier} · {order.trackingNumber}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-dark">Prescriptions</h2>
            {prescriptions.length === 0 ? (
              <p className="card mt-3 p-6 text-muted">No prescriptions on file.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {prescriptions.map((prescription) => (
                  <li key={prescription.id} className="card flex items-center justify-between p-4">
                    <div>
                      <Link
                        href={`/admin/prescriptions/${prescription.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Prescription #{prescription.id}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        Submitted {prescription.createdAt.toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <span className="text-sm capitalize text-dark">{prescription.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </main>
  )
}
