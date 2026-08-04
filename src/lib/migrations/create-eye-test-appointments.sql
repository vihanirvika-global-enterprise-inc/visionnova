-- ST-008 (A8. Teleoptometry / Eye-Test — "no double-booking across
-- optometrists"). Enforced here, not in application code: a partial unique
-- index is race-condition-safe against two concurrent booking requests for
-- the same optometrist/slot, which an application-level check-then-insert is
-- not. Partial (WHERE status != 'cancelled') so a cancelled slot frees up
-- for rebooking rather than being permanently blocked.
CREATE TABLE IF NOT EXISTS eye_test_appointments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID NOT NULL REFERENCES customers(id),
  optometrist_id UUID NOT NULL REFERENCES customers(id),
  scheduled_at   TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eye_test_appointments_no_double_booking
  ON eye_test_appointments(optometrist_id, scheduled_at)
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_eye_test_appointments_customer_id ON eye_test_appointments(customer_id);
