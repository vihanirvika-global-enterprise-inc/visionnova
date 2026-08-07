-- Email addresses are case-insensitive in practice, but customers.email is
-- plain TEXT with a plain UNIQUE constraint. Registering as Jane@Example.com
-- and signing in as jane@example.com therefore missed the row entirely, and a
-- correct password still returned "Invalid email or password".
--
-- src/lib/customers.ts now normalises on both read and write, but that only
-- governs rows written through createCustomer. This migration fixes the rows
-- that predate it, and adds the constraint that keeps the invariant true even
-- for a raw INSERT from psql or a future code path that forgets.

-- Fail loudly, naming the addresses, if two accounts already differ only by
-- case or surrounding whitespace. Normalising those would collapse two real
-- accounts into one; choosing which survives is a business decision, not
-- something a migration should decide silently. The whole migration runs in
-- one transaction, so raising here leaves the table untouched.
DO $$
DECLARE
  collisions TEXT;
BEGIN
  SELECT string_agg(normalised, ', ')
    INTO collisions
    FROM (
      SELECT lower(btrim(email)) AS normalised
        FROM customers
       GROUP BY lower(btrim(email))
      HAVING count(*) > 1
    ) AS duplicates;

  IF collisions IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot normalise customer emails: these addresses are held by more than one account once case and whitespace are ignored: %. Merge or remove the duplicates, then re-run.',
      collisions;
  END IF;
END $$;

UPDATE customers
   SET email = lower(btrim(email))
 WHERE email <> lower(btrim(email));

-- The existing UNIQUE on email only stops exact-duplicate strings. This is
-- what actually prevents Foo@x.com and foo@x.com coexisting as two accounts.
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_lower_key
    ON customers (lower(email));
