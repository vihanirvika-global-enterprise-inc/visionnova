'use server'

import { redirect } from 'next/navigation'
import { loginUser } from '@/lib/auth'
import { validateLogin } from '@/lib/validation'
import { createSession } from '@/lib/session'
import { getClientIp } from '@/lib/getClientIp'
import { checkRateLimit } from '@/lib/rateLimit'
import type { AuthFormState } from '@/lib/authFormState'

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

  createSession(customer.id, customer.role)
  redirect('/account')
}
