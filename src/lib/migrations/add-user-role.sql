ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS role VARCHAR(20)
  NOT NULL DEFAULT 'customer'
  CHECK (role IN ('customer', 'optometrist', 'admin'));
