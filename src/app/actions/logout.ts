'use server'

import { redirect } from 'next/navigation'
import { deleteSession } from '@/lib/session'

export async function logoutAction(): Promise<never> {
  deleteSession()
  redirect('/login')
}
