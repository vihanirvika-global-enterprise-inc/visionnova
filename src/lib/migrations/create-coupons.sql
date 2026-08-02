CREATE TABLE IF NOT EXISTS coupons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value         NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
  valid_from    TIMESTAMPTZ NOT NULL,
  valid_to      TIMESTAMPTZ NOT NULL,
  max_uses      INTEGER NOT NULL CHECK (max_uses > 0),
  current_uses  INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0 AND current_uses <= max_uses),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
