'use server'

import { redirect } from 'next/navigation'
import { registerUser, DuplicateEmailError } from '@/lib/auth'
import { validateRegistration } from '@/lib/validation'
import { createSession } from '@/lib/session'
import { getClientIp } from '@/lib/getClientIp'
import { checkRateLimit } from '@/lib/rateLimit'

export async function registerAction(formData: FormData): Promise<{ error: string } | never> {
  const ip = getClientIp()
  const rateLimit = await checkRateLimit(ip, 'register')
  if (!rateLimit.allowed) {
    return { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` }
  }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { valid, errors } = await validateRegistration({ firstName, lastName, email, password })
  if (!valid) return { error: errors[0] }

  let customer
  try {
    customer = await registerUser({ firstName, lastName, email, password })
  } catch (error) {
    // Backstop path: validateRegistration's precheck normally catches a
    // duplicate email before this is ever reached (see the race-condition
    // comment in registerUser).
    if (error instanceof DuplicateEmailError) {
      return { error: error.message }
    }
    throw error
  }

  createSession(customer.id, customer.role)
  redirect('/account')
}
