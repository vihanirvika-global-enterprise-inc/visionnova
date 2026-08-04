'use server'

import { redirect } from 'next/navigation'
import { loginUser } from '@/lib/auth'
import { validateLogin } from '@/lib/validation'
import { createLoginOtp } from '@/lib/loginOtp'
import { sendLoginOtpEmail } from '@/lib/email'
import { createPendingLogin } from '@/lib/pendingLogin'
import { getClientIp } from '@/lib/getClientIp'
import { checkRateLimit } from '@/lib/rateLimit'
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

  const { code } = await createLoginOtp(customer.id)

  // Hard failure, not best-effort: with no SMS fallback, a customer who
  // never receives this email has no way to finish signing in at all.
  try {
    await sendLoginOtpEmail({ to: customer.email, firstName: customer.firstName, code })
  } catch {
    return { formError: 'Could not send a verification code. Please try again.' }
  }

  createPendingLogin(customer.id, customer.role)
  redirect('/login/verify-otp')
}
