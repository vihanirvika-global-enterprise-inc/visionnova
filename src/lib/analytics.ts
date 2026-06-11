import posthog from 'posthog-js'
import type { AnalyticsEvent } from '@/types/analytics'

export function trackEvent(payload: AnalyticsEvent): void {
  if (typeof window === 'undefined') return
  posthog.capture(payload.event, payload)
}
