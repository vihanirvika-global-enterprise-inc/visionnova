'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { updateOrderStatus, bulkUpdateOrderStatus } from '@/lib/orders'
import type { Order } from '@/types'

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

// ST-027 Order Operations. orderIds arrives as a comma-separated string
// rather than repeated form fields, since it's built client-side from a
// checkbox selection (see page.tsx) into a single hidden input.
export async function bulkUpdateOrders(
  formData: FormData
): Promise<{ error: string } | never> {
  const session = getSession()
  if (!session || !FULFILMENT_ROLES.includes(session.role)) {
    return { error: 'You do not have permission to update orders' }
  }

  const orderIds = ((formData.get('orderIds') as string) ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const status = ((formData.get('status') as string) ?? '').trim() as Order['status']

  if (orderIds.length === 0) return { error: 'Select at least one order' }
  if (!status) return { error: 'Choose a status to apply' }

  try {
    await bulkUpdateOrderStatus(orderIds, status)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not update the selected orders' }
  }

  redirect('/admin/orders')
}
