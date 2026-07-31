-- Real shipment tracking for orders.
--
-- The order-tracking screen previously inferred a dispatch date from
-- updated_at, which is wrong the moment a shipped row is touched for any other
-- reason — a status correction, an address fix, a backfill. These columns
-- record what actually happened instead of guessing from a mutable timestamp.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier         TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at      TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at    TIMESTAMPTZ;
