# VisionNova Jira Backlog Analysis
*Generated: 2026-06-10*

---

## Executive Summary

**Health: 🔴 Critical — Project is significantly behind schedule with 86% of Story + Task tickets overdue**

As of 2026-06-10, VisionNova's backlog contains **78 total tickets** (18 Epics, 32 Stories, 28 Tasks). The formal Jira status field reads "To Do" for all 78 tickets, but inline status notes reveal that only **11 tickets are marked Done** and **6 are In Progress**. With a planned soft launch in May–June 2026 and full launch in July 2026, the project is behind on Sprints 1–4 and the Soft Launch milestone has already passed.

**Top 3 Risks:**
1. 🔴 **Soft Launch deadline passed** — Sprint 2 due date was March 1 and Sprint 3 was March 25. As of June 10, 2026 both are overdue and most tickets remain "To Do" with no resolved Jira status.
2. 🔴 **Checkout (TK-023 — Payment Gateway Integration) still In Progress** — This is a Critical blocker for Checkout (EP-009), Order Tracking (EP-010), Subscriptions (EP-011), Returns (EP-017), and KPI Dashboard (EP-018), all of which depend on it downstream.
3. 🟡 **20 Stories have no associated Tasks** — 20 of 32 stories (62.5%) have no child tasks broken down, making effort estimation, assignment, and sprint tracking impossible for those items.

**Next 5 Tickets to Action (priority + dependency order):**
1. **TK-022** — International address form + customs duty estimator (Critical, Sprint 2) — Unblocks TK-023
2. **TK-023** — Payment gateway integration — Global & Regional (Critical, Sprint 2, In Progress) — Must close to unblock 5 downstream epics
3. **TK-016** — Post-consultation digital prescription generation (Critical, Sprint 3) — Depends on TK-015 (Done)
4. **TK-017** — Order History with live status tracking (High, Sprint 3) — Depends on TK-014
5. **ST-012** — Teleoptometry Booking System (Critical, Sprint 2) — Core clinical feature, 0% done despite Sprint 2 deadline

**Recommended Sprint Focus — Next 2 Weeks:**
- Close all open Sprint 2 Critical tickets: TK-022, TK-023, ST-012, ST-021, ST-022 (totalling 55 points of overdue Critical work)
- Update Jira statuses to reflect actual state — all tickets show "To Do" in the Status field despite some being done/in-progress
- Assign specific owners to the 18 Epics (currently all show "Team Lead" — a generic placeholder)
- Decompose the 20 Stories that have no Tasks so Sprint 3 and 4 work can be properly tracked

---

## 1. Epic Summary Table

| Epic ID | Epic Name | Phase | Priority | Total Stories | Total Tasks | Total Points | Component | Status |
|---------|-----------|-------|----------|--------------|-------------|--------------|-----------|--------|
| EP-001 | Platform Foundation & Architecture | Phase 1 | Critical | 2 | 3 | 34 | VN-Platform | 🟢 In Progress (Done in notes) |
| EP-002 | Homepage & Landing Experience | Phase 1 | High | 4 | 2 | 31 | VN-Frontend | 🔴 To Do (all overdue) |
| EP-003 | Product Catalog & Search | Phase 1 | High | 2 | 3 | 29 | VN-Catalog | 🔴 To Do (all overdue) |
| EP-004 | Product Detail & Customization | Phase 1 | High | 2 | 3 | 34 | VN-PDP | 🔴 To Do (all overdue) |
| EP-005 | AI Virtual Try-On | Phase 1 | High | 2 | 2 | 26 | VN-AI | 🔴 To Do (all overdue) |
| EP-006 | Teleoptometry & Eye Care Module | Phase 1 | Critical | 2 | 3 | 42 | VN-EyeCare | 🔴 To Do (all overdue) |
| EP-007 | User Authentication & Accounts | Phase 1 | Critical | 2 | 2 | 21 | VN-Auth | 🟢 Notes show Done |
| EP-008 | Prescription Upload & Verification | Phase 1 | Critical | 1 | 2 | 21 | VN-Prescription | 🟡 In Progress |
| EP-009 | Checkout & Payment Gateway | Phase 1 | Critical | 1 | 3 | 34 | VN-Checkout | 🟡 In Progress (partial) |
| EP-010 | Order Management & Tracking | Phase 1 | High | 1 | 2 | 21 | VN-Orders | 🔴 To Do (overdue) |
| EP-011 | Vision Club Subscription & Loyalty | Phase 1 | Medium | 2 | 0 | 21 | VN-Club | ⚪ Not Started |
| EP-012 | Multilingual & Multicurrency | Phase 1 | Critical | 2 | 2 | 29 | VN-Intl | 🔴 To Do (all overdue) |
| EP-013 | Marketing & Social Impact | Phase 2 | Medium | 2 | 0 | 13 | VN-Marketing | ⚪ Not Started |
| EP-014 | Mobile App (iOS & Android) | Phase 2 | High | 1 | 1 | 26 | VN-App | ⚪ Not Started |
| EP-015 | Admin Panel & Operations | Phase 1 | High | 2 | 0 | 21 | VN-Admin | 🔴 To Do (overdue) |
| EP-016 | Performance, SEO & Accessibility | Phase 2 | High | 2 | 0 | 26 | VN-Tech | ⚪ Not Started |
| EP-017 | Customer Support & Help Center | Phase 2 | Medium | 2 | 0 | 21 | VN-Support | ⚪ Not Started |
| EP-018 | Analytics & KPI Dashboard | Phase 2 | Medium | 1 | 0 | 8 | VN-Analytics | ⚪ Not Started |

**Total story points across all epics (per Epics Summary sheet): 457**
**Total story points across Stories + Tasks only: 549**
*(Discrepancy: epics sheet aggregates by story count; raw ticket data shows task-level points separately)*

---

## 2. Sprint Breakdown

### Sprint 1 — Platform Foundation, Auth, DB
*Duration: Jan 15 – Jan 31 2026 | Total Points: 47 | Status: In Progress (notes show mostly Done)*

| Ticket ID | Type | Summary | Priority | Points | Status Note | Due Date |
|-----------|------|---------|----------|--------|-------------|----------|
| ST-001 | Story | Tech Stack Selection & Environment Setup | Critical | 13 | ✅ Done | 2026-01-31 |
| TK-001 | Task | Select and document technology stack | Critical | 5 | ✅ Done | 2026-01-20 |
| TK-002 | Task | Set up CI/CD pipeline (GitHub Actions / Jenkins) | High | 5 | ✅ Done | 2026-01-28 |
| TK-003 | Task | Cloudflare CDN and SSL configuration | Critical | 3 | ⚪ To Do | 2026-01-28 🔴 |
| ST-002 | Story | Database Schema Design & Setup | Critical | 13 | ✅ Done | 2026-02-05 |
| ST-014 | Story | User Registration & Social Login | Critical | 8 | ✅ Done | 2026-02-05 |

**Sprint 1 Summary:** 5 of 6 tickets Done; TK-003 (Cloudflare CDN + SSL) has no done status and is 133 days overdue.

---

### Sprint 2 — Homepage, Catalog, PDP, Checkout, Prescriptions, Teleoptometry, i18n
*Duration: Feb 1 – Mar 1 2026 | Total Points: 241 | Status: In Progress (heavily overdue)*

| Ticket ID | Type | Summary | Priority | Points | Status Note | Due Date |
|-----------|------|---------|----------|--------|-------------|----------|
| ST-003 | Story | Hero Section Implementation | High | 8 | ⚪ To Do | 2026-02-14 🔴 |
| TK-004 | Task | Develop Hero Banner component (React/Next.js) | High | 5 | ⚪ To Do | 2026-02-08 🔴 |
| TK-005 | Task | Implement geo-targeted content display | High | 3 | ⚪ To Do | 2026-02-12 🔴 |
| ST-004 | Story | 3-Tier Product Showcase Section | High | 5 | ⚪ To Do | 2026-02-18 🔴 |
| ST-006 | Story | Smart Filter & Sort System | High | 13 | ⚪ To Do | 2026-02-20 🔴 |
| TK-006 | Task | Build filter sidebar with all 10 filter types | High | 8 | ⚪ To Do | 2026-02-12 🔴 |
| TK-007 | Task | Build sort options dropdown and product grid | High | 5 | ⚪ To Do | 2026-02-15 🔴 |
| TK-008 | Task | Implement Quick View hover panel | Medium | 3 | ⚪ To Do | 2026-02-18 🔴 |
| ST-008 | Story | Product Detail Page – Core Build | High | 13 | ⚪ To Do | 2026-02-22 🔴 |
| TK-009 | Task | Build image gallery with 360° view capability | High | 5 | ⚪ To Do | 2026-02-10 🔴 |
| TK-010 | Task | Prescription selector & lens upgrade price calculator | Critical | 8 | ⚪ To Do | 2026-02-18 🔴 |
| TK-011 | Task | Geo-targeted delivery estimate widget | High | 5 | ⚪ To Do | 2026-02-20 🔴 |
| ST-012 | Story | Teleoptometry Booking System | Critical | 21 | ⚪ To Do | 2026-03-01 🔴 |
| TK-014 | Task | Build optometrist availability calendar & timezone engine | Critical | 8 | ⚪ To Do | 2026-02-15 🔴 |
| TK-015 | Task | Video call integration (Twilio / Daily.co / Zoom SDK) | Critical | 8 | ⚪ To Do | 2026-02-25 🔴 |
| ST-016 | Story | AI-Powered Prescription Upload (OCR) | Critical | 13 | 🟡 In Progress | 2026-02-25 🔴 |
| TK-019 | Task | Build prescription OCR pipeline (Google Vision / AWS Textract) | Critical | 8 | ✅ Done | 2026-02-15 |
| TK-020 | Task | Optometrist review queue & verification dashboard | Critical | 5 | ✅ Done | 2026-02-22 |
| ST-017 | Story | Multi-Step Checkout Flow | Critical | 21 | 🟡 In Progress | 2026-03-01 🔴 |
| TK-021 | Task | Cart page with prescription confirmation and lens upsell | Critical | 8 | ✅ Done | 2026-02-12 |
| TK-022 | Task | International address form with customs duty estimator | Critical | 5 | ⚪ To Do | 2026-02-18 🔴 |
| TK-023 | Task | Payment gateway integration – Global & Regional | Critical | 13 | 🟡 In Progress | 2026-02-28 🔴 |
| ST-021 | Story | 15-Language Translation Implementation | Critical | 21 | ⚪ To Do | 2026-03-15 🔴 |
| TK-026 | Task | Set up i18n framework (next-i18next / react-intl) | Critical | 8 | ⚪ To Do | 2026-02-15 🔴 |
| ST-022 | Story | 50+ Currency Real-Time Conversion | Critical | 8 | ⚪ To Do | 2026-02-28 🔴 |
| ST-026 | Story | Product Catalog Management (CMS) | High | 13 | ⚪ To Do | 2026-02-25 🔴 |

**Sprint 2 Summary:** 3 of 26 tickets Done; 3 In Progress; 20 still To Do — all 26 are overdue. Sprint 2 contained 241 points (heaviest sprint), against a project total of 549 points for stories + tasks.

---

### Sprint 3 — AI Try-On, AR, Order Tracking, Search, Post-Consultation
*Duration: Mar 1 – Mar 25 2026 | Total Points: 133 | Status: Planned (all overdue)*

| Ticket ID | Type | Summary | Priority | Points | Status Note | Due Date |
|-----------|------|---------|----------|--------|-------------|----------|
| ST-005 | Story | Social Impact Section & Live Counter | Medium | 5 | ⚪ To Do | 2026-02-25 🔴 |
| ST-007 | Story | Global Search with AI-Powered Suggestions | High | 13 | ⚪ To Do | 2026-03-10 🔴 |
| ST-009 | Story | Customer Reviews & Q&A System | Medium | 8 | ⚪ To Do | 2026-03-05 🔴 |
| ST-010 | Story | AI Frame Recommender Engine | High | 13 | ⚪ To Do | 2026-03-15 🔴 |
| ST-011 | Story | Real-Time AR Try-On Module | High | 13 | ⚪ To Do | 2026-03-20 🔴 |
| TK-012 | Task | AR face landmark detection (MediaPipe/TensorFlow.js) | High | 8 | ⚪ To Do | 2026-03-12 🔴 |
| TK-013 | Task | Frame overlay with real-world scale calculation | High | 8 | ⚪ To Do | 2026-03-18 🔴 |
| TK-016 | Task | Post-consultation digital prescription generation | Critical | 5 | ⚪ To Do | 2026-03-05 🔴 |
| ST-015 | Story | Customer Portal / My Account Dashboard | High | 13 | ✅ Done | 2026-03-10 |
| TK-017 | Task | Build Order History with live status tracking | High | 5 | ⚪ To Do | 2026-03-01 🔴 |
| ST-018 | Story | Real-Time Order Tracking System | High | 13 | ⚪ To Do | 2026-03-10 🔴 |
| TK-024 | Task | Build order status pipeline (8 states) | High | 8 | ⚪ To Do | 2026-03-05 🔴 |
| TK-025 | Task | Carrier API integrations (DHL, FedEx, Aramex, Ninja Van) | High | 8 | ⚪ To Do | 2026-03-12 🔴 |
| TK-027 | Task | Arabic RTL layout implementation | Critical | 5 | ⚪ To Do | 2026-02-28 🔴 |
| ST-027 | Story | Optometrist Network Management | High | 8 | ⚪ To Do | 2026-03-10 🔴 |

**Sprint 3 Summary:** 1 of 15 tickets Done; 14 still To Do — all 15 are overdue.

---

### Sprint 4 — Vision Club, Mobile App, Blog, Social Impact, Support
*Duration: Apr 1 – Apr 20 2026 | Total Points: 89 | Status: Planned (all overdue)*

| Ticket ID | Type | Summary | Priority | Points | Status Note | Due Date |
|-----------|------|---------|----------|--------|-------------|----------|
| ST-013 | Story | Vision Score Tracker & Prescription Vault | High | 8 | ⚪ To Do | 2026-03-25 🔴 |
| TK-018 | Task | Family profile management (up to 5 members) | Medium | 5 | ⚪ To Do | 2026-03-20 🔴 |
| ST-019 | Story | Subscription Plan Management | High | 13 | ⚪ To Do | 2026-03-20 🔴 |
| ST-020 | Story | Loyalty Points Engine | Medium | 8 | ⚪ To Do | 2026-03-25 🔴 |
| ST-023 | Story | Blog / Eye Health Hub | Medium | 8 | ⚪ To Do | 2026-03-20 🔴 |
| ST-024 | Story | Social Impact Dashboard & Give-Back Counter | Medium | 5 | ⚪ To Do | 2026-03-25 🔴 |
| ST-025 | Story | React Native App Foundation | High | 21 | ⚪ To Do | 2026-04-15 🔴 |
| ST-030 | Story | VisionBot AI Chatbot (15 Languages) | High | 13 | ⚪ To Do | 2026-03-25 🔴 |
| ST-031 | Story | Returns & Exchange Management | High | 8 | ⚪ To Do | 2026-03-20 🔴 |

**Sprint 4 Summary:** 0 of 9 tickets Done — all overdue.

---

### Sprint 5 — Performance, SEO, Accessibility, Analytics
*Duration: May 1 – May 31 2026 | Total Points: 39 | Status: Planned (all overdue)*

| Ticket ID | Type | Summary | Priority | Points | Status Note | Due Date |
|-----------|------|---------|----------|--------|-------------|----------|
| TK-028 | Task | Barcode scanner for frame compatibility check | Medium | 5 | ⚪ To Do | 2026-04-15 🔴 |
| ST-028 | Story | Core Web Vitals Optimization | High | 13 | ⚪ To Do | 2026-04-30 🔴 |
| ST-029 | Story | WCAG 2.1 AA Accessibility Implementation | High | 13 | ⚪ To Do | 2026-04-30 🔴 |
| ST-032 | Story | Executive KPI Dashboard | Medium | 8 | ⚪ To Do | 2026-04-20 🔴 |

**Sprint 5 Summary:** 0 of 4 tickets Done — all overdue.

---

## 3. Dependency Map

The following table shows confirmed ticket-to-ticket dependencies (from the Dependencies and Linked Issues columns):

```
TK-001  →  TK-002  (CI/CD requires stack doc)
TK-001  →  TK-026  (i18n framework requires stack)
EP-001  →  ST-003, ST-006, ST-010, ST-014, ST-021, ST-025, ST-026, ST-028  (Platform is root dependency)
ST-002  →  TK-004, TK-014  (DB schema required for Hero and optometrist calendar)
TK-004  →  TK-005  (Geo content requires hero component)
ST-003  →  ST-004  (Product Showcase follows Hero)
TK-006  →  TK-007  (Sort requires filter component)
TK-007  →  TK-008  (Quick View follows sort/grid)
ST-006  →  ST-008  (PDP requires catalog)
TK-009  →  TK-010  (Price calc follows image gallery)
TK-010  →  TK-011  (Delivery widget follows price calc)
ST-008  →  ST-009, TK-021  (Reviews and Cart follow PDP)
TK-021  →  TK-022  (Customs duty form follows cart)
TK-022  →  TK-023  (Payment gateway follows address form)  🔴 BLOCKED — TK-022 not started
TK-023  →  TK-024  (Order pipeline requires payment)  🔴 BLOCKED — TK-023 In Progress
TK-024  →  TK-025  (Carrier APIs follow order pipeline)  🔴 BLOCKED
EP-007  →  ST-012, ST-016, ST-017  (Auth required for teleoptometry, prescriptions, checkout)
ST-014  →  ST-015, TK-018  (Portal requires registration)
TK-014  →  TK-015, TK-017  (Video call and order history require calendar)
TK-015  →  TK-016  (Prescription generation requires video call)
ST-012  →  ST-013, ST-027  (Vision tracker and optometrist mgmt require booking)
TK-019  →  TK-020  (Review queue requires OCR pipeline)
TK-026  →  TK-027  (RTL requires i18n framework)
ST-021  →  ST-022, ST-023, ST-030  (Currency, blog, chatbot require i18n)
EP-009  →  ST-018, ST-019, ST-031, ST-032  (All downstream features require checkout)
ST-019  →  ST-020  (Loyalty points require subscription plan)
EP-005  →  ST-007  (AI search depends on AI Virtual Try-On infrastructure)
EP-012  →  ST-023, ST-030  (Blog and chatbot require multilingual)
ST-025  →  TK-028  (Barcode scanner requires app foundation)
```

**🔴 Critical Blocker Chain:**
`TK-022 (not started)` → `TK-023 (in progress)` → `TK-024` → `TK-025` → all of EP-010, EP-011, EP-017, EP-018 downstream

**🔴 Long Dependency Chain Risk:**
`EP-001` → `ST-021` → `TK-026` → `TK-027` → `ST-030 (VisionBot)` — 4 hops; none complete, all overdue

No circular dependencies detected.

---

## 4. Priority Breakdown

| Priority | Count | % of Backlog |
|----------|-------|-------------|
| Critical | 27 | 34.6% |
| High | 38 | 48.7% |
| Medium | 13 | 16.7% |
| Low | 0 | 0.0% |

*Note: 100% of the backlog is Critical, High, or Medium — no Low-priority tickets exist. This suggests priority calibration has not been applied; nearly everything is flagged urgent.*

---

## 5. Status Summary

| Status (Jira Field) | Count | % |
|---------------------|-------|---|
| To Do | 78 | 100% |

*The formal Jira Status field is "To Do" for all 78 tickets. Progress is only visible in a secondary column (col C) with inline notes. True status based on those notes:*

| Actual Status (from Notes Column) | Count | % of Stories+Tasks |
|-----------------------------------|-------|--------------------|
| Done | 11 | 18.3% |
| In Progress | 6 | 10.0% |
| Not Started (To Do) | 43 | 71.7% |

*Epics excluded from % calculation (18 epics have their own status at the epic level).*

**Story Points Completion:**
- Total Story + Task Points: **549**
- Points Done: **78** (14.2%)
- Points In Progress: **47** (8.6%)
- Points Not Started: **424** (77.2%)

**Overall % Complete: 14.2%** (based on story points with Done status)

---

## 6. Unassigned / Incomplete Tickets 🟡

### Missing Specific Assignee (All 18 Epics show "Team Lead")
All 18 Epics are assigned to the generic "Team Lead" role rather than a named individual. Epics should be owned by named leads. Suggested owners per Epics Summary sheet:

| Epic ID | Epic Name | Suggested Owner |
|---------|-----------|----------------|
| EP-001 | Platform Foundation & Architecture | CTO |
| EP-002 | Homepage & Landing Experience | Frontend Lead |
| EP-003 | Product Catalog & Search | Frontend Lead |
| EP-004 | Product Detail & Customization | Frontend Lead |
| EP-005 | AI Virtual Try-On | AI Lead |
| EP-006 | Teleoptometry & Eye Care Module | Product Lead |
| EP-007 | User Authentication & Accounts | Backend Lead |
| EP-008 | Prescription Upload & Verification | AI Lead |
| EP-009 | Checkout & Payment Gateway | Backend Lead |
| EP-010 | Order Management & Tracking | Product Lead |
| EP-011 | Vision Club Subscription & Loyalty | Product Lead |
| EP-012 | Multilingual & Multicurrency | Product Lead |
| EP-013 | Marketing & Social Impact | Marketing Lead |
| EP-014 | Mobile App (iOS & Android) | Mobile Lead |
| EP-015 | Admin Panel & Operations | CTO |
| EP-016 | Performance, SEO & Accessibility | Tech Lead |
| EP-017 | Customer Support & Help Center | Product Lead |
| EP-018 | Analytics & KPI Dashboard | CTO |

### Missing Story Points (All 18 Epics)
All 18 Epics have Story Points = 0. Epics should roll up the points of their child tickets. The Epics Summary sheet has correct aggregate figures — these should be reconciled into Jira.

### Missing Acceptance Criteria (All 18 Epics)
All 18 Epics have no Acceptance Criteria in the AC field. While epics typically have high-level Definition of Done, these fields are blank.

### 20 Stories With No Child Tasks 🟡
The following stories have no task-level decomposition, making them unestimable at sprint level:

| Story ID | Summary | Epic | Sprint | Points |
|----------|---------|------|--------|--------|
| ST-002 | Database Schema Design & Setup | EP-001 | Sprint 1 | 13 |
| ST-004 | 3-Tier Product Showcase Section | EP-002 | Sprint 2 | 5 |
| ST-005 | Social Impact Section & Live Counter | EP-002 | Sprint 3 | 5 |
| ST-007 | Global Search with AI-Powered Suggestions | EP-003 | Sprint 3 | 13 |
| ST-009 | Customer Reviews & Q&A System | EP-004 | Sprint 3 | 8 |
| ST-010 | AI Frame Recommender Engine | EP-005 | Sprint 3 | 13 |
| ST-013 | Vision Score Tracker & Prescription Vault | EP-006 | Sprint 4 | 8 |
| ST-014 | User Registration & Social Login | EP-007 | Sprint 1 | 8 |
| ST-019 | Subscription Plan Management | EP-011 | Sprint 4 | 13 |
| ST-020 | Loyalty Points Engine | EP-011 | Sprint 4 | 8 |
| ST-022 | 50+ Currency Real-Time Conversion | EP-012 | Sprint 2 | 8 |
| ST-023 | Blog / Eye Health Hub | EP-013 | Sprint 4 | 8 |
| ST-024 | Social Impact Dashboard & Give-Back Counter | EP-013 | Sprint 4 | 5 |
| ST-026 | Product Catalog Management (CMS) | EP-015 | Sprint 2 | 13 |
| ST-027 | Optometrist Network Management | EP-015 | Sprint 3 | 8 |
| ST-028 | Core Web Vitals Optimization | EP-016 | Sprint 5 | 13 |
| ST-029 | WCAG 2.1 AA Accessibility Implementation | EP-016 | Sprint 5 | 13 |
| ST-030 | VisionBot AI Chatbot (15 Languages) | EP-017 | Sprint 4 | 13 |
| ST-031 | Returns & Exchange Management | EP-017 | Sprint 4 | 8 |
| ST-032 | Executive KPI Dashboard | EP-018 | Sprint 5 | 8 |

---

## 7. Risk Flags

### 🔴 Critical — Jira Status Field Not Updated
All 78 tickets show Status = "To Do" in the Jira Status field. Actual progress (Done/In Progress) is recorded only in a secondary freetext notes column (column C). This means Jira burndown charts, sprint reports, and velocity calculations are completely inaccurate. Immediate action: update Status for all 11 Done tickets and 6 In Progress tickets.

### 🔴 Critical — Sprint 2 Still ~77% Incomplete (Jun 10, 2026)
Sprint 2 ended March 1, 2026. It contained 26 tickets (241 points). Only 3 are confirmed Done and 3 In Progress — leaving 20 tickets (175 points) overdue. Sprint 2 represented the heaviest sprint load at 43.9% of all points. These unfinished tickets include Critical path items: Teleoptometry Booking (ST-012), 15-Language Translation (ST-021), 50+ Currency Conversion (ST-022), Product Catalog CMS (ST-026), and all of the Product Detail Page tasks.

### 🔴 Critical — Payment Gateway (TK-023) Blocks 5 Downstream Epics
TK-023 (Payment Gateway Integration) is In Progress but overdue by 102 days. It is in the dependency chain for:
- EP-010 Order Management & Tracking (ST-018, TK-024, TK-025)
- EP-011 Vision Club Subscriptions (ST-019, ST-020)
- EP-017 Returns Management (ST-031)
- EP-018 Analytics Dashboard (ST-032)
Until TK-022 → TK-023 are closed, all downstream sprint 3–5 work in these epics cannot begin.

### 🔴 Critical — Soft Launch Deadline Missed
The planned Soft Launch (India, UAE, UK) was Month 5–6 (May–June 2026). As of June 10, 2026, the project is at approximately 14% of story points complete. The Full Launch target of July 2026 is also at extreme risk.

### 🔴 Critical — Teleoptometry (ST-012, EP-006) Not Started
ST-012 Teleoptometry Booking System (21 points, Critical) is the most complex single story in the backlog. Due March 1, 2026 — overdue 101 days with 0% progress. Three tasks (TK-014, TK-015, TK-016) depend on it sequentially. EP-006 is listed as 42 total points — the highest-pointed epic in the backlog.

### 🟡 At Risk — 15-Language Translation (ST-021) Not Started
ST-021 is a Critical, 21-point story due March 15, 2026 (overdue 87 days). It is a prerequisite for ST-022 (Currency), ST-023 (Blog), and ST-030 (VisionBot chatbot). TK-026 (i18n framework) and TK-027 (Arabic RTL) both depend on it and are also not started.

### 🟡 At Risk — 62.5% of Stories Have No Tasks
20 of 32 stories have no child task breakdown. This is particularly risky for Sprint 3 and Sprint 4 where the most complex AI/AR and subscription stories live. Without task decomposition, accurate sprint planning and daily standup tracking is impossible.

### 🟡 At Risk — Epics EP-011 through EP-018 Have No Child Tasks
8 epics (Subscriptions, Marketing, Mobile App, Admin, Performance, Support, Analytics, and the second Marketing story) have zero tasks broken down. These represent Phase 1 and Phase 2 delivery milestones with no implementation-level granularity.

### 🟡 At Risk — TK-003 (Cloudflare CDN + SSL) Not Confirmed Done
TK-003 has no Done status note and was due January 28, 2026 (133 days overdue). Since it is in Sprint 1 alongside confirmed-Done tasks, this may simply be a status update omission — but if genuinely incomplete, it is a prerequisite for global performance and security targets (Page Speed < 2.5s, SSL A+ rating) cited across multiple KPIs.

### 🟡 At Risk — Sprint Loads Imbalanced
Sprint 2 (241 points) is 3–6x heavier than Sprint 5 (39 points). The single sprint covering Homepage, Catalog, PDP, Checkout, Prescriptions, Teleoptometry, and i18n simultaneously is unrealistic for any team size. This sprint scope likely explains why it remains significantly incomplete.

### 🟡 At Risk — No Low Priority Tickets Exist
Zero tickets are marked Low priority. With 34.6% Critical and 48.7% High, the priority system has lost signal. A re-prioritization pass should mark Phase 2 epics (EP-013, EP-014, EP-016, EP-017, EP-018) and their stories as Medium or Low to help the team focus on Soft Launch blockers.

---

*End of Analysis — Based on 78 tickets across 5 sheets of VisionNova_Jira_Backlog.xlsx*
*Today's date used for due-date calculations: 2026-06-10*
