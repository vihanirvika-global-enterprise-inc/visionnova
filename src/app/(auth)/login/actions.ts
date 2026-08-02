'use server'

import { redirect } from 'next/navigation'
import { loginUser } from '@/lib/auth'
import { validateLogin } from '@/lib/validation'
import { createSession } from '@/lib/session'
import { getClientIp } from '@/lib/getClientIp'
import { checkRateLimit } from '@/lib/rateLimit'

export async function loginAction(formData: FormData): Promise<{ error: string } | never> {
  const ip = getClientIp()
  const rateLimit = await checkRateLimit(ip, 'login')
  if (!rateLimit.allowed) {
    return { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { valid, errors } = validateLogin({ email, password })
  if (!valid) return { error: errors[0] }

  const customer = await loginUser(email, password)
  if (!customer) return { error: 'Invalid email or password' }

  createSession(customer.id, customer.role)
  redirect('/account')
}
