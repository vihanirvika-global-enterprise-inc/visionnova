'use server'

import { regionForCountry } from '@/lib/region'
import { currencyForRegion } from '@/lib/currency'
import { selectProvider } from '@/lib/payments/select-provider'
import type { PaymentProviderName } from '@/lib/payments/provider'

export type CreatePaymentResult =
  | {
      provider: PaymentProviderName
      clientRef: string
      // Razorpay Checkout needs the key id in the browser. It is publishable —
      // the secret never leaves the server — so it is returned here rather than
      // duplicated into a second NEXT_PUBLIC_ environment variable that could drift.
      keyId?: string
      error?: never
    }
  | { error: string; provider?: never; clientRef?: never; keyId?: never }

// Provider selection happens on the server: the client sends the shipping
// country and is told which UI to render, so the routing rule lives in one place.
export async function createPayment(
  amountInPaise: number,
  orderId: string,
  country: string
): Promise<CreatePaymentResult> {
  const region = regionForCountry(country)
  const provider = selectProvider(region)
  const currency = currencyForRegion(region)

  const result = await provider.createIntent(amountInPaise, orderId, currency)

  if (result.error) return { error: result.error }

  return provider.name === 'razorpay'
    ? {
        provider: provider.name,
        clientRef: result.clientRef as string,
        keyId: process.env.RAZORPAY_KEY_ID,
      }
    : { provider: provider.name, clientRef: result.clientRef as string }
}
