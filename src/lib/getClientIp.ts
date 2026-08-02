import { headers } from 'next/headers'

export function getClientIp(): string {
  const forwardedFor = headers().get('x-forwarded-for')
  if (!forwardedFor) return 'unknown'
  return forwardedFor.split(',')[0].trim()
}
