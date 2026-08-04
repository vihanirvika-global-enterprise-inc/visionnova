-- ST-024 (C4. Referral & Commission Tracker) — ledger shell only. Per
-- explicit scoping decision, this stores WHERE a referral entry would live
-- once a real attribution mechanism and commission rate exist; nothing in
-- this codebase populates this table yet. amount is nullable specifically
-- because there is no commission-rate business rule to compute it from —
-- NULL means "not yet calculated", never a fabricated 0.
CREATE TABLE IF NOT EXISTS referral_commissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES optometrist_partners(id),
  order_id   UUID NOT NULL REFERENCES orders(id),
  amount     NUMERIC(10, 2),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partner_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_partner_id ON referral_commissions(partner_id);
