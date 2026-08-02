'use server'

import { regionForCountry } from '@/lib/region'
import { currencyForRegion } from '@/lib/currency'
import {
  isServiceableRegion,
  UNSERVICEABLE_REGION_MESSAGE,
} from '@/lib/serviceableRegions'
import { selectProvider } from '@/lib/payments/select-provider'
import type { PaymentProviderName } from '@/lib/payments/provider'
import { capturePaymentError } from '@/lib/sentry'

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

  // Before anything reaches a gateway: an unserviceable region must never have
  // a payment created for it.
  if (!isServiceableRegion(region)) {
    return { error: UNSERVICEABLE_REGION_MESSAGE }
  }

  const provider = selectProvider(region)
  const currency = currencyForRegion(region)

  const result = await provider.createIntent(amountInPaise, orderId, currency)

  if (result.error) {
    // Checkout is blocked here and no payment exists anywhere yet — this must
    // be visible to ops, not just returned as a string the user reads and
    // moves on from.
    capturePaymentError(new Error(result.error), { amount: amountInPaise })
    return { error: result.error }
  }

  return provider.name === 'razorpay'
    ? {
        provider: provider.name,
        clientRef: result.clientRef as string,
        keyId: process.env.RAZORPAY_KEY_ID,
      }
    : { provider: provider.name, clientRef: result.clientRef as string }
}
