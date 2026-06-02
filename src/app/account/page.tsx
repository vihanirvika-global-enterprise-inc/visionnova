import Link from 'next/link'
import { getOrdersByCustomer } from '@/lib/orders'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'
import { getSession } from '@/lib/session'

export default async function AccountPage() {
  const session = getSession()
  const customerId = session?.customerId ?? ''

  const [orders, prescriptions] = await Promise.all([
    getOrdersByCustomer(customerId),
    getPrescriptionsByCustomer(customerId),
  ])

  return (
    <main>
      {orders.length === 0 ? (
        <p>No orders yet</p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.id}>
              Order {order.id} — {order.status}
            </li>
          ))}
        </ul>
      )}
      {prescriptions.length > 0 && (
        <ul>
          {prescriptions.map((rx) => (
            <li key={rx.id}>Prescription — {rx.status}</li>
          ))}
        </ul>
      )}
      <Link href="/prescription-upload">Upload Prescription</Link>
    </main>
  )
}
