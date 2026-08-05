-- ST-007 (A7. Prescription Upload & Verification — "consent must be captured
-- and logged"). Nullable: existing rows predate consent capture and cannot
-- have consent fabricated for them retroactively. Every new prescription
-- created via createPrescription() always sets this — see src/lib/prescriptions.ts.
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;
