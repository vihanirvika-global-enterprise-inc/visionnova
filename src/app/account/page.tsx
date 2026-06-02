import Link from 'next/link'
import { getOrdersByCustomer } from '@/lib/orders'
import { getPrescriptionsByCustomer } from '@/lib/prescriptions'

export default async function AccountPage() {
  const [orders, prescriptions] = await Promise.all([
    getOrdersByCustomer('placeholder'),
    getPrescriptionsByCustomer('placeholder'),
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
