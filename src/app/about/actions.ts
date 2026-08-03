'use server'

import { Resend } from 'resend'
import { getClientIp } from '@/lib/getClientIp'
import { checkRateLimit } from '@/lib/rateLimit'
import { logEmail } from '@/lib/emailLog'
import { captureSpamAttempt } from '@/lib/sentry'

const CONTACT_RECIPIENT = 'support@visionnova.com'

export async function sendContactEmail(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  // Honeypot: a field no real visitor sees or fills, since the input is
  // hidden from sighted and assistive-tech users alike in ContactForm.tsx. A
  // bot filling every field indiscriminately populates it. Reported as
  // success so the bot gets no signal its submission was rejected, but never
  // sent and never logged as an email attempt — nothing was actually
  // dispatched, so there is nothing to persist in email_log.
  if (formData.get('company')) {
    captureSpamAttempt({ form: 'contact', ip: getClientIp() })
    return { success: true }
  }

  const ip = getClientIp()
  const rateLimit = await checkRateLimit(ip, 'contact')
  if (!rateLimit.allowed) {
    return { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` }
  }

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const subject = formData.get('subject') as string
  const message = formData.get('message') as string

  const payload = { name, email, subject, message }

  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: 'VisionNova <noreply@visionnova.com>',
      to: CONTACT_RECIPIENT,
      replyTo: email,
      subject: `[VisionNova Contact] ${subject} — ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    })
    await logEmail({ to: CONTACT_RECIPIENT, template: 'contact-form', payload, status: 'sent' })
    return { success: true }
  } catch (err) {
    await logEmail({
      to: CONTACT_RECIPIENT,
      template: 'contact-form',
      payload,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    })
    return { error: 'Failed to send message. Please try again or email us directly.' }
  }
}
