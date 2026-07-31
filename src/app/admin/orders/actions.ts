'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { updateOrderStatus } from '@/lib/orders'

const FULFILMENT_ROLES = ['admin', 'optometrist']

export async function markOrderShipped(
  formData: FormData
): Promise<{ error: string } | never> {
  // Middleware gates /admin, but the action is independently reachable, so the
  // role check belongs here too.
  const session = getSession()
  if (!session || !FULFILMENT_ROLES.includes(session.role)) {
    return { error: 'You do not have permission to dispatch orders' }
  }

  const orderId = ((formData.get('orderId') as string) ?? '').trim()
  const carrier = ((formData.get('carrier') as string) ?? '').trim()
  const trackingNumber = ((formData.get('trackingNumber') as string) ?? '').trim()

  if (!orderId) return { error: 'Missing order' }
  // Recording a dispatch without these would leave exactly the gap these
  // columns were added to close.
  if (!carrier) return { error: 'Carrier is required' }
  if (!trackingNumber) return { error: 'Tracking number is required' }

  await updateOrderStatus(orderId, 'shipped', { carrier, trackingNumber })

  redirect('/admin/orders')
}
