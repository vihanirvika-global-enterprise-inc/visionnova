-- ST-023 (C3. Digital Rx Writing Tool — "form rejects out-of-range clinical
-- values"). Application-level validation (src/lib/opticalRanges.ts) is the
-- primary gate the writing tool actually uses; these are the DB-level
-- backstop, same reasoning as the existing axis constraints below. Ranges
-- are standard optical practice bounds, not a business-specific policy:
-- sphere +/-20.00D, cylinder +/-6.00D, near-vision add +0.75 to +3.50D,
-- pupillary distance 40-80mm covers pediatric through adult.
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_right_sphere_range
  CHECK (right_sphere IS NULL OR right_sphere BETWEEN -20 AND 20);
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_left_sphere_range
  CHECK (left_sphere IS NULL OR left_sphere BETWEEN -20 AND 20);

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_right_cylinder_range
  CHECK (right_cylinder IS NULL OR right_cylinder BETWEEN -6 AND 6);
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_left_cylinder_range
  CHECK (left_cylinder IS NULL OR left_cylinder BETWEEN -6 AND 6);

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_right_add_range
  CHECK (right_add IS NULL OR right_add BETWEEN 0.75 AND 3.5);
ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_left_add_range
  CHECK (left_add IS NULL OR left_add BETWEEN 0.75 AND 3.5);

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_pupillary_distance_range
  CHECK (pupillary_distance IS NULL OR pupillary_distance BETWEEN 40 AND 80);
