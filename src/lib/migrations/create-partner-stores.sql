-- ST-014: Store Locator (Partner). List view only — no map, no external
-- geocoding dependency. See src/app/stores/page.tsx.
CREATE TABLE IF NOT EXISTS partner_stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  postal_code   TEXT NOT NULL,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_stores_city ON partner_stores(city);
