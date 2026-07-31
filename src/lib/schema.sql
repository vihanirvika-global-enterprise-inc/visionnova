-- VisionNova MVP Schema

CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  description          TEXT,
  price                NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category             TEXT NOT NULL CHECK (category IN ('frames', 'lenses', 'contacts', 'sunglasses')),
  sku                  TEXT NOT NULL UNIQUE,
  stock_quantity       INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url            TEXT,
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'payment_failed',
                                       'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount     NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  shipping_address JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES customers(id),
  file_url           TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
  right_sphere       NUMERIC(5, 2),
  right_cylinder     NUMERIC(5, 2),
  right_axis         INTEGER CHECK (right_axis BETWEEN 0 AND 180),
  right_add          NUMERIC(5, 2),
  left_sphere        NUMERIC(5, 2),
  left_cylinder      NUMERIC(5, 2),
  left_axis          INTEGER CHECK (left_axis BETWEEN 0 AND 180),
  left_add           NUMERIC(5, 2),
  pupillary_distance NUMERIC(5, 2),
  expires_at         DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  prescription_id UUID REFERENCES prescriptions(id),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS optometrist_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  reviewer_name   TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  notes           TEXT,
  reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access audit for prescription files — who read which prescription, and when.
-- Distinct from the review logs above, which record approve/reject decisions:
-- this records reads, including a customer viewing their own file.
CREATE TABLE IF NOT EXISTS prescription_access_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  accessor_id     UUID NOT NULL REFERENCES customers(id),
  accessor_role   VARCHAR(20) NOT NULL,
  accessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_customer_id        ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescription_access_logs_prescription_id
  ON prescription_access_logs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_access_logs_accessor_id
  ON prescription_access_logs(accessor_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id      ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id    ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_id ON prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status      ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_optometrist_reviews_prescription_id ON optometrist_reviews(prescription_id);
