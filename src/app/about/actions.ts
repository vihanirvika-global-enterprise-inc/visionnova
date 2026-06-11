'use server'

import { Resend } from 'resend'

export async function sendContactEmail(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const subject = formData.get('subject') as string
  const message = formData.get('message') as string

  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: 'VisionNova <noreply@visionnova.com>',
      to: 'support@visionnova.com',
      replyTo: email,
      subject: `[VisionNova Contact] ${subject} — ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    })
    return { success: true }
  } catch {
    return { error: 'Failed to send message. Please try again or email us directly.' }
  }
}
