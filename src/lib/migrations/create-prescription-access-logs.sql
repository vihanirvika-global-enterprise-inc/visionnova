-- Access audit for prescription files: who read which prescription, and when.
--
-- Distinct from prescription_review_logs, which is a DECISION audit — it records
-- an optometrist approving or rejecting a prescription. This table is an ACCESS
-- audit: it records every successful read of the file itself, including reads by
-- the owning customer, which produce no review decision at all. A prescription
-- can be read many times without ever being reviewed, and answering "who has
-- seen this health data" needs exactly these rows.

CREATE TABLE IF NOT EXISTS prescription_access_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  accessor_id     UUID NOT NULL REFERENCES customers(id),
  accessor_role   VARCHAR(20) NOT NULL,
  accessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescription_access_logs_prescription_id
  ON prescription_access_logs(prescription_id);

CREATE INDEX IF NOT EXISTS idx_prescription_access_logs_accessor_id
  ON prescription_access_logs(accessor_id);
