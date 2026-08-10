# CAMSO Mobile App — Backend Engineering Plan (v4, frozen)
### Backend Team: Aary & Vishal · Mobile/App Team: Avni & Vira
### Source docs: SOW_Mobile_App (INT → CEAT Ltd ballpark proposal, v2.0) + VIT Pune Problem Statement 5 briefing + three rounds of external review

> **This is the master document.** Aary and Vishal each also have a standalone execution doc (`CAMSO_Backend_Plan_Aary.md`, and a `..._Vishal.md` to follow) derived directly from this one — same tables, same endpoints, same dates. If the two ever disagree with this file, this file wins; update it first, then re-sync the individual docs.
>
> **Architecture is frozen as of v4.** Three review passes found progressively smaller issues (structural → security/consistency → field-level correctness), which is the expected shape of "converging," not "still finding new categories of problems." No more tables, no new abstraction layers. From here it's Section 20's changelog and implementation.

---

## 0. Two things answered directly (kept from v3, still relevant)

### "Aren't user auth and admin auth basically the same? What does Aary actually do differently?"

The login mechanics are genuinely similar — one JWT scheme, one `tokenService`, one `refresh_tokens` table. What's different: Aary owns **role enforcement** across her ~27 admin endpoints, **audit-service calls** in every one of her mutating service methods, and admin session security. Not a second login system — ownership of the access-control layer everything else sits behind.

### "Use real file names, not our names"

Prisma schema files are domain-named (`catalogue.prisma`, `search.prisma`, `content.prisma`, `engagement.prisma`, `core.prisma`); ownership is a comment, never a filename. Same for every module folder under `src/modules/`.

---

## 1. Project context (unchanged)

CEAT Ltd. needs a product-companion mobile app (Android + iOS) for its **Camso** brand — Compact Construction Tires and Tracks, no e-commerce. SOW "Scenario A" has us building the full backend end to end.

| Release | Date | Access |
|---|---|---|
| **Launch 1 — Public app** | 25 Aug 2026 | Public |
| **Launch 2 — Restricted P1** | 25 Sep 2026 | Distributor login |
| **Launch 3 — P2 items** | 25 Oct 2026 | *(not in scope for this plan)* |

**Scope**: Launch 1 is submission-critical (25 Aug); Launch 2 continues immediately after through 25 Sep. **Mobile Team** owns all frontend. **Backend Team builds APIs only, no UI.**

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | **Node.js 24 LTS** | Node 20 is EOL (30 Apr 2026). Node 24 is Active LTS, support to Apr 2028 — externally verified as the right call, not reverting to 22. |
| Framework | Express.js | |
| Database | PostgreSQL on Neon.tech | Per-developer DB branching |
| ORM | **Prisma 6.x**, multi-file schema | GA since v6.7.0. Pinned at `6.x` — don't bump the major version without validating multi-file generation/migration first (confirmed `7.0.0` regression). |
| Auth | `jsonwebtoken` + `bcrypt` | One scheme (`tokenService`), two login flows |
| Validation | `joi` | |
| File storage | Firebase Storage, server-side upload via Admin SDK | No signed URLs, no client-to-Firebase-direct path |
| Push | `firebase-admin` (FCM) | Targeting resolved against `user_devices` |
| Analytics | Firebase Analytics SDK (Mobile Team) + backend contract | Section 14 |
| Logging | Winston (app/error) + Morgan (HTTP access) | `LOG_LEVEL` env-configurable |
| API docs | `swagger-jsdoc` + `swagger-ui-express` | |
| Testing | `jest` + `supertest` | Unit + integration + smoke |
| Security | `helmet`, `cors` (`CORS_ORIGINS`-driven), `express-rate-limit` | |
| Local dev | Docker + docker-compose | |
| CI | GitHub Actions: lint → `prisma validate` → `npm audit --audit-level=high` → test → deploy | Audit step is visible, not merge-blocking, for a college-sprint timeline |
| Hosting | Render/Railway (API), Neon (DB) | First deploy Day 2–3 |

---

## 3. System architecture

```mermaid
flowchart TB
    App["Flutter App (Mobile Team)\nConsumer + Admin views"]

    subgraph API["Express API — /api/v1"]
        Ctrl["Controllers"]
        Svc["Services\n(call auditService.record() on mutations)"]
        Mid["Middleware\n(auth, roles, auditContext, errors)"]
        Repo["Repositories\n(only layer that imports Prisma)"]
    end

    Prisma["Prisma Client"]
    DB[(PostgreSQL / Neon)]

    App -- "REST/JSON" --> Ctrl
    Ctrl --> Svc --> Repo --> Prisma --> DB
    Mid -.-> Ctrl

    Svc -- "on campaign send" --> FCM["Firebase Cloud Messaging"]
    FCM -- "push" --> App
    Repo -- "targeting query" --> Devices[("user_devices")]

    Svc -- "server-side upload, Admin SDK" --> Storage["Firebase Storage"]
    Storage -- "returns URL" --> Repo

    App -- "direct SDK events" --> FBA["Firebase Analytics"]
    API -. "IDs/metadata for correlation" .-> FBA
```

Layering, unchanged: `routes.js → controller.js → service.js → repository.js → Prisma → DB`.

**Cross-domain rule** (new in v4, closes a real gap): reading another owner's table — e.g. Aary's campaign service querying `users`/`user_devices` for targeting — always goes through **your own** `repository.js` calling Prisma directly. Never import the other person's `*.repository.js` or `*.service.js` file. This is what keeps the ownership boundary real at the *code* level, not just at the database level — the DB is shared by nature, the codebase doesn't have to be.

---

## 4. Repository structure

```
camso-backend/
├── prisma/
│   ├── schema.prisma                # SHARED, Day 1 only: generator + datasource, no models
│   ├── schema/
│   │   ├── core.prisma              # [Both, Day 1] languages, translations, media_assets,
│   │   │                            #               audit_logs, refresh_tokens
│   │   ├── catalogue.prisma         # [Vishal] users, user_devices, categories, products,
│   │   │                            #          product_images, product_specifications
│   │   ├── search.prisma            # [Vishal] search_logs, popular_searches, bookmarks
│   │   ├── content.prisma           # [Aary] admin_users, documents, document_files,
│   │   │                            #        testimonials, faqs, dealers, feedback, app_content
│   │   └── engagement.prisma        # [Aary] notifications, campaigns
│   └── migrations/                  # auto-generated + hand-edited for partial indexes (below)
│
├── src/
│   ├── server.js                    # SHARED, Day 1 only
│   ├── app.js                       # SHARED, Day 1 only
│   ├── config/                      # SHARED, Day 1 only
│   │   ├── index.js
│   │   ├── database.js              # Prisma client singleton
│   │   ├── firebase.js              # handles FIREBASE_PRIVATE_KEY newline unescaping — see Section 10
│   │   ├── jwt.js
│   │   └── swagger.js
│   ├── core/
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── authGuard.js         # verifies JWT (principal: USER | GUEST), attaches req.principal
│   │   │   ├── adminGuard.js        # verifies admin JWT
│   │   │   ├── requireRole.js
│   │   │   └── auditContext.js      # attaches req.auditContext (actor, ip, user-agent) — does NOT
│   │   │                            #   write anything itself, see Section 11
│   │   ├── services/
│   │   │   └── auditService.js      # .record({actorId, action, entityType, entityId, before, after})
│   │   │                            #   called explicitly by each module's OWN service.js, since
│   │   │                            #   only the service that ran the mutation has before/after state
│   │   ├── logger/
│   │   │   ├── winston.js
│   │   │   └── morgan.js
│   │   └── utils/
│   │       ├── ApiResponse.js
│   │       ├── ApiError.js
│   │       ├── asyncHandler.js
│   │       ├── pagination.js
│   │       ├── tokenService.js      # issue/rotate/revoke — rotation + reuse-detection, Section 7
│   │       ├── translate.js
│   │       └── mediaUpload.js
│   │
│   ├── modules/
│   │   ├── auth/                                 [Vishal]
│   │   ├── users/                                 [Vishal]
│   │   ├── devices/                               [Vishal]
│   │   ├── categories/                            [Vishal]
│   │   ├── products/                              [Vishal]
│   │   ├── search/                                [Vishal]
│   │   ├── bookmarks/                             [Vishal]
│   │   ├── admin-auth/                            [Aary]   # login/refresh + LOGIN audit event
│   │   ├── admin-users/                            [Aary]  # NEW in v4 — SUPER_ADMIN manages admin_users
│   │   ├── documents/                              [Aary]
│   │   ├── testimonials/                           [Aary]
│   │   ├── faqs/                                   [Aary]
│   │   ├── dealers/                                [Aary]
│   │   ├── feedback/                               [Aary]
│   │   ├── notifications/                          [Aary]
│   │   ├── campaigns/                              [Aary]
│   │   └── app-content/                            [Aary]
│   │       # each folder: <name>.routes.js, <name>.admin.routes.js, <name>.controller.js,
│   │       #              <name>.service.js, <name>.repository.js, <name>.validation.js
│   │
│   └── routes/
│       └── index.js                 # AUTO-MOUNTS every module — unchanged since Day 1
│
├── docker-compose.yml
├── Dockerfile                       # FROM node:24-alpine
├── tests/{unit,integration}/
├── docs/{openapi.yaml, CAMSO_Backend.postman_collection.json}
├── .github/workflows/ci.yml
├── .env.example
├── package.json
└── README.md
```

### Migration workflow, incl. partial indexes (Prisma 6.x specifics — new in v4)

Standard schema changes: `git pull` → edit your own `.prisma` file → commit + push → `npm run prisma:migrate` → heads-up in chat.

**Partial unique indexes** (used on `bookmarks` — see Section 7) are **not** expressed as `@@unique` in the schema — that construct isn't a stable, non-preview part of the pinned Prisma 6.x line, and this project isn't taking a dependency on a preview flag for something this easy to do with plain SQL. Mechanism: `npx prisma migrate dev --create-only --name <desc>`, then hand-edit the generated SQL file to add:

```sql
CREATE UNIQUE INDEX bookmarks_user_product_unique
  ON bookmarks (user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX bookmarks_device_product_unique
  ON bookmarks (device_id, product_id) WHERE device_id IS NOT NULL;
```

then apply normally. Treat a hand-edited migration file exactly like any other schema change for the push-before-migrate habit above.

---

## 5. Roles

| Role | Can do |
|---|---|
| `SUPER_ADMIN` | Everything, incl. managing other admin accounts (`/admin/admin-users`), reading `audit_logs` |
| `CONTENT_ADMIN` | CRUD on products, categories, documents, testimonials, FAQs, dealers |
| `MARKETING` | CRUD + send on `notifications` / `campaigns` only |
| `VIEWER` | Read-only on all `/admin/*` |
| *(no role)* | `users` — `business_type` is profile data, not an access-control role in Launch 1 |

---

## 6. Work division — Phase 1 (Launch 1)

| | **Vishal — Catalogue, Search & Identity** | **Aary — Support, Content & Engagement** |
|---|---|---|
| SOW module | Module 2 | Module 3 |
| Core domain | Categories, Products, Specs, Images, Search | Documents, Testimonials, FAQs |
| Identity/session | `users`, `auth`, `user_devices` | `admin_users`, `admin-auth`, **admin-user management (new, SUPER_ADMIN only)**, role enforcement across her endpoints, audit-service calls in every mutation |
| Engagement | Bookmarks | VOC Feedback (+ CSV export), Notifications, Campaigns (targeting + send) |
| Support-adjacent | — | Dealer/distributor locator |
| Admin CRUD | Full, own domain, incl. `GET /:id` detail views | Full, own domain, incl. `GET /:id` detail views |
| Analytics slice | Most-searched / most-bookmarked products | Most-downloaded documents, feedback summary |
| Platform lead | Deployment & CI, `/health` + `/ready` | API docs aggregation |
| Tables owned | 9 | 10 |

---

## 7. Database design — 24 tables

### Core (shared, Day 1)

| Table | Key fields | Notes |
|---|---|---|
| `languages` | `code` PK, `name`, `is_active` | |
| `translations` | `id`, `entity_type`, `entity_id`, `field`, `language_code` FK, `value`; `@@unique([entity_type, entity_id, field, language_code])` | `entity_id` deliberately not a real FK — polymorphic by design, application-level referential integrity, documented as a stated trade-off in the README |
| `media_assets` | `id`, `url`, `filename`, `mime_type`, `size_bytes`, `uploaded_by_admin_id` FK, `created_at` | Named `uploaded_by_admin_id` specifically — every Launch 1 upload is an admin operation |
| `audit_logs` | `id`, `actor_type`(`ADMIN`), `actor_id`, `action` enum(`CREATE`,`UPDATE`,`DELETE`,`PUBLISH`,`UNPUBLISH`,`LOGIN`), `entity_type`, `entity_id`, `changes` (jsonb), `ip_address`, `user_agent`, `created_at` | See Section 11 for the write pattern — `LOGIN` is written directly by `admin-auth`'s service, everything else by the mutating module's own service |
| `refresh_tokens` | `id`, `user_id` FK nullable, `admin_user_id` FK nullable, `token_hash`, `expires_at`, `revoked_at`, `device_id`, `created_at`; `CHECK ((user_id IS NOT NULL) <> (admin_user_id IS NOT NULL))` | **Refresh flow**: hash incoming token → look up a non-revoked, non-expired row by hash → if found, revoke it and issue a new access+refresh pair (rotation). If the incoming token isn't found or is already revoked — i.e. it's being replayed — treat the session as compromised: revoke *every* active token for that `user_id`/`admin_user_id` and force re-login. Implemented once in `tokenService.rotate()` / `tokenService.revokeAll()`, used identically by `auth` and `admin-auth`. |

### Vishal — Catalogue, Search & Identity

| Table | Key fields |
|---|---|
| `users` | `id`, `email`, `phone`, `password_hash` nullable, `business_type` enum, `country_code` (ISO 3166-1 alpha-2, e.g. `IN`/`FR`/`DE`/`IT`), `preferred_language`, `created_at`, `updated_at`. **No `device_id` column** — that lives only on `user_devices` now (a user can have several devices; a single `device_id` on `users` was redundant and wrong for a multi-device guest/account). |
| `user_devices` | `id`, `user_id` FK nullable, `device_id`, `fcm_token`, `platform` enum(`ANDROID`,`IOS`), `app_version`, `is_active`, `last_seen_at`, `created_at`, `updated_at` |
| `categories` | `id`, `parent_id` FK self, `slug`, `is_active` — name/description via `translations` |
| `products` | `id`, `pid`, `category_id` FK, `slug`, `is_active` — name/description via `translations` |
| `product_images` | `id`, `product_id` FK, `media_asset_id` FK, `sort_order`, `is_primary` |
| `product_specifications` | `id`, `product_id` FK, `spec_type` enum(`SPECIFICATION`,`DIMENSION`,`PERFORMANCE`), `spec_key`, `spec_value`, `unit`, `is_filterable`, `sort_order` |
| `search_logs` | `id`, `user_id` FK nullable, `device_id`, `query_text`, `filters` (jsonb), `results_count`, `created_at` |
| `popular_searches` | `query_text`, `hit_count`, `last_updated` |
| `bookmarks` | `id`, `user_id` FK nullable, `device_id`, `product_id` FK, `created_at`. Uniqueness via **partial indexes**, not a plain composite constraint — see Section 4. |

### Aary — Support, Content & Engagement

| Table | Key fields |
|---|---|
| `admin_users` | `id`, `email`, `password_hash`,`is_active Boolean @default(true)`, `role` enum(`SUPER_ADMIN`,`CONTENT_ADMIN`,`MARKETING`,`VIEWER`) |
| `documents` | `id`, `product_id` FK nullable, `category_id` FK nullable, `document_type` enum(`CATALOGUE`,`BROCHURE`,`MANUAL`,`TECHNICAL_GUIDE`,`BULLETIN`,`WARRANTY`,`VIDEO`), `is_published` boolean default `false` — title via `translations` |
| `document_files` | `id`, `document_id` FK, `language_code` FK, `media_asset_id` FK, `is_offline_downloadable` |
| `testimonials` | `id`, `product_id` FK nullable, `customer_name`, `region`, `story_type` enum(`SOLIDS`,`OPERATING_COST`,`WORN_PRODUCT_REPLACEMENT`,`REPEAT_PURCHASE`), `content`, `media_asset_id` nullable, `is_published`boolean default `false` |
| `faqs` | `id`, `product_id` FK nullable, `category` enum(`COMPANY`,`PRODUCT`,`DISTRIBUTION`), `sort_order`, `is_published`boolean default `false` — question/answer via `translations` |
| `dealers` | `id`, `name`, `type` enum(`DEALER`,`DISTRIBUTOR`), `address`, `city`, `state`, `country`, `geo_lat`, `geo_lng`, `phone`, `email`, `has_csr`, **`is_active`** boolean default `true` |
| `feedback` | `id`, `user_id` FK nullable, `device_id`, `product_id` FK nullable, `bucket` enum(`PRODUCT`,`SERVICE`,`PRICING`), `rating`, `comment`, `created_at` |
| `notifications` | `id`, `product_id` FK nullable, `campaign_id` FK nullable, `notification_type` enum(`NEW_LAUNCH`,`DISCONTINUED`,`PROMOTION`), `created_by` FK, `status`, `sent_at` — title/body via `translations` |
| `campaigns` | `id`, `name`, `target_type` enum(`ALL_USERS`,`BUSINESS_TYPE`,`LANGUAGE`,`COUNTRY`), `target_value` nullable, `status` enum(`DRAFT`,`SENT`), `scheduled_at` nullable — **informational only for Launch 1, no cron/queue drives it** (Section 8), `created_by` FK |
| `app_content` | `id`, `key` unique, `extra` (jsonb, nullable) — content via `translations` |

**Active/published convention** (new in v4): catalogue & operational entities use `is_active` (`products`, `categories`, `dealers`, `users`, `user_devices`); CMS text/media content uses `is_published` (`documents`, `testimonials`, `faqs`). Same soft-delete mechanism, different field name — a product going inactive and an FAQ being unpublished are different kinds of action, worth keeping visually distinct.

**Campaign targeting, concretely**: `target_type = BUSINESS_TYPE` + `target_value = "Distributor"` → `users WHERE business_type = 'Distributor'` joined to `user_devices` for active tokens. `LANGUAGE` → `users.preferred_language`. `COUNTRY` → `users.country_code`. All resolved in Aary's own `campaigns.repository.js` querying Vishal's tables directly via Prisma (Section 4's cross-domain rule) — never by importing his files.

### Simplified ER overview

```mermaid
erDiagram
    CATEGORIES ||--o{ CATEGORIES : "parent of"
    CATEGORIES ||--o{ PRODUCTS : contains
    PRODUCTS ||--o{ PRODUCT_IMAGES : has
    PRODUCTS ||--o{ PRODUCT_SPECIFICATIONS : has
    PRODUCTS ||--o{ BOOKMARKS : "bookmarked as"
    PRODUCTS ||--o{ DOCUMENTS : "documented by"
    PRODUCTS ||--o{ TESTIMONIALS : "referenced by"
    PRODUCTS ||--o{ FAQS : "referenced by"
    PRODUCTS ||--o{ NOTIFICATIONS : "referenced by"
    DOCUMENTS ||--o{ DOCUMENT_FILES : has
    CAMPAIGNS ||--o{ NOTIFICATIONS : groups
    USERS ||--o{ USER_DEVICES : registers
    USERS ||--o{ BOOKMARKS : has
    USERS ||--o{ FEEDBACK : submits
    USERS ||--o{ REFRESH_TOKENS : "holds (nullable)"
    ADMIN_USERS ||--o{ REFRESH_TOKENS : "holds (nullable)"
    ADMIN_USERS ||--o{ NOTIFICATIONS : creates
    ADMIN_USERS ||--o{ CAMPAIGNS : creates
    MEDIA_ASSETS ||--o{ PRODUCT_IMAGES : "used by"
    MEDIA_ASSETS ||--o{ DOCUMENT_FILES : "used by"
    TRANSLATIONS }o--|| LANGUAGES : in
```

---

## 8. API conventions

**Pagination**: `page` (default 1), `pageSize` (default 20, max 100), `sort`. Response `meta`: `{ page, pageSize, total, totalPages }`.

**Errors**: `{ success: false, error: { type, message, details } }`, `type` ∈ `VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | INTERNAL_ERROR`.

**Identity**: JWT only — never a trusted `device_id`/`user_id` query param. `POST /auth/guest` issues a `GUEST` JWT the same way `/auth/login` issues a `USER` one.

**Soft delete / unpublish**: `PATCH .../:id` toggling `is_active` or `is_published` per the Section 7 convention — never a hard `DELETE` on content.

**Every CMS resource gets a `GET /:id` detail view in the admin namespace** (new in v4) — list endpoints alone aren't enough for an admin UI to build an edit screen.

**Search ranking (Launch 1)**: ILIKE + B-tree/GIN indexes, ranked (1) exact PID, (2) exact name, (3) prefix name, (4) category match, (5) filterable-spec match, (6) partial text. No Elasticsearch. Postgres full-text search is the one later upgrade worth considering, not before.

**Dealer locator (Launch 1)**: Haversine distance in SQL, no PostGIS.

**Campaign send (Launch 1)**: no scheduler/cron/queue. `POST /admin/campaigns` creates a `DRAFT`. `POST /admin/campaigns/:id/send` resolves targeting and calls FCM **immediately**. `scheduled_at` is informational only for Launch 1 — true scheduled auto-send is an explicit Phase 2+ item, not something this doc is quietly promising for 25 Aug.

**Liveness vs readiness**: `GET /health` — process alive (Render points here). `GET /ready` — alive **and** DB reachable **and** Firebase initialized (for internal checks).

### Vishal's endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/guest` \| `/auth/register` \| `/auth/login` \| `/auth/refresh` | none / refresh token | |
| GET/PATCH | `/users/me` | JWT | |
| POST | `/devices` | JWT | register/update FCM token |
| DELETE | `/devices/:id` | JWT | |
| GET | `/categories` \| `/categories/:id` \| `/categories/:id/products` \| `/categories/:id/filters` | none | |
| GET | `/admin/categories` \| `/admin/categories/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |
| POST | `/admin/categories` | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| PATCH | `/admin/categories/:id` | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| GET | `/products` \| `/products/:idOrSlug` | none | `?category=&q=&spec_*=&page=&pageSize=&sort=` |
| GET | `/admin/products` \| `/admin/products/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |
| POST | `/admin/products` | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| PATCH | `/admin/products/:id` | `CONTENT_ADMIN`,`SUPER_ADMIN` | incl. `is_active` toggle |
| POST | `/admin/products/:id/images` | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| GET | `/search` \| `/search/recent` \| `/search/popular` | none / JWT / none | |
| GET/POST/DELETE | `/bookmarks` | JWT | |
| POST | `/bookmarks/sync` | JWT (`USER` only) | |
| GET | `/admin/analytics/catalogue` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |
| GET | `/health` \| `/ready` | none | |

### Aary's endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/admin/auth/login` \| `/admin/auth/refresh` | none / refresh token | login writes `audit_logs` action `LOGIN` directly |
| GET | `/admin/admin-users` \| `/admin/admin-users/:id` | `SUPER_ADMIN` | **new in v4** |
| POST | `/admin/admin-users` | `SUPER_ADMIN` | create admin account + role |
| PATCH | `/admin/admin-users/:id` | `SUPER_ADMIN` | change role / deactivate |
| GET | `/documents` \| `/documents/:id` | none | published only; resolves `document_files` for requested language |
| GET | `/admin/documents` \| `/admin/documents/:id` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |
| POST | `/admin/documents` | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| PATCH | `/admin/documents/:id` | `CONTENT_ADMIN`,`SUPER_ADMIN` | incl. `is_published` toggle |
| POST | `/admin/documents/:id/files` | `CONTENT_ADMIN`,`SUPER_ADMIN` | |
| GET | `/testimonials` | none | |
| GET/POST/PATCH | `/admin/testimonials`(`/:id`) | `VIEWER` (GET) / `CONTENT_ADMIN`,`SUPER_ADMIN` (write) | |
| GET | `/faqs` | none | |
| GET/POST/PATCH | `/admin/faqs`(`/:id`) | `VIEWER` (GET) / `CONTENT_ADMIN`,`SUPER_ADMIN` (write) | |
| GET | `/dealers/locator` \| `/dealers/csr-contact` | none | |
| GET/POST/PATCH | `/admin/dealers`(`/:id`) | `VIEWER` (GET) / `CONTENT_ADMIN`,`SUPER_ADMIN` (write) | incl. `is_active` toggle |
| POST | `/feedback` | JWT | |
| GET | `/admin/feedback` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | list/filter |
| GET | `/admin/feedback/export?format=csv` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | **explicit endpoint, new in v4** |
| GET | `/notifications` | none | |
| GET/POST/PATCH | `/admin/notifications`(`/:id`) | `VIEWER` (GET) / `MARKETING`,`SUPER_ADMIN` (write) | |
| GET/POST/PATCH | `/admin/campaigns`(`/:id`) | `VIEWER` (GET) / `MARKETING`,`SUPER_ADMIN` (write) | creates as `DRAFT` |
| POST | `/admin/campaigns/:id/send` | `MARKETING`,`SUPER_ADMIN` | **new in v4** — resolves targeting, sends immediately |
| GET | `/content/:key` (+ `/about` `/contact` `/legal` `/settings`) | none | |
| GET | `/admin/content/:key` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | current content + translations
| PUT | `/admin/content/:key` | `CONTENT_ADMIN`,`SUPER_ADMIN` | update content + translations
| GET | `/admin/audit-logs` | `SUPER_ADMIN` | |
| GET | `/admin/analytics/content` | `VIEWER`,`CONTENT_ADMIN`,`SUPER_ADMIN` | |

---

## 9. Git & Prisma workflow

`main` deployable, `dev` integration branch, `feat/<module>-<desc>` branches. Shared Day-1-only files: `prisma/schema.prisma`, `src/app.js`, `src/server.js`, `src/routes/index.js`, `src/config/*`. `package.json`: pull → install → commit → push → heads-up. `prisma/schema/*.prisma`: your own file only. Migration + partial-index habit: Section 4. Cross-domain reads: Section 3.

---

## 10. Environment & local setup

```bash
git clone <repo-url> && cd camso-backend
cp .env.example .env
docker compose up -d db
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

`.env.example` (updated in v4 — `CORS_ORIGINS`, `LOG_LEVEL` added):

```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://user:pass@localhost:5432/camso
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info
```

**`FIREBASE_PRIVATE_KEY` gotcha** (new in v4, worth flagging before someone loses an hour to it): the key contains real newlines, but most `.env` parsers can't hold a literal multi-line value cleanly. Store it in `.env` with escaped `\n` sequences, and in `config/firebase.js` do `FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')` before handing it to the Admin SDK's credential config. This bites almost everyone the first time they deploy — flagging it now so it doesn't.

`Dockerfile` base image: `FROM node:24-alpine`.

---

## 11. Logging & audit architecture (revised in v4)

**Logging**: Morgan (HTTP access) + Winston (structured app/error, `LOG_LEVEL`-configurable) + crash handlers in `server.js`.

**Audit — the actual write pattern**: a generic middleware genuinely cannot know a row's before/after state — only the service method that ran the mutation has both values in memory. So:

- `core/middleware/auditContext.js` runs on every `/admin/*` request and attaches `req.auditContext = { actorId, role, ip, userAgent }`. **It does not write to `audit_logs` itself.**
- `core/services/auditService.js` exposes `auditService.record({ actorId, action, entityType, entityId, before, after })`.
- Each module's own `<name>.service.js` calls `auditService.record(...)` explicitly, right after a mutation succeeds — one line, using the `before`/`after` values the service already has on hand. This applies equally to Vishal's and Aary's mutating services; it's not solely Aary's job even though `admin_users` and `audit_logs` sit in her schema file.
- `LOGIN` is the one exception to "audit logs = content mutations": `admin-auth`'s service calls `auditService.record({ action: 'LOGIN', ... })` directly on a successful admin login — worth keeping in the same table since "who logged in, from where" is exactly what this table is for. **Failed** login attempts are **not** written to `audit_logs` (that's Winston's job, as a security-relevant log line) — an audit trail of content changes shouldn't fill up with brute-force noise.

---

## 12. Testing strategy (unchanged, already right-sized per review)

Unit (service logic, repository mocked), integration (routes against Docker Postgres), CI-gated smoke tests (Vishal: full auth flow incl. guest→account; Aary: one admin CRUD cycle + feedback submission), manual Postman pass before every milestone.

---

## 13. Admin CMS & file uploads

Backend Team builds zero UI. Uploads: `multipart/form-data` → `mediaUpload.js` → Firebase Admin SDK → Storage → `media_assets` row. No signed URLs, no client-to-Firebase-direct path.

---

## 14. Firebase — ownership and the analytics contract

| | Owner | What |
|---|---|---|
| FCM | **Aary** | `campaigns`/`notifications` trigger sends, targeting resolved against `user_devices` |
| Storage | Whoever's module uploads | Both via shared `mediaUpload.js` |
| Analytics | Mobile Team's SDK + backend contract | Backend: stable, correlatable IDs on every response; `/admin/analytics/catalogue` + `/admin/analytics/content` as backend-native aggregates. Mobile: actual SDK integration, event instrumentation. |

---

## 15. Cross-team integration (with Avni & Vira, unchanged)

Day 2: endpoint list published. Wed 12 Aug: Postman collection for read-heavy endpoints. From ~17 Aug: paired integration. After 22 Aug: contract freeze.

---

## 16. Timeline — Phase 1 (Launch 1), 7–25 Aug 2026

Milestones: **16 Aug = backend feature-complete** → **17–22 Aug = integration** → **22 Aug = contract freeze** → **25 Aug = submission**.

| Phase | Date | Vishal | Aary |
|---|---|---|---|
| Foundation | Fri 7 Aug (1) | **Both:** ERD lock, repo init, Docker Compose, `schema.prisma`, core middleware incl. `auditContext`/`auditService`, `routes/index.js`, endpoint list, Neon/Render/Firebase accounts | same |
| Foundation | Sat 8 Aug (2) | `catalogue.prisma` + `search.prisma`. Auth scaffolding. Deploy skeleton (`GET /health`, `GET /ready`) to Render + Neon + CI. | `content.prisma` + `engagement.prisma` |
| Foundation | Sun 9 Aug (3) | **Milestone: `/health` + `/ready` live in prod** | |
| Core APIs | Mon 10 Aug (4) | Auth endpoints; categories CRUD incl. `/:id` detail | Documents, testimonials, FAQs read APIs |
| Core APIs | Tue–Wed 11–12 Aug (5–6) | Products list/detail + filters; search + recent/popular | Dealer locator; feedback submit; notifications public feed |
| — | **Milestone: Wed 12 Aug evening** — Postman v1 shared with Team | | |
| Admin & Engagement | Thu–Fri 13–14 Aug (7–8) | `devices` module; bookmarks + guest→account sync (partial indexes applied) | Admin CRUD: documents, testimonials, FAQs (incl. detail views + publish toggles) |
| Admin & Engagement | Sat–Sun 15–16 Aug (9–10) | Polish product/search edge cases; harden deployment | Admin CRUD: dealers, feedback + export; notifications/campaigns incl. `/send`; `admin-users` module; wire FCM |
| — | **Milestone: Sun 16 Aug — backend feature-complete** | | |
| Integration | Mon–Tue 17–18 Aug (11–12) | **Both:** pair with Mobile Team, swap mocks → real | |
| Hardening | Wed–Thu 19–20 Aug (13–14) | **Both:** bug bash, tests | |
| Hardening | Fri 21 Aug (15) | Final prod hardening | Swagger + Postman export + README |
| Hardening | Sat 22 Aug (16) | **Both:** full regression. **Contract freeze from here.** | |
| Submission prep | Sun–Mon 23–24 Aug (17–18) | Buffer, submission package | Buffer, submission package |
| Submission | Tue 25 Aug (19) | **Submit** | |

---

## 17. Timeline — Phase 2 (Launch 2), 26 Aug – 25 Sep 2026 (unchanged)

| Week | Vishal | Aary |
|---|---|---|
| 26 Aug – 1 Sep | Design: distributor role/persona, claims schema, asset-library schema | same, paired |
| 2–8 Sep | Distributor login/roles + persona-guard | Asset library CRUD |
| 9–15 Sep | Claims portal | Training centre |
| 16–22 Sep | Selectors: Product, TKPH *(blocked on CL data)* | Selectors: Pressure Advisor, Reverse Track, Rubber Pad *(same blocker)* |
| 23–25 Sep | **Both:** integration, testing, docs | same |

---

## 18. Open questions / assumptions

1. Selector logic/data — blocked on CL team.
2. Dealer geodata source.
3. Claims file handling / SAP-ERP scope confirmation.
4. Translation content source.
5. Guest bookmark sync merge rule — confirm.
6. Prisma major-version pin discipline.
7. Campaign targeting: confirm 4 target types cover Launch 1 needs, or `SPECIFIC_USERS` is needed.
8. **New**: confirm `DRAFT`/`SENT`-only campaign flow (no scheduler) is acceptable for Launch 1, or whether the SOW actually needs true scheduled push execution — if so, that's a real Phase 2 design item (`node-cron` or a queue), not something to improvise late.

---

## 19. Definition of Done

### Launch 1 (25 Aug)
- [ ] All Section 8 endpoints implemented with exact roles enforced, incl. `GET /:id` detail views
- [ ] Every mutating service method calls `auditService.record()`; `LOGIN` written by `admin-auth` directly; failed logins go to Winston, not `audit_logs`
- [ ] Guest + account auth via JWT only; bookmark sync verified; partial unique indexes applied and tested
- [ ] `user_devices` registration working; FCM push fires via `POST /admin/campaigns/:id/send`, targeting resolved correctly for all 4 target types
- [ ] `users.country_code` populated, `users.device_id` fully removed
- [ ] `documents.is_published` / `dealers.is_active` implemented and filtering public endpoints correctly
- [ ] `admin-users` module live, `SUPER_ADMIN`-only
- [ ] Pagination/sort/error conventions applied consistently
- [ ] `GET /health` + `GET /ready` live since Day 3
- [ ] Swagger live at `/api/docs`, Postman collection exported
- [ ] Unit + integration + smoke tests passing in CI, incl. `npm audit`
- [ ] Team fully integrated, contract frozen since 22 Aug
- [ ] README covers setup, env vars (incl. `FIREBASE_PRIVATE_KEY` newline handling), architecture, Prisma pin, audit pattern, analytics split

### Launch 2 (25 Sep)
- [ ] Distributor login/roles gating content correctly
- [ ] Asset library, training centre, claims portal live
- [ ] Selectors implemented if CL data arrived, documented as pending otherwise
- [ ] Analytics dashboard returning real aggregates
- [ ] Campaign scheduling behavior explicitly resolved (Section 18, item 8) if required

---

## 20. Changelog

### v2 → v3
Node 20→24 LTS · `user_devices` + `refresh_tokens` added · guest identity moved to JWT-only · translation uniqueness constraint · bookmark partial-index requirement identified · campaign targeting defined · CRUD shorthand expanded to exact methods/roles · deployment moved to Day 2–3 · analytics contract defined · Firebase Storage flow simplified · search ranking & dealer-locator approach made explicit · universal pagination · `media_assets.uploaded_by_admin_id` · audit log gained `ip_address`/`user_agent`/action enum · "Team 1/2" replaced with role names · Prisma schema files renamed to domain names.

### v3 → v4
`users.country_code` added (COUNTRY targeting had nowhere to read from) · `users.device_id` removed, `user_devices` is now the sole source of truth · `documents.is_published` and `dealers.is_active` added, with an explicit active/published convention documented · partial-index implementation mechanism specified (custom SQL migration, not a schema-level `@@unique`) · audit architecture corrected (`auditContext` middleware + `auditService.record()` called explicitly by each mutating service, since middleware can't know before/after state) · `LOGIN` audit handling clarified (written directly by `admin-auth`, failures go to Winston) · `admin-users` management module added (`SUPER_ADMIN` only) · `GET /:id` detail views added for every admin CMS resource · feedback export split into its own explicit endpoint · campaign send flow defined (`DRAFT`→`POST .../send`, no scheduler for Launch 1) · refresh-token rotation and reuse-detection behavior specified · cross-domain code rule made explicit (query via your own repository, never import another owner's) · `CORS_ORIGINS`/`LOG_LEVEL` env vars added, `FIREBASE_PRIVATE_KEY` newline handling documented · `GET /ready` added alongside `/health` · CI gained `npm audit`.
