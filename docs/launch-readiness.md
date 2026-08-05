# VisionNova — Launch Readiness

**As of:** 2026-08-05 · `master` at `13fc874` (PR #30 merged)
**Suite:** 1,199 passing / 7 skipped (137 files) · typecheck, lint, build, e2e all green
**Scope of this document:** what must be true before real customers — not paying ones, *any* — reach this application.

---

## Verdict

**Not ready for public traffic.** Four items below are hard blockers, and none of them are code defects — they are unset secrets, an unbuilt consent gate, and a regulatory filing. The application itself is in reasonable shape; the gap is between "the code works" and "the deployment is safe and lawful".

Two of the blockers will not announce themselves. A deploy missing the encryption keys looks healthy until the first upload; a deploy without cookie consent looks healthy forever.

---

## P0 — Hard blockers

### 1. Required secrets are unset

Seventeen variables are documented in `.env.example`. These will take the site down or make it unsafe if missing:

| Variable | Failure mode if unset |
|---|---|
| `SESSION_SECRET` | Deploy **fails at import**. Loud and immediate — this is the good case. |
| `KYC_ENCRYPTION_KEY` | **Fails at first upload, not at boot.** Deploy looks healthy for hours. |
| `PRESCRIPTION_ENCRYPTION_KEY` | Same — silent until someone uploads a prescription. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Rate limiting throws in production; login, register and contact all 500. |
| `RESEND_API_KEY` | No email at all. Login is impossible — OTP is a hard gate. |
| `DATABASE_URL` | Nothing works. |
| `RAZORPAY_*` / `STRIPE_*` | Checkout and payment webhooks fail. |
| `GRIEVANCE_OFFICER_*` | DPDP requirement — see §2. |

The lazy-read distinction matters operationally: `SESSION_SECRET` fails closed at startup, the two encryption keys fail closed at *first use*. **A green deploy is not evidence the encryption keys are set.** Verify by uploading a prescription and a KYC document in staging before opening traffic.

### 2. DPDP — cookie consent does not exist

`src/components/analytics/PostHogProvider.tsx:10` calls `posthog.init(key, { autocapture: true })` unconditionally. There is no consent gate, no banner, and no opt-out.

Autocapture on an Indian e-commerce site handling prescriptions means behavioural analytics are collected from every visitor with no lawful basis. This is the single largest compliance exposure in the codebase and it is **not a bug — it was never built.**

Also required and currently unset: `GRIEVANCE_OFFICER_NAME`, `GRIEVANCE_OFFICER_EMAIL`, `GRIEVANCE_OFFICER_PHONE`. The footer already degrades visibly when they are missing, so this is detectable — but it must be set, not merely detected.

### 3. Regulatory register — three items no code can close

`src/lib/regulatoryRiskStatus.ts`, surfaced at `/admin/compliance`:

| Item | Risk ref | Status |
|---|---|---|
| Establishment registration for selling prescription eyewear | R-01 / REG-01 | **Not confirmed** |
| Backup payment processor | TECH-01 / FIN-04 | **Not configured** — single point of failure per region |
| Two licensed optometrists on staff | OPS-04 / PEO-02 | **0 on record** |

The first is a legal filing. Selling prescription eyewear without it is the kind of exposure that closes a business, not the kind that generates a bug ticket.

### 4. Email has never been exercised against real Resend

Every verification this project has done used a local stub. No real API key, no real send, no deliverability check — no SPF/DKIM/DMARC on `visionnova.com`, no bounce handling, no verified sending domain.

This is not paranoia: email was **completely non-functional** until very recently (`@react-email/render` was unreachable to `resend`, so every send threw before making a request) and the entire test suite was green throughout. Send one real email of each of the five types from staging before launch.

---

## P1 — Fix before real customers

| Item | Where | Why |
|---|---|---|
| **Catalogue is a dead end** | `src/components/ui/ProductCard.tsx` — no `<Link>` | A shopper cannot click a product to reach its detail page. This is a broken purchase funnel, not a nicety. |
| **Password hashing below standard** | `src/lib/auth.ts:5` — `SALT_ROUNDS = 10` | OWASP recommends ≥ 12. Cheap to change; requires no migration (bcrypt cost is per-hash). |
| **PII forms still default to GET** | `about/ContactForm.tsx`, `prescription-upload/page.tsx`, `CheckoutForm.tsx`, `eye-test/page.tsx`, `write-rx/page.tsx` | Credential forms were fixed (PR #29). These post names, addresses, and clinical values, and a pre-hydration submit puts them in the URL, browser history, and access logs. Same one-attribute fix. |
| **No prescription access-log retention** | `src/lib/prescriptionAccessLogs.ts` | Rows accumulate indefinitely. Deliberately deferred — retention period trades against product-liability evidence and is a legal decision, not an engineering one. Needs a decision, not code. |

---

## P2 — Known functional gaps

These are documented in code and were verified as *intentionally* incomplete, not overlooked:

- **Catalogue attribute filters** (frame shape, lens type, colour) do not exist. ST-002's "all filters combine correctly" AC is only partially met — search, sort and pagination work.
- **Cart is not persisted.** Pure in-memory client state; the `carts`/`cart_items` tables exist and are unused. No cross-device cart.
- **SMS is not implemented.** Named in the project stack, present nowhere. Order confirmation is email-only.
- **EP-008 Corporate Vision Benefits Portal** — deferred to Phase 1.5 / Month 9 by explicit decision.
- **Teleoptometry is scheduling only.** Appointments record who/when; there is no consultation, video, or join link.

---

## Verification debt — read this before trusting the suite

Six failures on this line of work were invisible to a green test suite. This is the most important operational fact in this document.

| # | Failure | Why tests missed it |
|---|---|---|
| 1 | Middleware imported Node `crypto`, crashed in Edge Runtime | Tests run under Node |
| 2 | Credential forms posted passwords via GET pre-hydration | jsdom has no hydration boundary |
| 3 | Secrets fell back to a constant published in this repo | Nothing asserted production behaviour |
| 4 | **No email could be sent at all** | Every test mocks the Resend SDK |
| 5 | e2e spec broken by a locator collision | `vitest.config.ts` excludes `e2e/`, so the per-commit gate never ran it |
| 6 | Playwright reported 16 passed instead of 27 | `reuseExistingServer: true` latched onto a stale dev server serving 404s |

Four were product defects; two were defects in the verification tooling itself. In every case the mock sat exactly where the bug was.

**The systemic fix has not been built:** a CI smoke test that exercises the critical flows — register, login through OTP, add to cart, checkout, prescription upload, prescription approval — against a real production build in a real environment, with no mocks at the boundary. Until that exists, treat "the suite is green" as evidence about logic and *not* as evidence the application runs.

---

## Pre-launch checklist

**Environment**
- [ ] All 17 `.env.example` variables set in the deploy environment
- [ ] Prescription upload performed in staging (proves `PRESCRIPTION_ENCRYPTION_KEY`)
- [ ] KYC upload performed in staging (proves `KYC_ENCRYPTION_KEY`)
- [ ] Upstash reachable from the deploy environment
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set — otherwise every `captureXxx` is a no-op and the server log is the only signal

**Database**
- [ ] `node scripts/setup-db.js` run against production; 26 migrations applied via the `schema_migrations` ledger
- [ ] Backup and point-in-time recovery configured — prescriptions are medical records

**Compliance**
- [ ] Cookie consent built and gating PostHog
- [ ] Grievance Officer details set and reachable
- [ ] Establishment registration confirmed in writing by the regulator
- [ ] Privacy policy and terms published (registration currently links to neither, deliberately)

**Email**
- [ ] Sending domain verified with SPF, DKIM, DMARC
- [ ] One real send of each of the five types confirmed received

**Payments**
- [ ] Razorpay and Stripe webhooks registered against production URLs with correct signing secrets
- [ ] One end-to-end test transaction per region, refunded

**Operational**
- [ ] Someone owns the Sentry inbox
- [ ] Rollback procedure written and rehearsed

---

## What is genuinely solid

Worth stating, so this document is not read as uniformly negative:

- Prescription and KYC documents are encrypted at rest with AES-256-GCM under separate keys, served only through authenticated routes, never from `public/`.
- Prescription access is audited on every read, with a customer-facing and cross-patient view.
- Session cookies are signature-verified in middleware before a page renders.
- Login requires a second factor.
- The partner role is deliberately separate from the internal reviewer role, with a test asserting reviewers cannot reach the partner portal.
- Rate limiting fails closed in production and open in development.
- EU/EEA traffic is refused at the edge with a 451, since there is no GDPR programme.
- The FTC Eyeglass Rule path — automatic prescription copy on approval — is implemented, and after PR #30 its delivery is actually verifiable.

The codebase is careful. The deployment is not yet configured, and the compliance work is not yet done.
