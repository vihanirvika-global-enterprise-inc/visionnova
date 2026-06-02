import Link from 'next/link'
import { getOrdersByCustomer } from '@/lib/orders'

export default async function AccountPage() {
  const orders = await getOrdersByCustomer('placeholder')

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
      <Link href="/prescription-upload">Upload Prescription</Link>
    </main>
  )
}
