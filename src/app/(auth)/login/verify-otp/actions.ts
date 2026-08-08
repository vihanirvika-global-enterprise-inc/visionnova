'use server'

import { redirect } from 'next/navigation'
import { getPendingLogin, clearPendingLogin } from '@/lib/pendingLogin'
import { verifyLoginOtp, createLoginOtp } from '@/lib/loginOtp'
import { getCustomerById } from '@/lib/customers'
import { sendLoginOtpEmail } from '@/lib/email'
import { createSession } from '@/lib/session'
import { getClientIp } from '@/lib/getClientIp'
import { checkRateLimit } from '@/lib/rateLimit'
import type { AuthFormState } from '@/lib/authFormState'

// ST-013 (A13. Auth — OTP as a second factor on login). The real session is
// only ever created here, after the code is confirmed — loginAction never
// creates one directly anymore.
export async function verifyOtpAction(formData: FormData): Promise<AuthFormState | never> {
  const pending = getPendingLogin()
  if (!pending) {
    redirect('/login')
  }

  const ip = getClientIp()
  const rateLimit = await checkRateLimit(ip, 'verify-otp')
  if (!rateLimit.allowed) {
    return { formError: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` }
  }

  const code = (formData.get('code') as string | null)?.trim() ?? ''
  if (!/^\d{6}$/.test(code)) {
    return { formError: 'Enter the 6-digit code from your email' }
  }

  const isValid = await verifyLoginOtp(pending.customerId, code)
  if (!isValid) {
    return { formError: 'That code is invalid or has expired' }
  }

  clearPendingLogin()
  createSession(pending.customerId, pending.role)

  // ST-021/022 (EP-007): a partner clinic landing on the customer account
  // dashboard after login would be actively wrong, not just unpolished — the
  // /account screen has nothing relevant to them at all.
  if (pending.role === 'partner_optometrist') {
    redirect('/partner-portal')
  }
  redirect('/account')
}


export interface ResendOtpResult {
  sent: boolean
  message?: string
}

// A code that never arrives strands someone at this screen with no way
// forward but starting the login over. Resend is its own endpoint for rate
// limiting: it is an unauthenticated trigger for an email to an address we
// hold, which is exactly the shape someone would abuse to mail-bomb a
// customer, and it must not share a bucket with password attempts.
//
// Never reports why a send failed. "That address bounced" and "no such
// customer" are both answers to a question the caller has not proved they may
// ask, and the pending-login cookie is not proof of anything.
export async function resendOtpAction(): Promise<ResendOtpResult> {
  const pending = getPendingLogin()
  if (!pending) {
    redirect('/login')
  }

  const ip = getClientIp()
  const rateLimit = await checkRateLimit(ip, 'otp-resend')
  if (!rateLimit.allowed) {
    return { sent: false, message: 'Too many requests. Please wait before asking for another code.' }
  }

  const customer = await getCustomerById(pending.customerId)
  if (!customer) {
    return { sent: false, message: 'We could not send a new code. Please sign in again.' }
  }

  const { code } = await createLoginOtp(customer.id)

  // The code is already stored, so a delivery failure is not a reason to
  // throw — the customer may still have the earlier one, and a 500 here would
  // lose the pending login entirely.
  try {
    await sendLoginOtpEmail({ to: customer.email, firstName: customer.firstName, code })
  } catch {
    return { sent: false, message: 'We could not send a new code. Please try again shortly.' }
  }

  return { sent: true }
}
