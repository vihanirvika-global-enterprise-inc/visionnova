-- audit_logs' entire purpose is proving nobody tampered with a record, so the
-- guarantee has to hold regardless of which DB role or connection touches the
-- row — including a migration or a one-off fix run as a superuser. A GRANT
-- revoke only protects against the app's own role and does nothing the
-- moment anyone connects as postgres directly, which is exactly how this
-- database is administered today. A trigger enforces the invariant at the
-- table level itself, so it can't be bypassed that way.

CREATE OR REPLACE FUNCTION reject_audit_log_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs rows are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION reject_audit_log_mutation();

-- If you find an audit_logs row you don't recognize and can't DELETE, that is
-- not a bug — DELETE is supposed to fail, permanently, for every row in this
-- table. TRUNCATE audit_logs is the one operation that bypasses this
-- row-level trigger, if a dev/test database genuinely needs to be reset.
