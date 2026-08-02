-- optometrist_reviews is dead: zero callers anywhere in the app, fully
-- superseded by prescription_review_logs (the table the live admin review
-- action actually writes to). Removed from schema.sql for fresh installs;
-- this drops it from databases that already ran the old schema.sql.

DROP TABLE IF EXISTS optometrist_reviews;
