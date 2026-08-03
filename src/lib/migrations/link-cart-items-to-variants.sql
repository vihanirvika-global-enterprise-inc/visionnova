-- Adds cart_items.variant_id, split out of create-carts.sql.
--
-- The column originally lived in create-carts.sql, but migrations run in
-- alphabetical filename order and create-product-variants.sql sorts after
-- create-carts.sql — so on a fresh database the FK referenced a table that did
-- not exist yet and db:setup died at that migration. That went unnoticed
-- because existing databases were built incrementally as each migration was
-- authored, in a different order than a clean run produces.
--
-- 'l' sorts after both 'create-carts' and 'create-product-variants', so by the
-- time this runs both tables exist.
--
-- IF NOT EXISTS so databases that applied the original create-carts.sql (which
-- already declared variant_id) skip this cleanly. Both paths end at the same
-- schema.

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
