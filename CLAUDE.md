# VisionNova — Project Context for Claude Code

## What is this project?
Global optical e-commerce platform (India-first MVP).
Seeing the World Clearly, Together.

## Tech Stack (MVP)
- Frontend: Next.js 14 + TypeScript + Tailwind CSS (PWA)
- Backend: Node.js (NestJS) + PostgreSQL
- Payments: Razorpay (India) + Stripe (global)
- File storage: AWS S3 (Rx prescription uploads, encrypted)
- Email/SMS: Postmark + Twilio
- Hosting: Vercel (frontend) + AWS/DigitalOcean (backend)

## Current Phase
Phase 0 → Phase 1 MVP (14-week sprint plan)

## MVP Screens in Scope
- Homepage, Eyeglasses Catalog, Product Detail Page
- Cart + Checkout, Prescription Upload, Account + Orders
- Auth (Login/Register), Help/FAQ, About/Contact

## Out of Scope for MVP
- AR Virtual Try-On, AI Frame Recommender, Teleoptometry
- Native iOS/Android apps (PWA only)
- Multiple languages/currencies (English + INR only at MVP)

## Sprint Plan
- Sprint 1: Repo, CI/CD, design system, auth, DB schema
- Sprint 2: Product catalog + PDP
- Sprint 3: Cart + Checkout (Razorpay integration)
- Sprint 4: Prescription upload + optometrist review queue
- Sprint 5: Account dashboard + order tracking
- Sprint 6: QA, mobile responsive, WCAG AA basics
- Sprint 7: Soft launch with 20 beta users

## Key Rules
- All medical/Rx data encrypted at rest (AWS S3 + server-side)
- DPDP (India data privacy) compliance from day 1
- Structured logging on every API — trace ID, user ID, event class
- Two-week sprint cadence; demo at end of each sprint