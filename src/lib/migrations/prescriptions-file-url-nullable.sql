-- ST-023 (C3. Digital Rx Writing Tool). A prescription authored directly by
-- an optometrist during/after an eye test has no uploaded document — the
-- clinical fields themselves are the record. NOT NULL previously assumed
-- every prescription came from a customer upload, which is no longer true.
ALTER TABLE prescriptions ALTER COLUMN file_url DROP NOT NULL;
