'use server'

import { redirect } from 'next/navigation'
import { loginUser } from '@/lib/auth'
import { validateLogin } from '@/lib/validation'
import { createLoginOtp, deleteLoginOtp } from '@/lib/loginOtp'
import { sendLoginOtpEmail } from '@/lib/email'
import { createPendingLogin } from '@/lib/pendingLogin'
import { getClientIp } from '@/lib/getClientIp'
import { checkRateLimit } from '@/lib/rateLimit'
import { captureAuthWarning } from '@/lib/sentry'
import type { AuthFormState } from '@/lib/authFormState'

// ST-013 (A13. Auth — OTP as a second factor on login). Password success no
// longer creates a session directly — it creates a pending login and sends
// an OTP; the real session is only created by verifyOtpAction after the code
// is confirmed. See src/app/(auth)/login/verify-otp/actions.ts.
export async function loginAction(formData: FormData): Promise<AuthFormState | never> {
  const ip = getClientIp()
  const rateLimit = await checkRateLimit(ip, 'login')
  if (!rateLimit.allowed) {
    return { formError: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { valid, fieldErrors } = validateLogin({ email, password })
  if (!valid) return { fieldErrors }

  // Deliberately form-level and generic: attributing this to the email field
  // would reveal whether that address is registered.
  const customer = await loginUser(email, password)
  if (!customer) return { formError: 'Invalid email or password' }

  const { code, id: otpId } = await createLoginOtp(customer.id)

  // Hard failure, not best-effort: with no SMS fallback, a customer who
  // never receives this email has no way to finish signing in at all.
  // sendLoginOtpEmail normalises both of the provider's failure channels into
  // a throw, so this catch covers a rejected key and a dead socket alike.
  try {
    await sendLoginOtpEmail({ to: customer.email, firstName: customer.firstName, code })
  } catch (error) {
    // Report the real cause. The user is told only that it failed, so without
    // this the sole record of a broken mail provider is a rise in abandoned
    // logins — which is how this class of failure stays invisible. The OTP
    // itself is never included.
    captureAuthWarning(error instanceof Error ? error : new Error(String(error)), {
      check: 'login-otp-dispatch',
    })
    // Also to the server log: Sentry is a no-op when no DSN is configured,
    // which is exactly the state a misconfigured deployment tends to be in.
    console.error('[login] OTP email dispatch failed:', error)
    // Nobody received this code, so the row is dead weight. Best-effort: the
    // login has already failed, and turning a failed cleanup into a second
    // error would replace an actionable message with a 500.
    try {
      await deleteLoginOtp(otpId)
    } catch {
      // Ignored on purpose.
    }
    // Same wording whatever went wrong. A message naming the mail provider
    // would tell a visitor which control is down, and would read differently
    // from a bad password — the two must be indistinguishable dead ends.
    return { formError: 'Could not send a verification code. Please try again.' }
  }

  createPendingLogin(customer.id, customer.role)
  redirect('/login/verify-otp')
}
