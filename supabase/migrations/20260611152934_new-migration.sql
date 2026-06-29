-- VisionNova MVP — full schema
-- Covers all 7 sprints: products, customers, orders, order items,
-- prescriptions, prescription review logs, optometrist reviews

-- ── Products ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  price                 NUMERIC(10, 2) NOT NULL,
  image_url             TEXT,
  category              VARCHAR(100),
  stock_quantity        INTEGER NOT NULL DEFAULT 0,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  created_at           
   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Customers ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'optometrist', 'admin')),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Orders ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id                        SERIAL PRIMARY KEY,
  customer_id               INTEGER NOT NULL REFERENCES customers(id),
  status                    VARCHAR(30) NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                              'pending', 'paid', 'processing',
                              'shipped', 'delivered',
                              'payment_failed', 'cancelled'
                            )),
  total_amount              NUMERIC(10, 2) NOT NULL,
  shipping_address          JSONB,
  stripe_payment_intent_id  VARCHAR(255),
  created_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Order Items ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10, 2) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Prescriptions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prescriptions (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  order_id     INTEGER REFERENCES orders(id),
  file_url     TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  notes        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Prescription Review Logs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prescription_review_logs (
  id               SERIAL PRIMARY KEY,
  prescription_id  INTEGER NOT NULL REFERENCES prescriptions(id),
  reviewer_id      INTEGER NOT NULL REFERENCES customers(id),
  action           VARCHAR(20) NOT NULL
                   CHECK (action IN ('approved', 'rejected')),
  note             TEXT,
  rejection_reason VARCHAR(50),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Optometrist Reviews ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS optometrist_reviews (
  id               SERIAL PRIMARY KEY,
  prescription_id  INTEGER NOT NULL REFERENCES prescriptions(id),
  optometrist_id   INTEGER NOT NULL REFERENCES customers(id),
  status           VARCHAR(20) NOT NULL
                   CHECK (status IN ('approved', 'rejected')),
  notes            TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_customer_id        ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id      ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_id ON prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status      ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_review_logs_prescription  ON prescription_review_logs(prescription_id);
