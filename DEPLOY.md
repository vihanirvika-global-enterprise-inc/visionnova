# Deploy checklist

Every item here is a switch outside the codebase. The code for all of it is
merged, tested, and correct — and does nothing at all until someone flips the
switch by hand. Each one fails **silently**: no exception at boot, no failing
test, no error in CI. You find out when a customer's money moves and their
order doesn't.

Work through this for every environment. Staging counts.

---

## 1. Apply pending migrations

**`npm run db:setup` does not apply migrations.** [scripts/setup-db.js](scripts/setup-db.js)
reads `src/lib/schema.sql` and nothing else — it never walks
`src/lib/migrations/`. Every file in that directory is applied by hand, in
order, once per environment.

Current migrations:

| File | What it does |
|---|---|
| `add-user-role.sql` | Adds the `role` column to customers |
| `create-prescription-review-logs.sql` | Adds the optometrist review audit table |
| `allow-payment-order-statuses.sql` | Permits `'paid'` and `'payment_failed'` in the `orders_status_check` constraint |

```bash
psql "$DATABASE_URL" -f src/lib/migrations/allow-payment-order-statuses.sql
```

**Why this one bites hardest:** the Stripe and Razorpay webhooks both write
`status = 'paid'`. Before this migration the CHECK constraint rejected that
value, so every payment webhook threw, returned 500, and the gateway retried
forever while the order sat at `pending`. The test suite stayed green
throughout — tests mock the database, so no test can catch a constraint
mismatch.

**Verify it took:**

```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND conname = 'orders_status_check';
```

The output must list `paid` and `payment_failed`. If it doesn't, payments are
broken in that environment no matter what the code says.

> **Follow-up logged:** make `setup-db.js` apply `src/lib/migrations/*.sql` in
> order after `schema.sql`, so this stops being a manual step. Until then,
> adding a migration means adding a line to this file.

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
