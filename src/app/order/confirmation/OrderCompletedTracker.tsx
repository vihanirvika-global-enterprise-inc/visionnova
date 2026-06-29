'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

export function OrderCompletedTracker({
  orderId,
  total,
}: {
  orderId: string
  total: number
}) {
  useEffect(() => {
    trackEvent({ event: 'order_completed', orderId, total })
  }, [orderId, total])

  return null
}
