# Deploy checklist

Every item here is a switch outside the codebase. The code for all of it is
merged, tested, and correct — and does nothing at all until someone flips the
switch by hand. Each one fails **silently**: no exception at boot, no failing
test, no error in CI. You find out when a customer's money moves and their
order doesn't.

Work through this for every environment. Staging counts.

Every item below fails the same way — the order stays `pending` — so when a
payment doesn't land, walk this list top to bottom.

---

## 1. Apply pending migrations

```bash
npm run db:setup
```

This applies `src/lib/schema.sql`, then every `src/lib/migrations/*.sql` in
filename order. Applied migrations are recorded in a `schema_migrations`
ledger, so re-running is safe: anything already in the ledger is skipped, and
each migration commits with its ledger row in one transaction — a failure
leaves it unrecorded and retryable rather than half-applied.

Adding a migration means dropping a `.sql` file into `src/lib/migrations/`.
Nothing else. There is no list here to keep in sync.

**Verify it took:**

```sql
SELECT name FROM schema_migrations ORDER BY name;

SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND conname = 'orders_status_check';
```

The constraint must list `paid` and `payment_failed`. If it doesn't, payments
are broken in that environment no matter what the code says: both webhooks
write `status = 'paid'`, and a CHECK constraint that rejects it makes every
payment webhook throw, return 500, and retry forever while the order sits at
`pending`. The test suite stays green throughout — tests mock the database, so
no test can catch a constraint mismatch.

> **Environments created before the ledger existed** have no
> `schema_migrations` table. The first `db:setup` run creates it and re-applies
> all migrations; the existing ones are individually idempotent, so this is
> safe. Confirm with the ledger query above afterwards.

---

## 2. Register the Stripe webhook endpoint

Nothing calls [`/api/stripe/webhook`](src/app/api/stripe/webhook/route.ts)
until the endpoint is registered in the Stripe Dashboard
(Developers → Webhooks → Add endpoint).

- **URL:** `https://<your-domain>/api/stripe/webhook`
- **Events:** `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy the generated `whsec_…` signing secret into `STRIPE_WEBHOOK_SECRET`

An endpoint registered with the *wrong* events is the dangerous case: Stripe
returns 200 to your test ping, so the endpoint looks healthy, and real payments
are simply never delivered.

**Local development** needs no dashboard entry — forward instead:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

That prints its own `whsec_…`, which is different from the dashboard's. Use the
printed one locally.

---

## 3. Enable `payment.captured` on the Razorpay webhook

Razorpay webhooks are created per-endpoint in the Dashboard
(Settings → Webhooks), and **individual events are opt-in**. If
`payment.captured` isn't ticked, [`/api/razorpay/webhook`](src/app/api/razorpay/webhook/route.ts)
is never called and orders never leave `pending` — with no error anywhere.

- **URL:** `https://<your-domain>/api/razorpay/webhook`
- **Events:** `payment.captured`, `payment.failed`
- Set a webhook secret and copy it into `RAZORPAY_WEBHOOK_SECRET`

**`RAZORPAY_WEBHOOK_SECRET` is not `RAZORPAY_KEY_SECRET`.** Razorpay uses two
different secrets for two different signature checks:

| Check | Signed over | Secret |
|---|---|---|
| Webhook (`X-Razorpay-Signature`) | the raw request body | `RAZORPAY_WEBHOOK_SECRET` |
| Client payment confirmation | `order_id\|payment_id` | `RAZORPAY_KEY_SECRET` |

Unlike Stripe, Razorpay does not generate the webhook secret — you choose it
when creating the webhook. Using `KEY_SECRET` by mistake makes every signature
check fail closed, so the endpoint returns 400 to every real event.

This app verifies webhooks only. The client-side callback is UX
only and never advances order state, so `KEY_SECRET` is used solely for REST
API auth.

---

## 4. Environment variables

All of these must be set per environment; see [.env.example](.env.example).

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Supabase: use the Transaction Pooler URL |
| `SESSION_SECRET` | Random 32+ chars in production |
| `STRIPE_SECRET_KEY` | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public — shipped to the browser |
| `STRIPE_WEBHOOK_SECRET` | From step 2 |
| `RAZORPAY_KEY_ID` | |
| `RAZORPAY_KEY_SECRET` | REST API auth |
| `RAZORPAY_WEBHOOK_SECRET` | From step 3 — **not** `KEY_SECRET` |

---

## 5. Confirm a payment end to end

Do not treat a deploy as finished because the build is green. Put one real test
payment through each active gateway and confirm the order reaches `paid`:

```sql
SELECT id, status, updated_at FROM orders ORDER BY created_at DESC LIMIT 5;
```

If the order is still `pending`, work back through this list — every failure
mode above produces exactly that symptom, and produces it quietly.
