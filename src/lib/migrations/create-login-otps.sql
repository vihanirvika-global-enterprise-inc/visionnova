-- ST-013 (A13. Auth — "OTP expires after 5 minutes and is rate-limited").
-- code_hash, never the raw code: same reasoning as password_hash on
-- customers — a leaked table must not hand out usable codes.
CREATE TABLE IF NOT EXISTS login_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_otps_customer_id ON login_otps(customer_id);
