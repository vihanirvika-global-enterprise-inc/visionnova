import Link from 'next/link'
import { getOrdersByCustomer } from '@/lib/orders'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'
import { getSession } from '@/lib/session'
import { formatPrice } from '@/lib/formatters'

function statusColors(status: string): string {
  if (status === 'approved' || status === 'delivered' || status === 'shipped') {
    return 'bg-green-100 text-green-700'
  }
  if (status === 'rejected' || status === 'cancelled') {
    return 'bg-red-100 text-red-700'
  }
  return 'bg-amber-100 text-amber-700'
}

export default async function AccountPage() {
  const session = getSession()
  const customerId = session?.customerId ?? ''

  const [orders, prescriptions] = await Promise.all([
    getOrdersByCustomer(customerId),
    getPrescriptionsByCustomer(customerId),
  ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-dark">My Account</h1>

      <div className="mt-8 flex flex-col gap-8">

        {/* ── Prescriptions ────────────────────────────────── */}
        <div className="card p-6">
          <div className="mb-4 flex items-center">
            <p className="text-lg font-semibold text-dark">My Prescriptions</p>
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
              {prescriptions.length}
            </span>
          </div>

          {prescriptions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <svg
                className="mx-auto mb-3 h-12 w-12 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-muted">No prescriptions uploaded yet</p>
              <Link href="/prescription-upload" className="btn-secondary mt-4 text-sm">
                Upload Prescription
              </Link>
            </div>
          ) : (
            <div>
              {prescriptions.map((rx, index) => (
                <div
                  key={rx.id}
                  className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="font-medium text-dark">Prescription #{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors(rx.status)}`}>
                      {rx.status}
                    </span>
                    <span className="text-xs text-muted">
                      {rx.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Order History ─────────────────────────────────── */}
        <div className="card p-6">
          <div className="mb-4 flex items-center">
            <p className="text-lg font-semibold text-dark">Order History</p>
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
              {orders.length}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <svg
                className="mx-auto mb-3 h-12 w-12 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <p className="text-muted">No orders yet</p>
              <Link href="/shop" className="btn-primary mt-4 text-sm">
                Shop Eyeglasses
              </Link>
            </div>
          ) : (
            <div>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"
                >
                  <div>
                    <p className="font-medium text-dark">Order #{order.id}</p>
                    <span className="mt-0.5 block text-xs text-muted">
                      {order.createdAt.toLocaleDateString()}
                    </span>
                    <Link
                      href={`/order/${order.id}`}
                      className="mt-0.5 block text-xs text-primary hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                  <div className="text-right">
                    <p
                      data-testid={`order-total-${order.id}`}
                      className="font-bold text-primary"
                    >
                      {formatPrice(order.totalAmount)}
                    </p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </main>
  )
}
