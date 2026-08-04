import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getOrdersByCustomer } from '@/lib/orders'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'
import { getCustomerById } from '@/lib/customers'
import { getAppointmentsByCustomer, getOptometrists } from '@/lib/eyeTestAppointments'
import { getSession } from '@/lib/session'
import { formatPrice } from '@/lib/formatters'
import { orderStatusLabel, ORDER_TABS, filterOrdersByTab, type OrderTab } from '@/lib/orderStatus'

function formatAppointmentTime(scheduledAt: Date): string {
  return scheduledAt.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
  })
}

function statusColors(status: string): string {
  if (status === 'approved' || status === 'delivered' || status === 'shipped') {
    return 'bg-green-100 text-green-700'
  }
  if (status === 'rejected' || status === 'cancelled' || status === 'payment_failed') {
    return 'bg-red-100 text-red-700'
  }
  return 'bg-amber-100 text-amber-700'
}

// expires_at is nullable — say so rather than rendering a blank cell or an
// Invalid Date, which reads as a bug to the customer.
function expiryLabel(expiresAt: Date | null): string {
  if (!expiresAt) return 'No expiry on file'
  return `Expires ${expiresAt.toLocaleDateString('en-IN')}`
}

interface AccountPageProps {
  searchParams?: { orderTab?: string }
}

// ST-016 (B1. My Account Dashboard — "dashboard loads all account widgets").
// Verified against the ticket: prescriptions, orders, eye test appointments,
// and wishlist/privacy entry points all load here in one server-rendered
// pass (no client-side widget loading race to get wrong).
//
// No default value on the props object: Next's generated PageProps check
// rejects a first argument that can be undefined, and it only runs when
// .next/types exist (next build / a running dev server) — tsc --noEmit
// alone will not catch it. Same trap admin/orders/page.tsx documents.
export default async function AccountPage({ searchParams = {} }: AccountPageProps) {
  const session = getSession()

  // Middleware already rejects an invalid session before this runs, so this
  // is defense in depth rather than the primary guard — but the page must not
  // rely on that. The previous `?? ''` fallback only failed closed by accident
  // of customer_id being a uuid column (Postgres rejects ''); against a text
  // column it would have silently rendered an empty account instead.
  if (!session) {
    redirect('/login')
  }

  const customerId = session.customerId

  const [orders, prescriptions, customer, appointments, optometrists] = await Promise.all([
    getOrdersByCustomer(customerId),
    getPrescriptionsByCustomer(customerId),
    getCustomerById(customerId),
    getAppointmentsByCustomer(customerId),
    getOptometrists(),
  ])
  const optometristsById = new Map(optometrists.map((o) => [o.id, o]))

  const activeTab: OrderTab = ORDER_TABS.some((t) => t.key === searchParams.orderTab)
    ? (searchParams.orderTab as OrderTab)
    : 'all'
  const visibleOrders = filterOrdersByTab(orders, activeTab)

  // The session can outlive the customer row (deleted account, stale cookie),
  // so the greeting degrades instead of assuming a record exists.
  const greeting = customer ? `Welcome back, ${customer.firstName}` : 'My Account'

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-dark">{greeting}</h1>
        <div className="flex items-center gap-4">
          <Link href="/account/privacy" className="text-sm font-medium text-primary hover:text-teal">
            My Privacy →
          </Link>
          <Link href="/account/wishlist" className="text-sm font-medium text-primary hover:text-teal">
            My Wishlist →
          </Link>
        </div>
      </div>

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
              <svg aria-hidden="true"
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
                    <svg aria-hidden="true"
                      className="h-5 w-5 flex-shrink-0 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <div>
                      <span className="block font-medium text-dark">Prescription #{index + 1}</span>
                      <span
                        data-testid={`rx-expiry-${rx.id}`}
                        className="block text-xs text-muted"
                      >
                        {expiryLabel(rx.expiresAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* ST-018 (B3. My Prescriptions Vault — "every Rx access
                        is written to the audit log"). This is the only
                        customer-facing route to the file itself; the API
                        route it points at (readPrescriptionForSession) both
                        authorises the owner and logs the access — that
                        already existed and was only ever wired into the
                        admin review screen before this link. */}
                    {/* ST-023: a digitally-authored prescription has no
                        uploaded document — nothing for this link to open. */}
                    {rx.fileUrl && (
                      <a
                        href={`/api/prescriptions/${rx.id}/file`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View File
                      </a>
                    )}
                    {rx.status === 'rejected' && (
                      <Link
                        href="/prescription-upload"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Re-upload
                      </Link>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors(rx.status)}`}>
                      {rx.status}
                    </span>
                  </div>
                </div>
              ))}

              {/* Previously the only upload affordance was the empty state, so
                  a customer whose sole prescription was rejected had nowhere
                  to go from this page. */}
              <div className="pt-4">
                <Link href="/prescription-upload" className="btn-secondary text-sm">
                  Upload a new prescription
                </Link>
              </div>
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
              <svg aria-hidden="true"
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
              {/* ST-017: plain links, not client-side state — matches the
                  searchParams-driven pattern already used by /shop, /stores,
                  etc., so no JS is required for the filter to work. */}
              <nav aria-label="Filter orders" className="mb-4 flex flex-wrap gap-2">
                {ORDER_TABS.map((tab) => (
                  <Link
                    key={tab.key}
                    href={tab.key === 'all' ? '/account' : `/account?orderTab=${tab.key}`}
                    aria-current={activeTab === tab.key ? 'true' : undefined}
                    className={
                      activeTab === tab.key
                        ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-white'
                        : 'rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted hover:text-dark'
                    }
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>

              {visibleOrders.length === 0 && (
                <p className="py-8 text-center text-muted">No orders in this view</p>
              )}

              {visibleOrders.map((order) => (
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
                    <span
                      data-testid={`order-status-${order.id}`}
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors(order.status)}`}
                    >
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Eye Test Appointments ────────────────────────── */}
        <div className="card p-6">
          <div className="mb-4 flex items-center">
            <p className="text-lg font-semibold text-dark">My Eye Test Appointments</p>
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
              {appointments.length}
            </span>
          </div>

          {appointments.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-muted">No eye test appointments booked yet</p>
              <Link href="/eye-test" className="btn-secondary mt-4 text-sm">
                Book an Eye Test
              </Link>
            </div>
          ) : (
            <div>
              {appointments.map((appointment) => {
                const optometrist = optometristsById.get(appointment.optometristId)
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-dark">
                        {optometrist
                          ? `Dr. ${optometrist.firstName} ${optometrist.lastName}`
                          : `Appointment #${appointment.id}`}
                      </p>
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatAppointmentTime(appointment.scheduledAt)}
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

    </main>
  )
}
