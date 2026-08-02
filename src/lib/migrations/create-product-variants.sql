CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id),
  color       TEXT NOT NULL,
  sku         TEXT NOT NULL UNIQUE,
  stock_qty   INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
