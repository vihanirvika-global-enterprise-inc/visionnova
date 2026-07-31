import type { Region } from '@/types'
import type { PaymentProvider } from './provider'
import { razorpayProvider } from './razorpay-provider'
import { stripeProvider } from './stripe-provider'

export function selectProvider(region: Region): PaymentProvider {
  return region === 'IN' ? razorpayProvider : stripeProvider
}
