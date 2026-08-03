-- A durable record of outbound email attempts. Nothing in the app persists
-- this today: sendEmailBestEffort reports a failure to Sentry and moves on,
-- but a success leaves no trail at all, for any email the app sends. This
-- table exists for the contact form specifically (the only public,
-- unauthenticated, PII-collecting form with no existing record of what was
-- submitted), but the shape is generic so the confirmation/shipping/
-- prescription-status emails can adopt it later without a second table.
--
-- status is 'sent' or 'failed' only — an attempt genuinely made, one way or
-- the other. A honeypot-blocked submission never attempted a send, so it does
-- not belong in this table; that is a spam signal, not an email outcome.

CREATE TABLE IF NOT EXISTS email_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_address  TEXT NOT NULL,
  template    TEXT NOT NULL,
  payload     JSONB NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error       TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_template ON email_log(template);
