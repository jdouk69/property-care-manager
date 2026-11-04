# Property Care Crete — Full Application Audit

**Date:** 2026-11-04
**Scope:** Entire application — 322 source files (47 pages, 184 components, 15 backend functions, 19 shared modules, 28 entities, 2 workflows, 6 test files)
**Method:** Static analysis of the codebase (structure, routing, entity permissions, backend authorization, query patterns, translation coverage, SEO metadata, accessibility), plus a full production build.

---

## Executive Summary

The application is in **good overall health**. The production build compiles cleanly, the financial logic is deliberately idempotent, secrets are confined to server-side functions, and 24 of 28 entities carry row-level security (RLS).

However, the audit found **4 high-severity issues** that should be closed before the next significant release, plus **9 medium** and **7 low** issues. The two that matter most are:

1. **`PropertyServiceAgreement` has no row-level security at all** — every signed contract, price, signature and signing token in the system is read- and write-open to any authenticated user.
2. **The recurring-billing function accepts requests with no identity check** and can be told to backdate charges for chosen agreements.

Neither is currently exploited by a customer-facing surface (there is no client login today), but both become critical the moment any customer-portal account, contractor account, or additional staff account exists.

**Overall risk rating: MEDIUM-HIGH** — low today because the authenticated user base is a small trusted staff group; high if the user base grows.

| Severity | Count | Effort to remediate |
| --- | --- | --- |
| Critical / High | 4 | ~1–2 days |
| Medium | 9 | ~4–6 days |
| Low | 7 | ~2–3 days |

---

## What Is Working Well

To keep the report balanced, these were verified and need no action:

- **Build is clean.** `vite build` completes with no errors or unresolved imports. No missing page imports, no broken component paths.
- **Secrets are server-side only.** `WEBSITE_PRICE_FEED_KEY` is referenced exclusively in `base44/functions/websitePriceFeed/entry.ts`. It never reaches the browser bundle.
- **Pricing is fail-closed.** `websitePrices` returns a 502 rather than ever serving stale or hard-coded prices.
- **RLS coverage is broad.** 24/28 entities are locked down; clients, properties, visits, expenses and tasks correctly scope to admin + staff.
- **Billing idempotency is well designed.** Per-period `source_key` plus post-write uniqueness checks make retries and concurrent runs duplicate-free.
- **Public token flows are separated.** Intake and agreement signing live on unauthenticated routes gated by server-validated tokens, with a snapshot-integrity hash before serving.
- **Private-first photo storage** with short-lived signed URLs is correctly implemented.

---

## High Severity

### H1 — `PropertyServiceAgreement` has no row-level security

**Severity:** High (Critical if any non-admin account is ever created)
**Location:** `base44/entities/PropertyServiceAgreement.jsonc` — the file has no `rls` key.

**Impact:** Without an `rls` block, the platform default applies: any authenticated user can read, create, update and delete every agreement record. Those records contain:

- `public_token` — the bearer capability that opens the customer's signing page
- `signer_name`, `signer_email`, `signer_ip`, `signer_user_agent` — signature evidence
- `signature_url`, `signature_hash`, `signed_pdf_url` — the executed document
- `agreed_price`, `previous_agreed_price`, `status`, `signing_status` — commercial terms
- `sent_snapshot`, `sent_snapshot_hash` — the frozen legal record

A single authenticated account could therefore read every customer's contract and pricing, extract signing tokens, flip `signing_status` to `Signed`, rewrite `agreed_price`, or delete the audit trail. This is the most sensitive entity in the system and it is the only significant one left unprotected.

**Recommendation:** Add RLS mirroring the other commercial entities:
- `read`: admin + staff
- `create` / `update`: admin + staff (or admin only, if staff should not author agreements)
- `delete`: admin only

Also confirm the intent behind `agreementSend` / `agreementActivate` / `agreementPause`: they currently only require a logged-in user (`base44.auth.me()`), not the admin role. If staff should be able to send and activate legally binding contracts, that is a deliberate policy — it should be written down. If not, add a role check.

---

### H2 — Recurring billing function has no authorization guard

**Severity:** High
**Location:** `base44/functions/generateRecurringCharges/entry.ts` (lines 41+)

**Impact:** Unlike `createInvoice` and `recordPayment` — which both correctly check `user.role !== "admin"` — this function performs **no identity check whatsoever** and then runs with `asServiceRole` privileges. Consequences:

- Any caller who can reach the endpoint can trigger a billing run.
- The documented "scoped verification" payload (`asOf` + `agreementIds`) allows a live run against explicitly named agreements with a backdated date. With no identity check, that is a direct financial-manipulation surface: a caller can create charges and draft invoices dated into the past for any agreement they name.
- Repeated invocation is a cheap denial-of-service against a function that loads every agreement, package and charge.

The design is idempotent, so duplicate charges are prevented — that is genuine credit to the implementation. But idempotency does not substitute for authorization.

**Recommendation:** At the top of the handler, require either
(a) an authenticated **admin** user, or
(b) a shared internal secret header for the workflow-invoked path,

and reject the `asOf` + `agreementIds` verification path unless the caller is an admin. This mirrors the pattern already used correctly in `createInvoice`.

---

### H3 — No React error boundary anywhere in the app

**Severity:** High
**Location:** `src/App.jsx` — no `ErrorBoundary` / `componentDidCatch` exists in the entire `src/` tree.

**Impact:** A single thrown error during render — a null property lookup, a malformed date, a failed `JSON.parse` on a legacy record — unmounts the whole React tree and leaves the user on a **blank white screen** with no message and no way back except a manual reload. For a field tool used on site at 350px on a phone, this is a real operational failure: a staff member mid-visit loses the checklist they were filling in.

**Recommendation:** Add one top-level boundary in `App.jsx` (or in `src/main.jsx`) with a branded "something went wrong" panel and a reload button, and optionally a lighter boundary around the visit wizard so a failure there does not take down navigation. This is roughly 40 lines and is the single best reliability-per-line change available.

---

### H4 — No runnable automated test suite

**Severity:** High (given that the app moves money)
**Location:** Repository root — `property-care-smoke.spec.js`, `dashboard-open-issue-flow.spec.js`, `tests-service-scope.mjs`, `tests-checklist-suggested-answers.mjs`, `tests-emergency-suggested-answers.mjs`, `tests-sites-feature-sync.mjs`

**Impact:** Six test files exist, but `package.json` defines only `dev`, `build`, `lint`, `typecheck`, `preview`. There is **no test runner and no `test` script** — the Playwright specs have no config and cannot execute. So the suite is decorative.

This matters disproportionately here because the codebase carries explicit, load-bearing invariants that nothing verifies, for example:

> `base44/shared/payments.js`: *"The two copies MUST stay identical."*
> `base44/shared/reminderOffsets.js`: *"The two copies MUST stay identical."*
> `base44/shared/visitReminders.js`: *"Both paths MUST use identical dedup keys so runs are idempotent."*

Those contracts currently depend entirely on human discipline. The modules are pure functions with no platform dependencies, so testing them is cheap and high-value.

**Recommendation:** Install `vitest`, add `"test": "vitest run"`, and start with the pure shared modules — `payments`, `servicePeriods`, `anniversaryBilling`, `recurringCharges`, `packageEntitlement`, `timezone`, `propertyScope`. These cover the money maths, the anniversary clamping, the entitlement counts and the Athens date boundaries: exactly the places where a silent regression is most expensive and least visible. A parity test that imports both the `src/lib` and `base44/shared` copies and asserts deep equality closes the duplication risk at the same time.

---

## Medium Severity

### M1 — Greek interface coverage is incomplete on 12 pages

**Location:** Pages with zero `useLanguage` / `t()` usage:
`Clients`, `Reports`, `Maintenance`, `Keys`, `Deliveries`, `PropertyDocuments`, `AutomationLog`, `AgreementTerms`, `WebsiteEditor`, `OAuthConsent`, **`IntakeForm`**, **`AgreementPublic`**.

**Impact:** The Greek/English toggle is honoured on the dashboard, visits and settings, then silently reverts to English on six core operational list pages. Worse, the two **customer-facing** pages are affected: `IntakeForm.jsx` contains no language handling at all (no `lang`, no `language`, no Greek string), so a Greek customer filling in their property intake gets an English form end to end. `AgreementPublic` renders the frozen snapshot, which carries its own language, so it is partly covered — but its surrounding chrome is not.

For a business whose differentiator is being the local, Greek-speaking contact, this is a product gap rather than a polish item.

**Recommendation:** Prioritise by audience: `IntakeForm` first (customer-facing, and the entry point of the whole funnel), then the six staff CRUD pages using the existing dictionary pattern. `WebsiteEditor` and `AutomationLog` are admin-only and can wait.

---

### M2 — Public SEO head is incomplete

**Location:** `index.html`, `src/lib/seo.js`

**Findings:**
- **No `og:image`** anywhere. When a link is shared on WhatsApp — the primary channel for this business — the preview renders as a bare text card with no image.
- **No canonical tag**, while the same homepage is reachable at three URLs: `/` (via `RootPage` → `WebsiteHome`), `/landing-page`, and `/home` (which redirects to `/landing-page`). That is duplicate content competing with itself in search.
- **No `robots.txt`** and **no `sitemap.xml`** in `public/` (which contains only `favicon.svg`).

**Impact:** Reduced click-through on the highest-intent channel (a shared WhatsApp link), diluted ranking across duplicated homepage URLs, and slower discovery of the new detail pages (`/care-plan-details`, `/service-details`, `/sample-report`), which are currently unreachable by a crawler that only follows the sitemap.

**Recommendation:** Add a 1200×630 `og:image` plus `og:image:alt`, a canonical pointing `/landing-page` → `/` (or vice versa, one direction only, applied consistently), and `public/robots.txt` + `public/sitemap.xml` listing the public routes. Extend `usePageMeta` to also set `og:image` and canonical so per-page metadata is complete.

---

### M3 — Unknown URLs return HTTP 200

**Location:** `src/lib/PageNotFound.jsx`

**Impact:** The 404 screen renders correctly, but never appends `<meta name="prerender-status-code" content="404">`. Every mistyped or dead URL — including stale `propertycarecrete.base44.app/...` links still circulating — is served to crawlers as a valid 200 page. Google indexes the error page; retracted or renamed routes stay indexed indefinitely.

**Recommendation:** In a `useEffect` in `PageNotFound`, append the meta tag and remove it on cleanup. Apply the same to detail pages (`VisitDetail`, `PropertyDetail`, `MaintenanceIssueDetail`) once loading has finished and the record is confirmed missing — never during the loading window, or a slow fetch will be served as a 404.

---

### M4 — `Register` page exists but is not routed

**Location:** `src/pages/Register.jsx` exists; `src/App.jsx` registers `login`, `forgot-password` and `reset-password` but not `register`.

**Impact:** Dead code today. If self-signup is intended it will 404; if invite-only is intended (which the `AccessNotApproved` gate and `inviteUser` flow suggest), the file is misleading to future maintainers and drifts out of sync with the auth flow.

**Recommendation:** Decide the policy explicitly. Given the app is staff-only with an approval gate, the cleanest outcome is to delete `Register.jsx` and document "invite-only" — but if there is any chance of self-service onboarding for customers later, register the route and let `AccessNotApproved` handle the pending state.

---

### M5 — Client and server logic is duplicated under an unenforced "must stay identical" contract

**Location:** Seven module pairs:

| Module | `base44/shared` vs `src/lib` |
| --- | --- |
| `invoiceVat.js` | identical |
| `servicePeriods.js` | identical |
| `agreementTerms.js` | frontend **re-exports** backend |
| `propertyScope.js` | frontend **re-exports** backend |
| `payments.js` | copy — differs only in leading comments |
| `packageEntitlement.js` | copy — differs only in comments |
| `reminderOffsets.js` | copy — differs only in comments |
| `visitReminders.js` | copy — differs only in comments |
| `timezone.js` | copy — differs only in comments |

**Impact:** Two distinct risks.

First, **silent drift.** Payment allocations, package entitlements and reminder dedup keys exist in two files. If someone edits one and not the other, the staff preview and the server result disagree — and the disagreement is about money (`payments.js` computes balances; `packageEntitlement.js` decides what is billable).

Second, **an architectural inconsistency.** `propertyScope.js` and `agreementTerms.js` solve the problem by re-exporting from `base44/`, meaning the frontend imports directly out of the backend tree. Other copies duplicate instead. The codebase comments themselves note the platform discourages frontend imports from `base44/`. Today it builds; it is not a pattern to keep extending, because a future build-configuration change would break it with no test to catch it.

**Recommendation:** Standardise on the re-export approach for every pair (one source of truth, no copies), and add the parity test described in H4 so any future duplication is caught mechanically rather than by comment.

---

### M6 — Hard 500-record caps in billing paths

**Location:** `base44/functions/generateRecurringCharges/entry.ts` — `PropertyServiceAgreement.list('-created_date', 500)`, `ServicePackage.list('-created_date', 500)`, `BillingCharge.list('-created_date', 500)`; `createInvoice` uses `Invoice.list("-created_date", 1000)`.

**Impact:** These are silent ceilings, not errors. Past 500 active agreements, the daily billing run processes only the 500 most recent and **the oldest agreements quietly stop being invoiced** — the worst possible failure mode, because nothing alerts and revenue simply stops. The `-created_date` sort makes it worse: a long-standing client's agreement is precisely the one that falls off the end.

**Recommendation:** Either paginate through all records with the cursor pattern, or — cheaper and safer in the short term — add an explicit assertion: if a page returns exactly the cap, write an `AutomationLog` entry with `status: "failure"` so the omission is visible rather than silent.

---

### M7 — Very large files concentrate regression risk

**Location:**

| File | Lines |
| --- | --- |
| `src/components/visits/VisitWizard.jsx` | 2,134 |
| `src/lib/visitReport.js` | 1,047 |
| `src/pages/ServiceAgreement.jsx` | 992 |
| `src/components/resource/ResourceListPage.jsx` | 854 |
| `src/lib/checklistReportResult.js` | 656 |
| `src/components/reports/ReportDeliveryQueue.jsx` | 609 |

**Impact:** `VisitWizard.jsx` alone is 2,134 lines with 15+ internal step components. Every change to one step requires understanding the whole file, and the existing comment density ("canonical" appears 6+ times around the classification logic) shows the team is already using prose to hold together logic that should be isolated. This is the file most likely to harbour the next subtle bug.

**Recommendation:** Incremental extraction only — move each wizard step into `src/components/visits/steps/` as it is next touched, rather than a big-bang rewrite. Same for `visitReport.js`, where the PDF renderer and the report model are already separable.

---

### M8 — Accessibility: icon-only buttons without accessible names

**Location:** Roughly half of the 15 `size="icon"` buttons lack `aria-label`. Examples: `VisitWizard.jsx` lines 1177, 1212, 1249, 1297, 1355, 1404 (back arrows), `Calendar.jsx` 90/92 (month arrows), `Settings.jsx` 114 (add), `PropertyInlineAdd.jsx` 106 (close).

**Impact:** A screen reader announces "button" with no function. The `Calendar` arrows and the wizard back arrows are the worst cases because they are the only way to move in those views. `NotificationBell` and `ListFields` do this correctly — a consistent pattern already exists, it is simply not applied everywhere.

**Recommendation:** Add `aria-label` to every icon-only control (use the existing `t()` keys where they exist), and give the close/remove buttons a slightly larger hit area for on-site touch use.

---

### M9 — Two competing visit models (`Inspection` and `PropertyVisit`)

**Location:** `Inspection` entity still consumed by `src/pages/Inspections.jsx`, `src/pages/PropertyDetail.jsx` and `src/pages/Dashboard.jsx`, while `PropertyVisit` drives the visit wizard, reporting and billing.

**Impact:** The legacy `Inspection` entity carries a different checklist schema (`Pass` / `Needs Attention` / `Critical` vs `Normal` / `Important` / `Emergency`) and its own recurrence. Any dashboard or property-level metric that reads from both will double-count or mis-state "last inspection", and the two vocabularies confuse staff about which screen is authoritative. The project notes record that `Inspection` was audited as empty — so it carries risk with no data value.

**Recommendation:** Retire the `Inspection` entity and its page, and repoint `Dashboard` / `PropertyDetail` at `PropertyVisit`. If the history must be preserved for a period, freeze the page to a read-only view and remove it from navigation.

---

## Low Severity

### L1 — `ChecklistTemplate` and `ServicePackage` have no RLS
Neither carries an `rls` block, so any authenticated user can create, edit and delete them. Neither contains secrets, so exposure is limited — but `ServicePackage` holds `standard_price`, `one_time_price` and `additional_visit_price`, so a staff account could alter published pricing, which is a business-integrity issue rather than a data breach. Recommend admin-only writes, staff read.

### L2 — No transactional email templates
There is no `base44/emails/` directory, so report delivery, invoice sending and customer notifications use platform-default styling rather than the app's navy/brass identity. Given how much of this product's value is the polished report the owner receives, branded templates would materially lift perceived quality. Low urgency, high payoff.

### L3 — Inconsistent error surfacing
`console.error` is used in `AuthContext.jsx` (3×), `ResourceListPage.jsx`, and `visitReport.js`; the rest of the app surfaces failures through toasts or inline messages. Logging is not harmful, but a failed autosave that only reaches the console is invisible to staff. Recommend routing user-affecting failures to a toast as well.

### L4 — Legacy public file paths
Older signed agreements and invoices were stored in public file paths and remain fetchable without authentication. New records correctly use private storage. This requires a one-off cleanup and cannot be fixed in code — flagged for support follow-up.

### L5 — Stale crawler snapshots
Googlebot and WhatsApp previews still hold cached HTML from the retired `propertycarecrete.base44.app` domain showing prices as "unavailable". `src/api/base44Client.js` already aliases the retired host, so the code side is handled; the remaining work is a re-crawl request, not a code change.

### L6 — Reminder category settings are opt-in and easy to miss
Automated reminders and alerts only fire once the relevant category is enabled in Settings → Notifications. A new staff user has no signal that nothing is enabled. Recommend a dashboard hint when zero categories are active.

### L7 — Master checklist template names contain stray markdown asterisks
Display-only cosmetic defect in seeded template names. Recommend a one-line data cleanup.

---

## Prioritised Remediation Plan

**Phase 1 — Close the exposure (target: 1–2 days)**
1. **H1** Add RLS to `PropertyServiceAgreement`. Smallest change, largest risk reduction.
2. **H2** Add an admin/secret guard to `generateRecurringCharges`, and gate the `asOf` + `agreementIds` path behind admin.
3. **H3** Add the top-level error boundary.
4. **L1** Add RLS to `ServicePackage` and `ChecklistTemplate` while in the entity files.

**Phase 2 — Protect the money paths (target: 2–3 days)**
5. **H4** Add `vitest` and test the pure shared modules; include the client/server parity test that retires **M5**.
6. **M6** Replace silent 500-record caps with pagination or a loud `AutomationLog` failure.

**Phase 3 — Customer-facing quality (target: 3–4 days)**
7. **M1** Translate `IntakeForm` first, then the six staff CRUD pages.
8. **M2** Add `og:image`, canonical, `robots.txt`, `sitemap.xml`.
9. **M3** Emit the 404 status meta on not-found and missing-detail pages.

**Phase 4 — Maintainability and polish**
10. **M9** Retire the legacy `Inspection` entity and repoint Dashboard/PropertyDetail.
11. **M8** Sweep `aria-label` onto icon-only controls.
12. **M7** Incremental file decomposition, starting with `VisitWizard.jsx` when it is next modified.
13. **M4** Decide and document `Register` policy.
14. **L2–L7** as capacity allows.

---

## Appendix — Audit Coverage

| Area | Checked | Result |
| --- | --- | --- |
| Production build | `vite build` | Pass, no errors |
| Missing imports / broken routes | All `App.jsx` page + component imports | Clean |
| Unrouted pages | 47 pages cross-referenced | 3 found (Dashboard via RootPage — correct; Register, OAuthConsent) |
| Entity permissions | 28 entity schemas | 24 protected, 4 without RLS |
| Backend authorization | 15 functions | 4 verified with role checks; `generateRecurringCharges` has none |
| Secret exposure | All `src/` imports + env reads | No leak to client |
| Query bounding | All `.list()` / `.filter()` calls | 2 hard caps in billing paths |
| Client/server duplication | 19 shared modules vs `src/lib` | 9 pairs, 2 identical, 2 re-export, 5 comment-only copies |
| Translation coverage | All pages | 12 pages with no i18n |
| SEO head | `index.html` + `lib/seo.js` + `public/` | No og:image, canonical, robots, or sitemap |
| Error resilience | `ErrorBoundary`, `componentDidCatch` | None present |
| Accessibility | Icon-only buttons vs `aria-label` | ~7 controls unnamed |
| Image handling | Raw `<img>` vs `@/components/ui/image` | Correct — raw tags only inside the wrapper |
| Debug output | `console.*` | 5 sites, non-blocking |
| Test infrastructure | `package.json`, spec files | 6 test files, no runner |