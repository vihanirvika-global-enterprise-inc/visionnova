CREATE TABLE IF NOT EXISTS prescription_review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  reviewer_id UUID NOT NULL REFERENCES customers(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
  rejection_reason VARCHAR(50) CHECK (rejection_reason IN ('illegible', 'expired', 'incomplete', 'mismatch')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescription_review_logs_prescription_id
  ON prescription_review_logs(prescription_id);
