-- ST-015: Wishlist. Cross-device persistence for logged-in customers, so no
-- session_id/guest path like carts — a wishlist entry only ever means
-- something once it is attached to an account.
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_customer_id ON wishlist_items(customer_id);
