-- ST-021 (C1. Optometrist Onboarding). One partner-clinic row per partner
-- customer account — customer_id is UNIQUE so the relationship is 1:1, not
-- a general membership table (a clinic here is a single onboarding owner,
-- not a multi-seat org; that's a real limitation, not an oversight — see
-- the implementation report).
CREATE TABLE IF NOT EXISTS optometrist_partners (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL UNIQUE REFERENCES customers(id),
  clinic_name      TEXT NOT NULL,
  kyc_status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  kyc_document_key TEXT NOT NULL,
  referral_code    TEXT NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optometrist_partners_kyc_status ON optometrist_partners(kyc_status);
