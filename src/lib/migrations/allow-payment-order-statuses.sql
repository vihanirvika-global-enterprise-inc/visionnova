-- The Stripe webhook writes 'paid' and 'payment_failed', and both are part of the
-- OrderStatus union in src/types/index.ts, but the original CHECK constraint in
-- schema.sql omitted them — so every webhook UPDATE violated the constraint and
-- the order never advanced past 'pending'.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'paid',
    'payment_failed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  ));
