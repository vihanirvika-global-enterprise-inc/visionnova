// SERVER ONLY — never import client-side
// Razorpay's order API is a single POST, so this is a thin fetch client rather
// than an SDK dependency. Shape mirrors getServerStripe(): lazy singleton
// behind an env guard that fails loudly at call time, not import time.

export interface RazorpayOrderInput {
  amount: number
  currency: string
  notes: Record<string, string>
}

export interface RazorpayOrder {
  id: string
}

export interface RazorpayClient {
  createOrder(input: RazorpayOrderInput): Promise<RazorpayOrder>
}

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders'

let razorpayInstance: RazorpayClient | null = null

export function getServerRazorpay(): RazorpayClient {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId) {
    throw new Error(
      'RAZORPAY_KEY_ID is not set. ' +
      'Add it to .env.local for development or ' +
      'environment variables for production.'
    )
  }
  if (!keySecret) {
    throw new Error(
      'RAZORPAY_KEY_SECRET is not set. ' +
      'Add it to .env.local for development or ' +
      'environment variables for production.'
    )
  }

  if (!razorpayInstance) {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

    razorpayInstance = {
      async createOrder(input: RazorpayOrderInput): Promise<RazorpayOrder> {
        const response = await fetch(RAZORPAY_ORDERS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(
            body?.error?.description ??
            `Razorpay order creation failed (${response.status})`
          )
        }

        return response.json()
      },
    }
  }

  return razorpayInstance
}

// Exported for test teardown only — resets the lazy singleton so tests don't leak state
export function _resetRazorpayInstance(): void {
  razorpayInstance = null
}
