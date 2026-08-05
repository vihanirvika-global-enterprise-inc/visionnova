-- ST-021 (EP-007 B2B2C Optometrist Clinic Portal). Deliberately a distinct
-- role from 'optometrist' — that role already grants access to every
-- customer's prescription via /admin (see REVIEWER_ROLES in
-- prescriptionAccess.ts). A B2B2C partner clinic must never inherit that;
-- middleware gates '/partner-portal' on this role specifically, never on
-- 'optometrist'.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_role_check;

ALTER TABLE customers ADD CONSTRAINT customers_role_check
  CHECK (role IN ('customer', 'optometrist', 'ops', 'admin', 'partner_optometrist'));
