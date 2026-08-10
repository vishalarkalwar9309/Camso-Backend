# CAMSO Mobile App — Backend Plan: Aary
### Support, Content & Engagement
### Derived from `CAMSO_Backend_Plan_Aary_Vishal.md` (v4, frozen) — if anything here ever conflicts with that file, the master file wins.

> This is your execution doc — everything you need day to day without keeping the master open. Vishal has the equivalent doc for his half (`CAMSO_Backend_Plan_Vishal.md`). Together, the two are designed to cover the master doc's Phase 1 scope with **zero overlap and zero gaps** — every table, endpoint, and timeline row in the master appears in exactly one of the two docs, except the Core section, which both of you need in full and both docs carry identically since you build it together on Day 1.

---

## 1. Your slice, in one sentence

You own the SOW's Module 3 ("Support and Content") end to end — documents, testimonials, FAQs, dealer locator, VOC feedback, plus the full push-notification/campaign pipeline and the admin identity/access-control layer everything else sits behind.

You are **not** rebuilding user auth for admins — the JWT scheme and refresh-token mechanics are shared, built once on Day 1 (Section 2). What's genuinely yours: role enforcement across every one of your ~27 admin endpoints, the audit trail on every mutation you write, and admin session security.

---

## 2. What's shared (Core) — build this with Vishal on Day 1, then never touch it alone

You both need this in full; it's identical in both docs on purpose.

**Core tables** (`prisma/schema/core.prisma`):

| Table | Key fields |
|---|---|
| `languages` | `code` PK, `name`, `is_active` |
| `translations` | `entity_type`, `entity_id`, `field`, `language_code` FK, `value`, `@@unique([entity_type, entity_id, field, language_code])`. `entity_id` is intentionally not a real FK — polymorphic by design, application-level integrity, documented as a trade-off in the README, not an oversight. |
| `media_assets` | `url`, `filename`, `mime_type`, `size_bytes`, `uploaded_by_admin_id` FK, `created_at` |
| `audit_logs` | `actor_type`(`ADMIN`), `actor_id`, `action` enum(`CREATE`,`UPDATE`,`DELETE`,`PUBLISH`,`UNPUBLISH`,`LOGIN`), `entity_type`, `entity_id`, `changes` jsonb, `ip_address`, `user_agent`, `created_at` |
| `refresh_tokens` | `user_id` FK nullable, `admin_user_id` FK nullable, `token_hash`, `expires_at`, `revoked_at`, `device_id`, `created_at`, `CHECK ((user_id IS NOT NULL) <> (admin_user_id IS NOT NULL))` |

**Refresh flow** (shared `tokenService`, used by your `admin-auth` module and Vishal's `auth` module identically): hash incoming token → find a non-revoked, non-expired row by hash → found → revoke it, issue new access+refresh pair (rotation). Not found / already revoked (replay) → treat as compromised, revoke every active token for that principal, force re-login.

**Core middleware/services you'll call into constantly, but never edit solo:**
- `core/middleware/authGuard.js`, `adminGuard.js`, `requireRole.js`
- `core/middleware/auditContext.js` — attaches `req.auditContext` (actor/ip/user-agent). **Does not write anything.**
- `core/services/auditService.js` — `auditService.record({ actorId, action, entityType, entityId, before, after })`. **You call this yourself**, one line, at the end of every mutating method in your own `<name>.service.js` files — a generic middleware can't know your before/after state, only your service can. This is the biggest structural thing to internalize: audit logging isn't automatic magic, it's a habit you apply to every write path you build.
- `core/utils/mediaUpload.js`, `translate.js`, `pagination.js`, `ApiResponse.js`, `ApiError.js`

**Shared, Day-1-only files you'll pair on and then leave alone**: `prisma/schema.prisma`, `src/app.js`, `src/server.js`, `src/routes/index.js`, `src/config/*`, `docker-compose.yml`, `.github/workflows/ci.yml`.

---

## 3. Your tables — `content.prisma` and `engagement.prisma`

Real file names, not your name — you'll find these under `prisma/schema/`.

### `content.prisma`

| Table | Fields |
|---|---|
| `admin_users` | `id`, `email`, `password_hash`,`is_active Boolean @default(true)`, `role` enum(`SUPER_ADMIN`,`CONTENT_ADMIN`,`MARKETING`,`VIEWER`) |
| `documents` | `id`, `product_id` FK nullable, `category_id` FK nullable, `document_type` enum(`CATALOGUE`,`BROCHURE`,`MANUAL`,`TECHNICAL_GUIDE`,`BULLETIN`,`WARRANTY`,`VIDEO`), `is_published` boolean default `false` — title via `translations` |
| `document_files` | `id`, `document_id` FK, `language_code` FK, `media_asset_id` FK, `is_offline_downloadable` |
| `testimonials` | `id`, `product_id` FK nullable, `customer_name`, `region`, `story_type` enum(`SOLIDS`,`OPERATING_COST`,`WORN_PRODUCT_REPLACEMENT`,`REPEAT_PURCHASE`), `content`, `media_asset_id` nullable, `is_published`boolean default `false` |
| `faqs` | `id`, `product_id` FK nullable, `category` enum(`COMPANY`,`PRODUCT`,`DISTRIBUTION`), `sort_order`, `is_published`boolean default `false` — question/answer via `translations` |
| `dealers` | `id`, `name`, `type` enum(`DEALER`,`DISTRIBUTOR`), `address`, `city`, `state`, `country`, `geo_lat`, `geo_lng`, `phone`, `email`, `has_csr`, `is_active` boolean default `true` |
| `feedback` | `id`, `user_id` FK nullable, `device_id`, `product_id` FK nullable, `bucket` enum(`PRODUCT`,`SERVICE`,`PRICING`), `rating`, `comment`, `created_at` |
| `app_content` | `id`, `key` unique(`about`/`contact`/`legal`/`settings`), `extra` jsonb nullable — content via `translations` |

### `engagement.prisma`

| Table | Fields |
|---|---|
| `notifications` | `id`, `product_id` FK nullable, `campaign_id` FK nullable, `notification_type` enum(`NEW_LAUNCH`,`DISCONTINUED`,`PROMOTION`), `created_by` FK, `status`, `sent_at` — title/body via `translations` |
| `campaigns` | `id`, `name`, `target_type` enum(`ALL_USERS`,`BUSINESS_TYPE`,`LANGUAGE`,`COUNTRY`), `target_value` nullable, `status` enum(`DRAFT`,`SENT`), `scheduled_at` nullable (**informational only for Launch 1** — no cron/queue drives it, see Section 5), `created_by` FK |

**Naming convention you're following**: catalogue/operational entities use `is_active`; your CMS text/media content uses `is_published`. `dealers` is `is_active` (operational listing), `documents`/`testimonials`/`faqs` are `is_published` (CMS content) — not interchangeable, keep them distinct.

### Tables you read but don't own (Vishal's — reference only, full detail in his doc)

| Table | Fields you actually need | Why you need them |
|---|---|---|
| `users` | `id`, `business_type`, `country_code`, `preferred_language` | Campaign targeting resolution |
| `user_devices` | `user_id`, `fcm_token`, `is_active` | Campaign/notification send target |
| `products` | `id`, `slug` | FK targets from `documents`/`testimonials`/`faqs`/`notifications` |
| `categories` | `id` | FK target from `documents` |

You query these through **your own** `campaigns.repository.js` / etc. calling Prisma directly — never by importing anything from `src/modules/auth/`, `src/modules/users/`, `src/modules/products/`, or any other file Vishal owns. That's the rule that keeps two people on one repo from ever needing to touch each other's code.

---

## 4. Your module folders

```
src/modules/
├── admin-auth/       # login/refresh for admin_users; writes LOGIN to audit_logs directly
├── admin-users/       # NEW: SUPER_ADMIN manages admin accounts + roles
├── documents/
├── testimonials/
├── faqs/
├── dealers/
├── feedback/
├── notifications/
├── campaigns/         # reads users/user_devices via your OWN repository, see Section 3
└── app-content/
```

Each folder: `<name>.routes.js` (public), `<name>.admin.routes.js` (admin), `<name>.controller.js`, `<name>.service.js` (calls `auditService.record()` on every mutation), `<name>.repository.js` (only file that imports Prisma), `<name>.validation.js` (Joi).

`src/routes/index.js` auto-mounts every module folder by convention — you never edit it to add a new module, just add the folder.

---

## 5. Your API surface

Conventions that apply to all of these: `page`/`pageSize`/`sort` on lists, `{success, data, meta}` envelope, JWT-only identity (never a query-param `device_id`), `PATCH .../:id` for soft delete/unpublish (never hard `DELETE`).

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/admin/auth/login` | none | writes `audit_logs` action `LOGIN` |
| POST | `/admin/auth/refresh` | refresh token | |
| GET | `/admin/admin-users` \| `/admin/admin-users/:id` | `SUPER_ADMIN` | |
| POST | `/admin/admin-users` | `SUPER_ADMIN` | create admin + role |
| PATCH | `/admin/admin-users/:id` | `SUPER_ADMIN` | change role / deactivate, Deactivation sets is_active=false, revokes active refresh tokens, and blocks future login/refresh.|
| GET | `/documents` \| `/documents/:id` | none | published only; resolves per-language `document_files` |
| GET | `/admin/documents` \| `/admin/documents/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |
| POST | `/admin/documents` | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| PATCH | `/admin/documents/:id` | `CONTENT_ADMIN`,`SUPER_ADMIN` | incl. `is_published` toggle |
| POST | `/admin/documents/:id/files` | `CONTENT_ADMIN`,`SUPER_ADMIN` | multipart → `mediaUpload.js` |
| GET | `/testimonials` | none | `?product=&type=` |
| GET | `/admin/testimonials` \| `/admin/testimonials/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |
| POST/PATCH | `/admin/testimonials`(`/:id`) | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| GET | `/faqs` | none | `?category=&product=` |
| GET | `/admin/faqs` \| `/admin/faqs/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |
| POST/PATCH | `/admin/faqs`(`/:id`) | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| GET | `/dealers/locator` | none | `?lat=&lng=&type=&radiusKm=`, Haversine in SQL, no PostGIS |
| GET | `/dealers/csr-contact` | none | `?country=` |
| GET | `/admin/dealers` \| `/admin/dealers/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |
| POST/PATCH | `/admin/dealers`(`/:id`) | `CONTENT_ADMIN`,`SUPER_ADMIN` | incl. `is_active` toggle |
| POST | `/feedback` | JWT | |
| GET | `/admin/feedback` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | list/filter |
| GET | `/admin/feedback/export?format=csv` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | separate, explicit endpoint — not a query flag on the list route |
| GET | `/notifications` | none | public feed |
| GET | `/admin/notifications` \| `/admin/notifications/:id` | `VIEWER`,`MARKETING`,`SUPER_ADMIN` | |
| POST/PATCH | `/admin/notifications`(`/:id`) | `MARKETING`,`SUPER_ADMIN` | |
| GET | `/admin/campaigns` \| `/admin/campaigns/:id` | `VIEWER`,`MARKETING`,`SUPER_ADMIN` | |
| POST/PATCH | `/admin/campaigns`(`/:id`) | `MARKETING`,`SUPER_ADMIN` | creates as `DRAFT` |
| POST | `/admin/campaigns/:id/send` | `MARKETING`,`SUPER_ADMIN` | resolves `target_type`/`target_value` against `users`+`user_devices`, sends via FCM **immediately** — no scheduler in Launch 1 |
| GET | `/content/:key` (+ `/about` `/contact` `/legal` `/settings`) | none | |
| GET | `/admin/content/:key` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | current content + translations
| PUT | `/admin/content/:key` | `CONTENT_ADMIN`,`SUPER_ADMIN` | update content + translations
| GET | `/admin/audit-logs` | `SUPER_ADMIN` | |
| GET | `/admin/analytics/content` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | most-downloaded documents, feedback summary |

**Campaign targeting reference** (your logic, their data): `BUSINESS_TYPE` + `target_value = "Distributor"` → `users WHERE business_type = 'Distributor'`. `LANGUAGE` → `users.preferred_language`. `COUNTRY` → `users.country_code`. `ALL_USERS` → all active `user_devices`. Then join to `user_devices WHERE is_active` for tokens to send to.

---

## 6. Firebase — your piece specifically

- FCM: POST /admin/campaigns/:id/send resolves the campaign target and sends the campaign payload through firebase-admin. Creating or editing a notification does not send it unless it is explicitly invoked by the campaign send flow.

- FCM sends are batched at a maximum of 500 targets per invocation. FCM tokens are deduplicated before batching. Per-target failures are collected; invalid/unregistered tokens are marked inactive in user_devices. Campaign status becomes SENT after the send operation completes, even if individual targets fail. The response returns targetCount, successCount, and failureCount.


- **Storage**: your uploads (`documents`, testimonial media) go through the shared `mediaUpload.js` → Firebase Admin SDK → `media_assets` row. No signed URLs, no client-to-Firebase-direct path — server-mediated only.
- **Analytics**: not yours to instrument (that's the Mobile Team's SDK work) — but your `/admin/analytics/content` endpoint is the backend-native aggregate (download/feedback counts) that's genuinely your responsibility, so "analytics" isn't a total hand-off.

---

## 7. Your timeline — Phase 1 (7–25 Aug 2026)

Milestones apply to the whole backend, not just you — flagged where they land on your work specifically.

| Date | Day | What you're building |
|---|---|---|
| Fri 7 Aug | 1 | **Paired with Vishal:** ERD lock, repo init, Docker Compose, core middleware incl. `auditContext`/`auditService`, endpoint list, accounts (Neon/Render/Firebase) |
| Sat 8 Aug | 2 | `content.prisma` + `engagement.prisma`: all 10 of your tables |
| Sun 9 Aug | 3 | *(Vishal's `/health`+`/ready` milestone — nothing blocking on you today, good day to get ahead on read APIs)* |
| Mon 10 Aug | 4 | `documents`, `testimonials`, `faqs` — public read APIs |
| Tue–Wed 11–12 Aug | 5–6 | Dealer locator (Haversine); feedback submit; notifications public feed |
| — | — | **Milestone Wed 12 Aug evening: your read endpoints go into the shared Postman v1** |
| Thu–Fri 13–14 Aug | 7–8 | Admin CRUD: documents (+ file upload + `is_published`), testimonials, FAQs — incl. `GET /:id` detail views |
| Sat–Sun 15–16 Aug | 9–10 | Admin CRUD: dealers (+ `is_active`), feedback + CSV export; notifications/campaigns incl. `/send`; `admin-users` module; wire FCM end to end |
| — | — | **Milestone Sun 16 Aug: your half of the backend is feature-complete** |
| Mon–Tue 17–18 Aug | 11–12 | **Paired with Vishal + Mobile Team:** swap mocks → real, fix contract mismatches |
| Wed–Thu 19–20 Aug | 13–14 | Bug bash; implement Aary integration/smoke suite: admin auth/roles, admin deactivation, CMS draft→publish, campaign targeting, FCM aggregation, audit logging, feedback submission/export. |
| Fri 21 Aug | 15 | **Your lead task:** finalize Swagger aggregation (both your endpoints and Vishal's) + Postman export + README |
| Sat 22 Aug | 16 | **Paired:** full regression with Mobile Team. **Contract freeze from here — no more shape changes.** |
| Sun–Mon 23–24 Aug | 17–18 | Buffer, submission package |
| Tue 25 Aug | 19 | **Submit** |

---

## 8. Your Phase 2 (Launch 2), 26 Aug – 25 Sep 2026

| Week | What you're building |
|---|---|
| 26 Aug – 1 Sep | Paired: distributor role/persona design, claims schema, asset-library schema |
| 2–8 Sep | Asset library CRUD (public + admin) |
| 9–15 Sep | Training centre |
| 16–22 Sep | Selectors: **Pressure Advisor**, **Reverse Track Selector**, **Rubber Pad Selector** — *blocked on the CL team's formulas/data, don't guess* |
| 23–25 Sep | Paired: integration, testing, docs, submission prep |

(Vishal's Phase 2: distributor login/roles, claims portal, Selectors — Product Selector + TKPH Selector, analytics dashboard continuation.)

---

## 9. Rules that keep this conflict-free (same for both of you, worth repeating here)

- **`prisma/schema/content.prisma` and `engagement.prisma` are yours alone.** `git pull` before editing, commit + push before running `npm run prisma:migrate`, one-line heads-up in chat.
- **`package.json`**: pull → install → commit → push → heads-up. The one file you'll occasionally both touch.
- **Cross-domain reads** (querying `users`/`user_devices`/`products`/`categories` for your own features): always through your own `repository.js` calling Prisma directly. Never import Vishal's `*.repository.js` or `*.service.js`.
- **Audit logging is a habit, not automatic**: every mutating method in your `*.service.js` files ends with a call to `auditService.record(...)`.
- **Soft delete only**: `is_active`/`is_published` toggles, never hard `DELETE`, on any content table.

---

## 10. Your Definition of Done

### Launch 1 (25 Aug)
- [ ] All Section 5 endpoints live, exact roles enforced, incl. `GET /:id` on every CMS resource
- [ ] Every mutation in your services calls `auditService.record()`; `LOGIN` written directly by `admin-auth`; failed logins go to Winston only
- [ ] `documents.is_published` / `dealers.is_active` implemented, public endpoints filter correctly
- [ ] `admin-users` module live, `SUPER_ADMIN`-gated
- [ ] Campaign send flow working end to end for all 4 `target_type`s, against real `user_devices` data
- [ ] Feedback CSV export working as its own endpoint
- [ ] Aary integration/smoke suite passes in CI:
      admin login + role enforcement,
      admin deactivation,
      CMS draft→publish,
      campaign targeting,
      FCM batch/send aggregation,
      audit logging,
      feedback submission/export.
- [ ] Swagger/Postman aggregation done (your lead task) covering both halves of the API
- [ ] No mocks remaining on your endpoints in the Mobile Team's build as of 22 Aug freeze
- [ ] `/admin/content/:key` GET + PUT implemented with exact role enforcement

### Launch 2 (25 Sep)
- [ ] Asset library + training centre live
- [ ] Selectors (Pressure Advisor, Reverse Track, Rubber Pad) implemented if CL data arrived — documented as pending otherwise, not silently missing
- [ ] `/admin/analytics/content` returning real download/feedback aggregates


## testing
Test 1 — Admin login
POST /admin/auth/login
        ↓
access token
refresh token
        ↓
200

Verify a LOGIN audit record exists.

Test 2 — Role enforcement

Create:

SUPER_ADMIN
CONTENT_ADMIN
MARKETING
VIEWER

Then verify:

SUPER_ADMIN
→ admin-users POST = 200

CONTENT_ADMIN
→ admin-users POST = 403

MARKETING
→ documents PATCH = 403

VIEWER
→ documents GET = 200
→ documents PATCH = 403

This proves your role model actually works.

Test 3 — Admin deactivation

This is especially important because you just added is_active.

SUPER_ADMIN
    ↓
PATCH /admin/admin-users/:id
    ↓
is_active = false

Then:

disabled admin
→ login = 401/403
→ refresh = 401/403

Also verify their refresh tokens are revoked.

This test validates the schema addition you just made.

Test 4 — CMS publish workflow
POST /admin/documents

Expected:

is_published = false

Then:

GET /documents

Document should not appear.

Then:

PATCH /admin/documents/:id
{
    "is_published": true
}

Then:

GET /documents

Document does appear.

And audit log contains:

PUBLISH

This validates your new default(false) behavior.

Test 5 — Campaign targeting

Create devices:

User A
business_type = Distributor
country = IN
language = en

User B
business_type = Dealer
country = IN
language = en

User C
business_type = Distributor
country = FR
language = fr

Then campaign:

BUSINESS_TYPE = Distributor

Expected:

A
C

not B.

Then test:

COUNTRY = IN

Expected:

A
B

Then:

LANGUAGE = fr

Expected:

C

Then:

ALL_USERS

Expected:

all active device tokens

That's the most important Aary-specific integration test.

Test 6 — FCM send

You don't necessarily need to hit real Firebase in CI.

Mock firebase-admin.

Verify:

1001 tokens
→ 3 batches

because:

500 + 500 + 1

And verify:

successCount
failureCount
targetCount

are aggregated correctly.

Also simulate an:

UNREGISTERED

token and verify:

user_devices.is_active = false
Test 7 — Audit

Take one mutation:

PATCH /admin/faqs/:id

Verify:

audit_logs
actor_id
action = UPDATE
entity_type = FAQ
entity_id
before
after
ip_address
user_agent

That proves your audit architecture actually works.

Test 8 — Feedback export

Create feedback records.

Call:

GET /admin/feedback/export?format=csv

Verify:

200
Content-Type = text/csv

and the expected rows exist.

