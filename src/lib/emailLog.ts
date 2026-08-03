import { sql } from './db'

export type EmailLogStatus = 'sent' | 'failed'

interface LogEmailInput {
  to: string
  template: string
  payload: Record<string, unknown>
  status: EmailLogStatus
  error?: string
}

// A durable record of every outbound email attempt, success or failure — see
// create-email-log.sql for why this exists and what it deliberately does not
// cover (a honeypot-blocked submission never attempted a send, so it has no
// row here).
export async function logEmail(input: LogEmailInput): Promise<void> {
  await sql`
    INSERT INTO email_log (to_address, template, payload, status, error)
    VALUES (
      ${input.to},
      ${input.template},
      ${JSON.stringify(input.payload)},
      ${input.status},
      ${input.error ?? null}
    )
  `
}
