-- Distinguishes what was actually read: the prescription FILE (the scanned
-- image/PDF of the patient's prescription) versus its METADATA (patient name,
-- email, submission date, and the structured Rx values) shown on the review
-- screen. Both are reads of health data and both belong on the DPDP access
-- trail, but they are materially different acts and an auditor answering
-- "who saw what" needs to tell them apart.
--
-- Filename sorts after create-prescription-access-logs.sql, which the
-- alphabetical migration runner requires — the table must exist first.
--
-- DEFAULT 'file' is what keeps existing rows honest: every row written before
-- this migration was a file read, so backfilling them as 'file' records what
-- actually happened rather than guessing.

ALTER TABLE prescription_access_logs
  ADD COLUMN IF NOT EXISTS access_type VARCHAR(20) NOT NULL DEFAULT 'file';

ALTER TABLE prescription_access_logs
  DROP CONSTRAINT IF EXISTS prescription_access_logs_access_type_check;

ALTER TABLE prescription_access_logs
  ADD CONSTRAINT prescription_access_logs_access_type_check
  CHECK (access_type IN ('file', 'metadata'));
