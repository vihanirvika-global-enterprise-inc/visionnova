'use server'

import { redirect } from 'next/navigation'
import { loginUser } from '@/lib/auth'
import { validateLogin } from '@/lib/validation'
import { createSession } from '@/lib/session'

export async function loginAction(formData: FormData): Promise<{ error: string } | never> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { valid, errors } = validateLogin({ email, password })
  if (!valid) return { error: errors[0] }

  const customer = await loginUser(email, password)
  if (!customer) return { error: 'Invalid email or password' }

  createSession(customer.id)
  redirect('/account')
}
