-- The PRD's role enum is {customer, optometrist, ops, admin}, but the
-- original CHECK constraint (add-user-role.sql) only allowed
-- customer/optometrist/admin, so an 'ops' row could never be inserted.

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_role_check;

ALTER TABLE customers ADD CONSTRAINT customers_role_check
  CHECK (role IN ('customer', 'optometrist', 'ops', 'admin'));
