'use server'

import { redirect } from 'next/navigation'
import { registerUser } from '@/lib/auth'
import { validateRegistration } from '@/lib/validation'
import { createSession } from '@/lib/session'

export async function registerAction(formData: FormData): Promise<{ error: string } | never> {
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { valid, errors } = validateRegistration({ firstName, lastName, email, password })
  if (!valid) return { error: errors[0] }

  const customer = await registerUser({ firstName, lastName, email, password })
  createSession(customer.id)
  redirect('/account')
}
