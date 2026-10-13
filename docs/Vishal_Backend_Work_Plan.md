# CAMSO Mobile App — Backend Plan: Vishal
### Catalogue, Search & Identity
### Derived from `CAMSO_Backend_Plan_Aary_Vishal.md` (v4, frozen) — if anything here ever conflicts with that file, the master file wins.

> This is your execution doc — everything you need day to day without keeping the master open. Aary has the equivalent doc for her half (`CAMSO_Backend_Plan_Aary.md`). Together, the two are designed to cover the master doc's Phase 1 scope with **zero overlap and zero gaps** — every table, endpoint, and timeline row in the master appears in exactly one of the two docs, except the Core section, which both of you need in full and both docs carry identically since you build it together on Day 1.

---

## 1. Your slice, in one sentence

You own the SOW's Module 2 ("Product Catalogue, Search & Identity") end to end — public user identity, guest sessions, device registration, the complete product and category catalogue, search discovery, user bookmarks with guest-to-account synchronization, backend catalogue analytics, plus the core deployment and platform foundation (`/health` and `/ready`).

You are **not** building a separate auth system from Aary — the JWT signing scheme, refresh-token rotation mechanics, and core security middleware are shared, built once on Day 1 (Section 2). What's genuinely yours: public user and guest session lifecycles, device-linked sessions (`user_devices`), the full product catalogue data structures and specification filters, ranked search without external search engines, bookmark deduplication via database partial unique indexes, and platform infrastructure.

---

## 2. What's shared (Core) — build this with Aary on Day 1, then never touch it alone

You both need this in full; it's identical in both docs on purpose.

**Core tables** (`prisma/schema/core.prisma`):

| Table | Key fields |
|---|---|
| `languages` | `code` PK, `name`, `is_active` |
| `translations` | `entity_type`, `entity_id`, `field`, `language_code` FK, `value`, `@@unique([entity_type, entity_id, field, language_code])`. `entity_id` is intentionally not a real FK — polymorphic by design, application-level integrity, documented as a trade-off in the README, not an oversight. |
| `media_assets` | `url`, `filename`, `mime_type`, `size_bytes`, `uploaded_by_admin_id` FK, `created_at` |
| `audit_logs` | `actor_type`(`ADMIN`), `actor_id`, `action` enum(`CREATE`,`UPDATE`,`DELETE`,`PUBLISH`,`UNPUBLISH`,`LOGIN`), `entity_type`, `entity_id`, `changes` jsonb, `ip_address`, `user_agent`, `created_at` |
| `refresh_tokens` | `user_id` FK nullable, `admin_user_id` FK nullable, `token_hash`, `expires_at`, `revoked_at`, `device_id`, `created_at`, `CHECK ((user_id IS NOT NULL) <> (admin_user_id IS NOT NULL))` |

**Refresh flow** (shared `tokenService`, used by your `auth` module and Aary's `admin-auth` module identically): hash incoming token → find a non-revoked, non-expired row by hash → found → revoke it, issue new access+refresh pair (rotation). Not found / already revoked (replay) → treat as compromised, revoke every active token for that principal, force re-login.

**Core middleware/services you'll call into constantly, but never edit solo:**
- `core/middleware/authGuard.js` — verifies JWT (`USER` or `GUEST`), attaches `req.user = { id, email, isGuest }`
- `core/middleware/adminGuard.js`, `requireRole.js` — for your `/admin/categories`, `/admin/products`, and `/admin/analytics/catalogue` endpoints
- `core/middleware/auditContext.js` — attaches `req.auditContext` (actor/ip/user-agent). **Does not write anything.**
- `core/services/auditService.js` — `auditService.record({ actorId, action, entityType, entityId, before, after })`. **You call this yourself**, one line, at the end of every mutating method in your own admin `<name>.service.js` files (categories and products CRUD) — a generic middleware can't know your before/after state, only your service can. Audit logging is a habit applied to every mutation write path you build.
- `core/utils/mediaUpload.js`, `translate.js`, `pagination.js`, `ApiResponse.js`, `ApiError.js`, `password.js`, `tokenService.js`

**Shared, Day-1-only files you'll pair on and then leave alone**: `prisma/schema.prisma`, `src/app.js`, `src/server.js`, `src/routes/index.js`, `src/config/*`, `docker-compose.yml`, `Dockerfile`, `.github/workflows/ci.yml`.

---

## 3. Your tables — `catalogue.prisma` and `search.prisma`

Real file names, not your name — you'll find these under `prisma/schema/`.

### `catalogue.prisma`

| Table | Fields |
|---|---|
| `users` | `id`, `email` unique nullable, `phone` unique nullable, `password_hash` nullable, `display_name`, `business_type` enum(`DEALER`,`DISTRIBUTOR`,`OEM`,`EMPLOYEE`,`OTHER`) nullable, `country_code` (ISO 3166-1 alpha-2, e.g. `IN`/`FR`/`DE`/`IT`), `preferred_language` default `en`, `is_guest` boolean default `true`, `created_at`, `updated_at`. **No `device_id` column** — that lives only on `user_devices` now (a user can have several devices; a single `device_id` on `users` was redundant and wrong for multi-device sessions). |
| `user_devices` | `id`, `user_id` FK nullable, `device_id` unique, `fcm_token` nullable, `platform` enum(`ANDROID`,`IOS`), `app_version` nullable, `is_active` boolean default `true`, `last_seen_at` default `now()`, `created_at`, `updated_at` |
| `categories` | `id`, `parent_id` FK self nullable, `slug` unique, `is_active` boolean default `true` — name/description via `translations` |
| `products` | `id`, `pid` unique, `category_id` FK, `slug` unique, `is_active` boolean default `true` — name/description via `translations` |
| `product_images` | `id`, `product_id` FK, `media_asset_id` FK, `sort_order` default `0`, `is_primary` boolean default `false` |
| `product_specifications` | `id`, `product_id` FK, `spec_type` enum(`SPECIFICATION`,`DIMENSION`,`PERFORMANCE`), `spec_key`, `spec_value`, `unit` nullable, `is_filterable` boolean default `false`, `sort_order` default `0` |

### `search.prisma`

| Table | Fields |
|---|---|
| `search_logs` | `id`, `user_id` FK nullable, `device_id` nullable, `query_text`, `filters` jsonb nullable, `results_count` int, `created_at` default `now()` |
| `popular_searches` | `query_text` unique PK, `hit_count` int default `1`, `last_updated` default `now()` |
| `bookmarks` | `id`, `user_id` FK nullable, `device_id` nullable, `product_id` FK, `created_at` default `now()`. Uniqueness enforced via **database partial unique indexes**, not a plain composite constraint — see Section 5. |

**Naming convention you're following**: catalogue/operational entities use `is_active` (`users`, `user_devices`, `categories`, `products`); Aary's CMS text/media content uses `is_published` (`documents`, `testimonials`, `faqs`). Keep this soft-delete convention strictly distinct.

### Tables you read but don't own (Aary's — reference only, full detail in her doc)

| Table | Fields you actually need | Why you need them |
|---|---|---|
| `admin_users` | `id`, `role`, `is_active` | Admin role verification for `/admin/categories`, `/admin/products`, and `/admin/analytics/catalogue` |
| `media_assets` | `id`, `url`, `filename` | FK target from `product_images` |

You query these through **your own** `products.repository.js` / etc. calling Prisma directly — never by importing anything from `src/modules/admin-users/`, `src/modules/admin-auth/`, or any other file Aary owns. That's the cross-domain repository rule that keeps two developers on one repo from touching each other's code.

---

## 4. Your module folders

```
src/modules/
├── auth/           # POST /auth/guest, /auth/register, /auth/login, /auth/refresh
├── users/          # GET /users/me, PATCH /users/me
├── devices/        # POST /devices, DELETE /devices/:id (registers FCM tokens on user_devices)
├── categories/     # public category tree/filters + admin CRUD (incl. /:id detail view)
├── products/       # public product list/detail/specs + admin CRUD + image attachments
├── search/         # public ranked search, recent searches, popular searches
└── bookmarks/      # GET/POST/DELETE /bookmarks, POST /bookmarks/sync (guest->account merge)
```

Each module folder follows the standard architecture: `<name>.routes.js` (public), `<name>.admin.routes.js` (admin routes, where applicable), `<name>.controller.js`, `<name>.service.js` (calls `auditService.record()` on mutations), `<name>.repository.js` (the only file that imports Prisma), `<name>.validation.js` (Joi).

`src/routes/index.js` acts as the route aggregator — mount module routes systematically by convention.

---

## 5. Your API surface

Conventions that apply across your entire API surface:
- Pagination on all lists: `page` (default 1), `pageSize` (default 20, max 100), `sort`.
- Standard envelope: `{ success: true, data, meta: { page, pageSize, total, totalPages } }`.
- Standard error envelope: `{ success: false, error: { type, message, details } }`.
- Identity is verified via JWT Bearer tokens only (`sub` claim) — never trust client-supplied `user_id` or `device_id` query parameters.
- Soft delete: `PATCH .../:id` toggling `is_active` — never hard `DELETE` on catalogue entities.
- Admin detail views: every CMS resource gets a `GET /:id` detail view in the admin namespace.

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/guest` | none | Issues `GUEST` JWT + refresh token |
| POST | `/auth/register` | none | Creates user or upgrades guest account; bcrypt hash; issues `USER` JWT + refresh token |
| POST | `/auth/login` | none | Password authentication; issues `USER` JWT + refresh token |
| POST | `/auth/refresh` | refresh token | Atomic token rotation & reuse-detection via `tokenService` |
| GET | `/users/me` | JWT | Returns current authenticated user profile |
| PATCH | `/users/me` | JWT | Update `display_name`, `phone`, `preferred_language`, `business_type`, `country_code` |
| POST | `/devices` | JWT | Register/update FCM token, platform, app_version on `user_devices` |
| DELETE | `/devices/:id` | JWT | Deactivates device (`is_active = false`) |
| GET | `/categories` | none | Public category hierarchy (parent/child tree), active only |
| GET | `/categories/:id` | none | Category detail view + child categories |
| GET | `/categories/:id/products` | none | Products within category (paginated) |
| GET | `/categories/:id/filters` | none | Filterable specification attributes available for category |
| GET | `/admin/categories` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | List all categories (including inactive) |
| GET | `/admin/categories/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | Category detail view for Admin CMS |
| POST | `/admin/categories` | `CONTENT_ADMIN`,`SUPER_ADMIN` | Create category; records audit log |
| PATCH | `/admin/categories/:id` | `CONTENT_ADMIN`,`SUPER_ADMIN` | Update category / toggle `is_active`; records audit log |
| GET | `/products` | none | `?category=&q=&spec_*=&page=&pageSize=&sort=` (active only) |
| GET | `/products/:idOrSlug` | none | Product details, specs, images, translations |
| GET | `/admin/products` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | List all products (including inactive) |
| GET | `/admin/products/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | Product detail view for Admin CMS |
| POST | `/admin/products` | `CONTENT_ADMIN`,`SUPER_ADMIN` | Create product; records audit log |
| PATCH | `/admin/products/:id` | `CONTENT_ADMIN`,`SUPER_ADMIN` | Update product / toggle `is_active`; records audit log |
| POST | `/admin/products/:id/images` | `CONTENT_ADMIN`,`SUPER_ADMIN` | Attach uploaded media asset to product (`sort_order`, `is_primary`) |
| GET | `/search` | none | `?q=&category=&page=&pageSize=`; ranked search; logs to `search_logs` |
| GET | `/search/recent` | JWT | User's recent search queries from `search_logs` |
| GET | `/search/popular` | none | Aggregated top queries from `popular_searches` |
| GET | `/bookmarks` | JWT | User or guest's bookmarked products (paginated) |
| POST | `/bookmarks` | JWT | Bookmark a product; enforces partial unique index |
| DELETE | `/bookmarks/:id` | JWT | Remove bookmark |
| POST | `/bookmarks/sync` | JWT (`USER` only) | Merge guest bookmarks into authenticated account on login |
| GET | `/admin/analytics/catalogue` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | Aggregates: most-searched terms, most-bookmarked products |
| GET | `/health` | none | Process liveness check (`{ status: "ok", timestamp }`) |
| GET | `/ready` | none | Process readiness check (DB connection + core health verified) |

### Key Technical Mechanics

**Search Ranking Priority (Launch 1):**
Search operates via PostgreSQL ILIKE and B-tree/GIN indexes (no Elasticsearch dependencies). Results are ranked strictly in order:
1. Exact PID match
2. Exact product name match
3. Prefix product name match (`<q>%`)
4. Category match
5. Filterable specification match (`product_specifications`)
6. Partial text match (`%<q>%`)

Every executed query is logged to `search_logs` (`query_text`, `filters`, `results_count`, `user_id`, `device_id`), and hits are aggregated into `popular_searches`.

**Bookmark Sync & Partial Unique Index Logic:**
Bookmarks support both guests (identified by `device_id`) and registered users (identified by `user_id`). PostgreSQL partial unique indexes prevent duplicates while permitting nulls:
```sql
CREATE UNIQUE INDEX bookmarks_user_product_unique
  ON bookmarks (user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX bookmarks_device_product_unique
  ON bookmarks (device_id, product_id) WHERE device_id IS NOT NULL;
```
When a guest registers or logs in, `POST /bookmarks/sync` takes the guest `device_id` and re-assigns or copies existing bookmarks to the newly authenticated `user_id` using an `INSERT ... ON CONFLICT DO NOTHING` pattern.

**Liveness vs Readiness:**
- `GET /health`: lightweight process check returning `{ status: "ok", timestamp }`. Used by process monitors and container orchestrators.
- `GET /ready`: verifies active database connectivity (`prisma.$queryRaw` or similar) and core initialization before routing live traffic.

---

## 6. Firebase & Infrastructure — your piece specifically

- **Firebase Storage**: Product image uploads initiated by admins go through the shared `mediaUpload.js` → Firebase Admin SDK → Storage bucket → `media_assets` row → linked to `product_images` (`product_id`, `media_asset_id`, `sort_order`, `is_primary`). No signed URLs, no client-to-Firebase direct path — server-mediated upload only.
- **FCM Device Registration (`user_devices`)**: You own `user_devices` and the endpoints `POST /devices` and `DELETE /devices/:id`. Your role is storing and maintaining valid, active FCM registration tokens, app version, and platform (`ANDROID` / `IOS`). Aary's campaign and notification service directly queries this table to resolve push targets.
- **Analytics Contract**: Mobile Team instruments the Flutter Firebase Analytics SDK. You provide `/admin/analytics/catalogue` as the backend-native aggregate (most-searched queries and most-bookmarked products) so the Admin CMS has immediate data without depending on client-side analytics export pipelines.
- **Infrastructure Reality**: Neon, Render, and Railway were sprint/course development assumptions, not confirmed production infrastructure. **Final production deployment and database hosting infrastructure are strictly pending CEAT confirmation and enterprise AWS environment details.** All configuration and environment variables must remain infrastructure-agnostic.

---

## 7. Your timeline — Phase 1 (7–25 Aug 2026)

Milestones apply to the entire backend; flagged where they land on your work specifically.

| Date | Day | What you're building |
|---|---|---|
| Fri 7 Aug | 1 | **Paired with Aary:** ERD lock, repo init, Docker Compose, core middleware incl. `auditContext`/`auditService`, endpoint list, accounts setup |
| Sat 8 Aug | 2 | `catalogue.prisma` + `search.prisma`: define your 9 tables. Auth scaffolding. Deploy skeleton (`GET /health`, `GET /ready`) |
| Sun 9 Aug | 3 | **Milestone: `/health` + `/ready` live in deployment environment** |
| Mon 10 Aug | 4 | Auth endpoints (`guest`, `register`, `login`, `refresh`); categories public + admin CRUD incl. `/:id` detail |
| Tue–Wed 11–12 Aug | 5–6 | Products list/detail + specification filters; search ranking + recent/popular |
| — | — | **Milestone Wed 12 Aug evening: your read endpoints go into shared Postman v1** |
| Thu–Fri 13–14 Aug | 7–8 | `devices` module; bookmarks + guest→account sync (partial indexes applied) |
| Sat–Sun 15–16 Aug | 9–10 | Polish product/search edge cases; catalogue analytics `/admin/analytics/catalogue`; harden deployment |
| — | — | **Milestone Sun 16 Aug: your half of the backend is feature-complete** |
| Mon–Tue 17–18 Aug | 11–12 | **Paired with Aary + Mobile Team:** swap mocks → real, fix contract mismatches |
| Wed–Thu 19–20 Aug | 13–14 | Bug bash; implement Vishal integration/smoke suite: full auth flow, guest→account migration, bookmark sync, search ranking, device registration |
| Fri 21 Aug | 15 | Final deployment hardening; Swagger verification; support Aary with docs aggregation |
| Sat 22 Aug | 16 | **Paired:** full regression with Mobile Team. **Contract freeze from here — no more shape changes.** |
| Sun–Mon 23–24 Aug | 17–18 | Buffer, submission package |
| Tue 25 Aug | 19 | **Submit** |

---

## 8. Your Phase 2 (Launch 2), 26 Aug – 25 Sep 2026

| Week | What you're building |
|---|---|
| 26 Aug – 1 Sep | Paired: distributor role/persona design, claims schema, asset-library schema |
| 2–8 Sep | Distributor login/roles + persona-guard |
| 9–15 Sep | Claims portal |
| 16–22 Sep | Selectors: **Product Selector**, **TKPH Selector** — *strictly blocked on CL team's formulas/data, don't guess* |
| 23–25 Sep | Paired: integration, testing, docs, submission prep |

(Aary's Phase 2: asset library CRUD, training centre, Selectors: Pressure Advisor, Reverse Track Selector, Rubber Pad Selector.)

---

## 9. Rules that keep this conflict-free (same for both of you, worth repeating here)

- **`prisma/schema/catalogue.prisma` and `search.prisma` are yours alone.** `git pull` before editing, commit + push before running `npm run prisma:migrate`, one-line heads-up in chat.
- **`package.json`**: pull → install → commit → push → heads-up. The one file you'll occasionally both touch.
- **Cross-domain reads** (querying `admin_users`/`media_assets` for your own features): always through your own `repository.js` calling Prisma directly. Never import Aary's `*.repository.js` or `*.service.js`.
- **Audit logging is a habit, not automatic**: every mutating method in your admin `*.service.js` files (categories, products) ends with an explicit call to `auditService.record(...)`.
- **Soft delete only**: `is_active` toggles, never hard `DELETE`, on any catalogue table.
- **Partial unique indexes on bookmarks**: never use schema-level preview flags for `bookmarks` uniqueness; apply via custom SQL migration files.
- **No invented data or infrastructure**: Do not invent CEAT catalogue schemas, selector algorithms, or AWS infrastructure parameters.

---

## 10. Your Definition of Done

### Launch 1 (25 Aug)
- [ ] All Section 5 endpoints live, exact roles enforced, incl. `GET /:id` on every Admin CMS resource
- [ ] Guest session (`POST /auth/guest`) and registered user (`POST /auth/register`, `/login`) auth operating via JWT only (no query-param identity)
- [ ] Atomic refresh-token rotation and reuse-detection fully operational; compromised tokens trigger instant revocation of all active sessions
- [ ] User profile endpoints (`GET /users/me`, `PATCH /users/me`) functional with Joi validation
- [ ] `user_devices` registration working accurately; active FCM tokens correctly queryable for Aary's campaign targeting
- [ ] `users.country_code` populated; legacy `device_id` column fully removed from `users` table
- [ ] Product catalogue filtering, specification queries, and category hierarchy functional with active-only filtering
- [ ] Multi-tier search ranking (exact PID > name > prefix > category > spec > partial) functional without Elasticsearch; query logging active
- [ ] Bookmark sync verified; partial unique indexes applied and validated against duplicate insertion
- [ ] Every mutation in your admin services calls `auditService.record()`
- [ ] `/health` and `/ready` checks live in production
- [ ] Vishal integration/smoke suite passes in CI: full auth flow, guest→account upgrade, token rotation, bookmark sync, search ranking
- [ ] No mocks remaining on your endpoints in the Mobile Team's build as of 22 Aug freeze

### Launch 2 (25 Sep)
- [ ] Distributor login/roles gating restricted catalogue content correctly
- [ ] Claims portal live
- [ ] Selectors (Product Selector, TKPH Selector) implemented if CL data arrived — documented as pending otherwise, not silently missing
- [ ] `/admin/analytics/catalogue` returning real search and bookmark aggregates

---

## 11. Testing

```
Test 1 — Guest authentication & session generation
POST /auth/guest
        ↓
{
    "device_id": "test-device-uuid",
    "platform": "ANDROID"
}
        ↓
access token (role: GUEST, is_guest: true)
refresh token
        ↓
200 OK

Verify user record created in users with is_guest = true, email = null, password_hash = null.
Verify device record created/linked in user_devices.
Verify refresh token stored in refresh_tokens with SHA-256 hash.

Test 2 — User registration & password hashing
POST /auth/register
        ↓
{
    "email": "dealer@ceat.com",
    "password": "SecurePassword123!",
    "display_name": "CEAT Dealer 1",
    "device_id": "test-device-uuid"
}
        ↓
access token (role: USER, is_guest: false)
refresh token
        ↓
201 Created

Verify password_hash is a valid bcrypt hash ($2b$10$...).
Verify email uniqueness is enforced (duplicate registration returns 409 Conflict).
Verify device link transferred to registered user in user_devices.

Test 3 — User login & JWT issuance
POST /auth/login
        ↓
{
    "email": "dealer@ceat.com",
    "password": "SecurePassword123!"
}
        ↓
access token
refresh token
user { id, email, display_name }
        ↓
200 OK

Verify invalid password returns 401 Unauthorized.
Verify non-existent email returns 401 Unauthorized.

Test 4 — Refresh token rotation
POST /auth/refresh
        ↓
{
    "refreshToken": "<valid-refresh-token>"
}
        ↓
new access token
new refresh token
        ↓
200 OK

Verify previous refresh token row has revoked_at timestamp set.
Verify new refresh token row is inserted with distinct token_hash.

Test 5 — Refresh token reuse detection (security compromise)
Replay old refresh token:
POST /auth/refresh
        ↓
{
    "refreshToken": "<already-revoked-token>"
}
        ↓
401 / 403 Forbidden

Verify ALL active refresh tokens for that user_id are immediately revoked (revoked_at set).
Verify subsequent refresh requests fail until the user logs in again.

Test 6 — User profile retrieval & update
GET /users/me
Headers: Authorization: Bearer <access-token>
        ↓
200 OK
{
    "id": "...",
    "email": "dealer@ceat.com",
    "display_name": "CEAT Dealer 1"
}

Then:
PATCH /users/me
{
    "display_name": "Updated Dealer Name",
    "preferred_language": "fr"
}
        ↓
200 OK

Verify profile fields updated in users.
Verify request without Authorization header returns 401 Unauthorized.

Test 7 — Device registration & FCM token lifecycle
POST /devices
Headers: Authorization: Bearer <access-token>
{
    "device_id": "device-xyz-123",
    "platform": "IOS",
    "fcm_token": "fcm-sample-token-abc",
    "app_version": "1.0.4"
}
        ↓
200 OK

Verify row in user_devices with is_active = true and last_seen_at updated.

Then deactivation:
DELETE /devices/:id
        ↓
200 OK

Verify user_devices.is_active = false.
Verify Aary's campaign targeting query ignores this device.

Test 8 — Bookmark sync & partial unique index deduplication
1. Guest adds bookmark:
POST /bookmarks (as GUEST)
{ "product_id": "prod-101", "device_id": "device-xyz-123" }
        ↓
201 Created

2. Guest attempts duplicate bookmark:
POST /bookmarks (as GUEST)
{ "product_id": "prod-101", "device_id": "device-xyz-123" }
        ↓
Blocked by bookmarks_device_product_unique partial index (returns 409 Conflict).

3. User registers/logs in and syncs bookmarks:
POST /bookmarks/sync
Headers: Authorization: Bearer <USER access-token>
{ "device_id": "device-xyz-123" }
        ↓
200 OK

Verify bookmark re-assigned to user_id.
Verify subsequent bookmarks enforce bookmarks_user_product_unique index.

Test 9 — Search ranking priority
Seed products:
- Prod A: PID = "CAMSO-400", name = "Excavator Heavy Track"
- Prod B: PID = "CEAT-200", name = "CAMSO Grip Master"
- Prod C: PID = "CEAT-300", name = "CAMSO Heavy Duty Tire"
- Prod D: PID = "CEAT-900", spec = "CAMSO reinforced casing"

Execute:
GET /search?q=CAMSO
        ↓
200 OK

Verify ranking order:
1. Prod A (exact PID match)
2. Prod B / C (exact or prefix name match)
3. Prod D (spec attribute match)
Verify query is recorded in search_logs and popular_searches.hit_count increments.

Test 10 — Catalogue admin mutation & audit logging
PATCH /admin/products/:id
Headers: Authorization: Bearer <CONTENT_ADMIN token>
{
    "is_active": false
}
        ↓
200 OK

Verify product is_active = false.
Verify GET /products does not include this product.
Verify audit_logs row created:
  actor_type = ADMIN
  action = UPDATE
  entity_type = PRODUCT
  entity_id = :id
  changes = { "is_active": { "before": true, "after": false } }
```

---

## 12. Current Repository Checkpoint & Implementation Status

> **Architectural Status**: Feature development on downstream domain modules (`categories`, `products`, `search`, `bookmarks`, `devices`) is **paused** pending CEAT's final data, schema taxonomy, and infrastructure confirmation. These modules are **not currently actionable** to prevent building mock abstractions that will require rework once real CEAT schemas arrive.

### Repository Verification
- **Repository Root**: `camso-backend/` (`c:\Users\visha\OneDrive\Desktop\CEAT\camso-backend`)
- **Active Branch**: `main`
- **Current Git Commit**: `92f9b9a075a0926fc23ce0c7938d4107e231ad30` (`92f9b9a chore: initialize CAMSO backend`)
- **Author**: vishalarkalwar9309 <vishalarkalwar32@gmail.com>
- **Commit Date**: Fri Sep 4 13:04:09 2026 +0530
- **Working Tree**: Clean tracked state; single untracked file (`docs/Vishal_Backend_Work_Plan.md`)
- **Remote Synchronization**: Up to date with `origin/main`
- **Unit Test Results**: **33 passed**, 3 test suites passed, 1 test suite skipped (integration), 0 failed

---

### Detailed Status Breakdown

#### 1. Completed (Code-Complete & Tested in Repository)
- **Phase 1 Project Foundation**:
  - Node.js LTS runtime structure established in `camso-backend/`.
  - Express 5 application factory (`src/app.js`) with Helmet security headers, CORS (`CORS_ORIGINS`), JSON body parsing, Morgan HTTP logging, rate limiting (`express-rate-limit`), route mounting, 404 handler, and central error handling.
  - Server lifecycle manager (`src/server.js`) with process-level crash handlers (`uncaughtException`, `unhandledRejection`) and graceful shutdown invoking `prisma.$disconnect()`.
  - Validated environment loading (`src/config/env.js`) with fail-fast Joi schema checking for all critical variables.
  - JWT configuration constants (`src/config/jwt.js`).
  - Structured logging subsystem (`src/core/logger/index.js` Winston logger with console/file transports + `src/core/logger/morgan.js` stream).
  - Health liveness check (`GET /health`) implemented in `src/routes/index.js` returning `{ status: "ok", timestamp }`.
- **Prisma & Database Foundation**:
  - `prisma/schema.prisma` configured with PostgreSQL datasource and Prisma client generator.
  - Core models defined with production constraints and indexes:
    - `User` (`users` table): `id`, `email`, `phone`, `password_hash`, `display_name`, `is_guest`, `preferred_language`, timestamps, relations to `RefreshToken` and `UserDevice`.
    - `RefreshToken` (`refresh_tokens` table): `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `device_id`, timestamps, foreign key relation with cascade delete to `User`.
    - `UserDevice` (`user_devices` table): `id`, `user_id` (nullable), `device_id` (unique), `platform` enum (`ANDROID`, `IOS`), `app_version`, `fcm_token`, `is_active`, `last_seen_at`, timestamps, foreign key relation with `onDelete: SetNull`.
  - Prisma Client singleton export (`src/config/database.js`).
- **Authentication Implementation (`src/modules/auth/`)**:
  - `POST /auth/guest`: issues `GUEST` JWT and refresh token; provisions guest user and device record.
  - `POST /auth/register`: validates input via Joi, hashes password with bcrypt (salt rounds = 10), creates registered user account or upgrades existing guest session, links device.
  - `POST /auth/login`: validates credentials, verifies bcrypt password hash, issues `USER` JWT and refresh token.
  - `POST /auth/refresh`: implements atomic refresh-token rotation with SHA-256 token hashing and reuse-detection revocation.
  - Layered architecture: `auth.routes.js` → `auth.controller.js` → `auth.service.js` → `auth.repository.js` → Prisma.
- **User Management & Profile APIs (`src/modules/users/`)**:
  - `GET /users/me`: retrieves authenticated user profile (`id`, `email`, `phone`, `display_name`, `preferred_language`, `is_guest`).
  - `PATCH /users/me`: updates user profile fields with Joi validation (`display_name`, `phone`, `preferred_language`).
  - Protected behind `authGuard` middleware.
  - Layered architecture: `users.routes.js` → `users.controller.js` → `users.service.js` → `users.repository.js` → Prisma.
- **Security & Core Middleware**:
  - `src/core/middleware/authGuard.js`: Bearer token extraction, JWT signature and expiration verification, attaching decoded principal (`req.user = { id, email, isGuest }`).
  - `src/core/middleware/errorHandler.js`: centralized 4-argument error handler mapping `ApiError` instances to standard error envelopes, masking sensitive internals in production.
  - `src/core/middleware/notFound.js`: standardized 404 response for unmatched paths.
- **Core Utilities**:
  - `src/core/utils/ApiError.js`: complete error class hierarchy (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `internal`).
  - `src/core/utils/ApiResponse.js`: standardized envelope helpers (`success`, `error`, `paginated`).
  - `src/core/utils/asyncHandler.js`: route exception wrapper.
  - `src/core/utils/pagination.js`: `page`, `pageSize` (max 100), `sort` parsing and Prisma pagination helpers.
  - `src/core/utils/password.js`: bcrypt hashing and timing-safe comparison utilities.
  - `src/core/utils/tokenService.js`: access and refresh token generation, SHA-256 hashing, token verification, atomic token rotation, and comprehensive token revocation on reuse detection.
- **Unit Testing (33 Passing Tests)**:
  - `tests/unit/auth.service.test.js`: **18 tests passing** (guest auth, registration, login, token rotation, reuse detection, edge cases).
  - `tests/unit/tokenService.test.js`: **9 tests passing** (token generation, hashing, verification, rotation, revocation).
  - `tests/unit/password.test.js`: **6 tests passing** (bcrypt hashing, verification, salt generation).

---

#### 2. Prepared but Blocked
- **Integration Test Suite**:
  - `tests/integration/auth.test.js` contains **25 integration tests** written with Supertest testing the full HTTP request-response flow against the Express app and database.
  - Currently gated via `itDb` helper and skipped (`describe.skip`) because a live PostgreSQL database connection is unavailable locally.
- **Database Migrations (`prisma migrate dev`)**:
  - Initial schema models are defined in `prisma/schema.prisma`, but running migrations to generate physical database tables and SQL migration files is blocked until a database connection is available.
- **Database Concurrency & Row-Locking Verification**:
  - Token rotation race condition logic is coded using Prisma transactions, but validating concurrent execution behavior under live database locks requires a connected PostgreSQL instance.

---

#### 3. Waiting for CEAT (External Blockers)
- **Production Database & Cloud Hosting Infrastructure**:
  - Production hosting and database infrastructure are **pending CEAT confirmation and enterprise AWS environment details**. Neon, Render, and Railway are not assumed as final production infrastructure.
- **Firebase Project & Service Account Credentials**:
  - Firebase Admin SDK credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`) have not been provided by CEAT. This blocks live FCM token testing and product media uploads to Firebase Storage.
- **Final Catalogue Data & Taxonomy**:
  - Final CEAT product hierarchy, category tree, specification taxonomy, dimensions, and multilingual content (FR, DE, IT) have not been provided.
- **CL Team Technical Selector Data**:
  - Engineering formulas, operating parameters, and compatibility matrices for Launch 2 Selectors (Product Selector, TKPH Selector).

---

#### 4. Not Started & Paused Pending CEAT Inputs
*Downstream feature development is explicitly paused to prevent building unverified schemas or throwaway code:*
- **Categories Module** (`src/modules/categories/`): Public browse + Admin CRUD (`GET /categories`, `GET /categories/:id`, `GET /categories/:id/products`, `GET /categories/:id/filters`, `GET/POST/PATCH /admin/categories`). Paused pending CEAT category taxonomy.
- **Products Module** (`src/modules/products/`): Public listing/detail + Admin CRUD + image attachment (`GET /products`, `GET /products/:idOrSlug`, `GET/POST/PATCH /admin/products`, `POST /admin/products/:id/images`). Paused pending CEAT catalogue data and Firebase Storage credentials.
- **Search Module** (`src/modules/search/`): Multi-tier ranked search, query logging, recent/popular searches (`GET /search`, `GET /search/recent`, `GET /search/popular`). Paused pending final catalogue data.
- **Bookmarks Module** (`src/modules/bookmarks/`): CRUD + guest-to-account bookmark synchronization (`GET/POST/DELETE /bookmarks`, `POST /bookmarks/sync`). Paused pending final product schema and partial unique index migration on live DB.
- **Devices API Endpoints** (`src/modules/devices/`): `POST /devices`, `DELETE /devices/:id`. Paused pending Firebase credentials and FCM testing.
- **Catalogue Analytics** (`GET /admin/analytics/catalogue`): Backend-native aggregate endpoint for most-searched queries and most-bookmarked products. Paused pending search/bookmark data collection.
- **CI/CD Pipeline & Cloud Deployment**: GitHub Actions workflow and deployment configuration paused pending CEAT AWS target infrastructure specifications.
