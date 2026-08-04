'use server'

import { redirect } from 'next/navigation'
import { getPendingLogin, clearPendingLogin } from '@/lib/pendingLogin'
import { verifyLoginOtp } from '@/lib/loginOtp'
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
