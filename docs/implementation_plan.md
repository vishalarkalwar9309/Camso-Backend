# CAMSO Backend — Repository Assessment & Phase 1–2 Implementation Plan

## Repository Assessment (Read-Only Inspection — 13 Aug 2026)

---

## 1. Repository Structure

There are **two parallel trees** in the workspace. This is the single most important structural issue:

```
CEAT/                          ← workspace root
├── src/                       ← Tree A — root-level src
│   ├── app.js                 (empty)
│   ├── server.js              (empty)
│   ├── config/
│   │   ├── database.js        (empty)
│   │   ├── env.js             (empty)
│   │   └── jwt.js             (empty)
│   ├── core/
│   │   ├── middleware/
│   │   │   ├── authGuard.js   (empty)
│   │   │   ├── errorHandler.js(empty)
│   │   │   ├── notFound.js    (empty)
│   │   │   └── requestLogger.js(empty)
│   │   ├── services/
│   │   │   └── tokenService.js(empty)
│   │   └── utils/
│   │       ├── apiResponse.js (empty)
│   │       └── password.js    (empty)
│   └── modules/
│       ├── auth/              (5 empty files: controller, repository, routes, service, validation)
│       ├── bookmarks/         (5 empty files)
│       ├── categories/        (5 empty files)
│       ├── devices/           (5 empty files)
│       ├── products/          (5 empty files)
│       ├── search/            (5 empty files)
│       └── users/             (5 empty files)
├── prisma/                    ← Root prisma (all empty)
│   ├── schema.prisma          (empty)
│   └── schema/
│       ├── core.prisma        (empty)
│       ├── catalogue.prisma   (empty)
│       └── search.prisma      (empty)
├── tests/
│   ├── integration/auth.test.js  (empty)
│   └── unit/auth.test.js         (empty)
├── package.json               ← Root package.json (no real deps, placeholder only)
├── .env                       (empty)
├── .env.example               (empty)
├── .gitignore                 (empty)
├── Dockerfile                 (empty)
├── docker-compose.yml         (empty)
├── README.md                  (empty)
│
└── camso-backend/             ← Tree B — the ACTUAL intended project root
    ├── package.json           ← Real dependencies installed here ✓
    ├── docker-compose.yml     ← Working Docker config ✓
    ├── prisma/
    │   ├── migrations/        (empty)
    │   └── schema/            (empty)
    ├── src/
    │   ├── config/            (empty)
    │   ├── core/
    │   │   ├── middleware/    (empty)
    │   │   ├── services/      (empty)
    │   │   └── utils/         (empty)
    │   └── modules/           (7 empty module dirs)
    ├── tests/
    │   ├── integration/       (empty)
    │   └── unit/              (empty)
    ├── docs/                  (empty)
    ├── scripts/               (empty)
    └── uploads/               (exists — purpose unclear for a server-side upload flow)
```

---

## 2. Existing Source Files

**Every source file in the entire repo is empty (0 bytes).** The directory skeleton was created but no code was written. This applies to:

- All 5 files in `src/modules/auth/`
- All 5 files in `src/modules/users/`
- All files in all other modules (bookmarks, categories, devices, products, search)
- All core utilities (apiResponse.js, password.js, tokenService.js)
- All middleware (authGuard.js, errorHandler.js, notFound.js, requestLogger.js)
- Both app.js and server.js
- All config files (database.js, env.js, jwt.js)
- Both test files

---

## 3. Existing Prisma Files

**All Prisma schema files are empty.** Specifically:

| File | Status |
|------|--------|
| `CEAT/prisma/schema.prisma` | Empty |
| `CEAT/prisma/schema/core.prisma` | Empty |
| `CEAT/prisma/schema/catalogue.prisma` | Empty |
| `CEAT/prisma/schema/search.prisma` | Empty |
| `camso-backend/prisma/schema/` | Empty directory |
| `camso-backend/prisma/migrations/` | Empty directory |

No schema has been defined. No migrations have been run.

---

## 4. package.json and Dependencies

**Root `CEAT/package.json`** — placeholder only, no dependencies, no useful scripts.

**`camso-backend/package.json`** — this is the real one. Dependencies are installed:

| Category | Package | Version |
|----------|---------|---------|
| Runtime | express | ^5.2.1 |
| ORM | @prisma/client | ^6.19.3 |
| Auth | jsonwebtoken | ^9.0.3 |
| Auth | bcrypt | ^6.0.0 |
| Validation | joi | ^18.2.3 |
| Security | helmet | ^8.3.0 |
| Security | cors | ^2.8.6 |
| Rate limiting | express-rate-limit | ^8.6.2 |
| HTTP logging | morgan | ^1.11.0 |
| Env | dotenv | ^17.4.2 |
| Dev | jest | ^30.4.2 |
| Dev | supertest | ^7.2.2 |
| Dev | nodemon | ^3.1.14 |
| Dev | prisma | ^6.19.3 |

> [!IMPORTANT]
> **Express 5.x is installed, not Express 4.x.** Express 5 is now stable. It has important behavioral differences from Express 4:
> - Async errors in route handlers are now automatically caught (no need for `try/catch` or `asyncHandler` wrappers, though asyncHandler is still fine to use).
> - `res.json()` and similar methods are largely the same.
> - Router mounting works the same.
> This is fine for this project — just need to be consistent and not copy Express 4 patterns that assume uncaught async errors propagate to the next error handler without Express 5's native catching.

**Missing dependencies that must be added to `camso-backend/package.json`:**
- `winston` — the plan references it for structured logging, but it's not installed
- `swagger-jsdoc` and `swagger-ui-express` — for API docs (Phase 12, not blocking)

**Missing scripts in `camso-backend/package.json`:**
- `dev` (nodemon)
- `start`
- `test` (jest)
- `prisma:generate`
- `prisma:migrate`

---

## 5. Existing Configuration

**`camso-backend/docker-compose.yml`** — the only real, non-empty config file:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: camso-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: camso
      POSTGRES_PASSWORD: camso_dev_password
      POSTGRES_DB: camso
    ports:
      - "5432:5432"
    volumes:
      - camso_postgres_data:/var/lib/postgresql/data

volumes:
  camso_postgres_data:
```

This is correct and usable as-is for local development. No production credentials exposed.

**Everything else** (root `.env`, `.env.example`, root `docker-compose.yml`, `Dockerfile`) — all empty.

---

## 6. Existing Docker Configuration

Only `camso-backend/docker-compose.yml` is real. The root-level `Dockerfile` and `docker-compose.yml` are both empty.

---

## 7. Existing Tests

Both `tests/integration/auth.test.js` and `tests/unit/auth.test.js` (in the root `src/` tree) are empty.

The `camso-backend/tests/` directory has `integration/` and `unit/` subdirectories but no files at all.

---

## 8. Missing Backend Components

Everything that requires code is missing. In priority order for Phase 1–3:

**Configuration layer:**
- `camso-backend/src/config/database.js` — Prisma client singleton
- `camso-backend/src/config/env.js` — validated env loading
- `camso-backend/src/config/jwt.js` — JWT config constants
- `camso-backend/src/server.js` — HTTP server with crash handlers
- `camso-backend/src/app.js` — Express app factory

**Prisma schema:**
- `camso-backend/prisma/schema.prisma` — generator + datasource block
- `camso-backend/prisma/schema/core.prisma` — `refresh_tokens` model
- `camso-backend/prisma/schema/catalogue.prisma` — `users`, `user_devices`

**Core utilities:**
- `ApiError.js` — error class hierarchy
- `ApiResponse.js` — standard response shape
- `asyncHandler.js` — async route wrapper (optional with Express 5 but still useful)
- `pagination.js` — shared pagination parsing

**Core middleware:**
- `errorHandler.js`
- `authGuard.js`
- `notFound.js`

**Auth module:**
- `auth.validation.js`
- `auth.repository.js`
- `auth.service.js`
- `auth.controller.js`
- `auth.routes.js`

**Users module:**
- `users.validation.js`
- `users.repository.js`
- `users.service.js`
- `users.controller.js`
- `users.routes.js`

**Core services:**
- `tokenService.js` — refresh token issue/rotate/revoke

**Core utilities:**
- `password.js` — bcrypt hash/compare

**Routes:**
- `src/routes/index.js` — central route aggregator

**Package scripts (missing from `camso-backend/package.json`):**
- `dev`, `start`, `test`, `prisma:generate`, `prisma:migrate`

**Missing files per backend plan but not yet created in `camso-backend/`:**
- `src/config/index.js` (optional re-export barrel)
- `src/routes/index.js`
- `.env.example`
- `.gitignore`
- `Dockerfile`
- `README.md`

---

## 9. Architectural Problems / Inconsistencies

### Critical

1. **Dual-tree confusion — must resolve before any code is written.**  
   There are two competing locations: `CEAT/src/` (root-level empty skeleton) and `CEAT/camso-backend/src/` (the intended project, with `node_modules` and `package.json`).  
   **Decision required: all new code must go into `camso-backend/` only.** The root-level `src/` skeleton appears to have been created by mistake (or as a scratch scaffold that was never developed). The root `package.json` has no dependencies and is not the project.  
   Recommendation: keep the root-level files as-is (they are empty and harmless) but **all implementation work goes into `camso-backend/`**. The `camso-backend/` directory is the actual application root.

2. **`camso-backend/package.json` has no scripts.** Without `dev`, `start`, and `test` scripts, the project can't be run or tested.

3. **`tokenService.js` is placed in `src/core/services/` in the root tree's skeleton, but the backend plan (`CAMSO_Backend_Plan.md`) places it at `src/core/utils/tokenService.js`.** We should follow the plan: `core/utils/tokenService.js`.

4. **`camso-backend/prisma/` has no `schema.prisma` at all.** Without the datasource/generator block, Prisma cannot function. The root-level `prisma/schema.prisma` is also empty, so neither location is usable.

5. **`uploads/` directory exists in `camso-backend/`** — but per the backend plan, all file storage goes through Firebase Storage (server-side upload via Admin SDK), not local disk. This directory is either a mistake or leftover from an earlier scaffolding step. It should be noted and left alone for now (it doesn't cause any harm), but **no local file storage should be implemented**.

### Non-critical

6. **`requestLogger.js` in the root-level skeleton** — the backend plan uses `morgan.js` inside `core/logger/`. This is a naming divergence. We'll follow the plan's `core/logger/` structure.

7. **Backend plan references `winston`** but it is not installed. This needs to be added.

8. **No `.env.example`** exists in `camso-backend/` at all. This is a developer experience gap.

9. **No `.gitignore`** in `camso-backend/`. The `node_modules/` directory would be committed.

10. **Root-level `.gitignore` is empty.** This is a problem if the root is the actual Git repo root.

---

## 10. Things to Correct Before Implementation

| # | Issue | Action |
|---|-------|--------|
| 1 | Decide canonical project root | **`camso-backend/` is the canonical root.** All code goes here. |
| 2 | Missing `package.json` scripts | Add `dev`, `start`, `test`, `prisma:generate`, `prisma:migrate` |
| 3 | `winston` missing | `npm install winston` inside `camso-backend/` |
| 4 | No `.gitignore` | Create `camso-backend/.gitignore` with standard Node.js + Prisma entries |
| 5 | No `.env.example` | Create `camso-backend/.env.example` per the backend plan's spec |
| 6 | No `Dockerfile` | Create `FROM node:24-alpine` Dockerfile in `camso-backend/` |
| 7 | Root-level empty skeleton | Leave as-is (empty, harmless) — do not delete without Aary's awareness |
| 8 | Jest not configured | Add `jest` config to `package.json` for CommonJS modules |

---

## Proposed Phase 1 + Phase 2 Implementation Plan

### Scope of this plan

**Phase 1: Project/configuration foundation**  
**Phase 2: Database foundation (Prisma schema + migrations)**  

Phase 3 (authentication implementation) will be a separate plan after Phase 2 is reviewed and approved.

---

### Phase 1 — Project Foundation

All work in `camso-backend/`.

#### [MODIFY] [`package.json`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/package.json)
- Add scripts: `start`, `dev`, `test`, `prisma:generate`, `prisma:migrate`
- Add `jest` configuration block (CommonJS, test match pattern, timeout)
- Add `"main": "src/server.js"`
- Install `winston` as a runtime dependency

#### [NEW] [`.gitignore`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/.gitignore)
Standard Node.js + Prisma entries: `node_modules/`, `.env`, `dist/`, `coverage/`, `prisma/migrations/*.sql` (no — migrations should be committed), `uploads/`.

#### [NEW] [`.env.example`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/.env.example)
Per the backend plan (Section 10), plus `BCRYPT_ROUNDS`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`.

#### [NEW] [`Dockerfile`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/Dockerfile)
`FROM node:24-alpine`, multi-stage is optional for now.

#### [NEW] [`src/app.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/app.js)
Express app factory: helmet, cors, json body parsing, morgan, rate limiter, route mounting, 404 handler, error handler.

#### [NEW] [`src/server.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/server.js)
HTTP server start, `uncaughtException` and `unhandledRejection` crash handlers, Prisma disconnect on shutdown.

#### [NEW] [`src/config/env.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/config/env.js)
Validated environment loading with fail-fast on missing required vars. Never exports secrets that shouldn't be logged.

#### [NEW] [`src/config/database.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/config/database.js)
Prisma client singleton — one instance, exported. Only layer that other code imports from.

#### [NEW] [`src/config/jwt.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/config/jwt.js)
JWT config constants (access secret, refresh secret, expiry durations). No logic.

#### [NEW] [`src/core/logger/winston.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/logger/winston.js)
Winston logger with console + file transports, structured JSON in production.

#### [NEW] [`src/core/logger/morgan.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/logger/morgan.js)
Morgan HTTP logger wired to the Winston stream.

#### [NEW] [`src/core/utils/ApiError.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/utils/ApiError.js)
`ApiError` class + factory methods: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `internal`.

#### [NEW] [`src/core/utils/ApiResponse.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/utils/ApiResponse.js)
Standard response helpers: `success(res, data, statusCode, meta)` and `error(res, apiError)`.

#### [NEW] [`src/core/utils/asyncHandler.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/utils/asyncHandler.js)
Wraps async route handlers. Even with Express 5, this is a useful explicit pattern.

#### [NEW] [`src/core/utils/pagination.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/utils/pagination.js)
Parse `page`, `pageSize` (max 100), `sort` from query params. Build Prisma `skip`/`take`/`orderBy`.

#### [NEW] [`src/core/middleware/errorHandler.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/middleware/errorHandler.js)
Central 4-argument error middleware. Maps `ApiError` types to HTTP status codes. Masks internal details in production.

#### [NEW] [`src/core/middleware/notFound.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/middleware/notFound.js)
404 handler for unmatched routes.

#### [NEW] [`src/routes/index.js`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/routes/index.js)
Central route aggregator. Mounts `/auth`, `/users` (Phase 3+), `/health`.

#### [NEW] `GET /health` endpoint
Simple liveness check returning `{ status: "ok", timestamp }`. Should be live on day 1.

---

### Phase 2 — Database Foundation (Prisma Schema + Migration)

> [!IMPORTANT]
> Prisma multi-file schema requires a specific configuration. The `schema.prisma` root file must use `prismaSchemaFolder` preview feature pointing to the `schema/` directory. Alternatively (and more simply), since the backend plan uses multi-file, we'll use `--schema=./prisma` which treats the entire `prisma/` directory as the schema root in Prisma 6.x with `prismaSchemaFolder`. We need to verify the exact Prisma 6.x syntax for this — do not assume it matches v5.

#### [NEW] [`prisma/schema.prisma`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/prisma/schema.prisma)
Generator + datasource block only. No models. Enables `prismaSchemaFolder` if multi-file is used, or we use a single-file approach for Phase 2 (auth scope only) and migrate to multi-file when Aary's schemas are added.

**Assumption (pending confirmation):** We will use a **single `schema.prisma` file** for Phase 2 (auth models only) to avoid complexity with multi-file setup until both developers are ready. Multi-file will be introduced when Aary begins her schemas, per the migration workflow described in the backend plan.

#### [NEW] [`prisma/schema.prisma`](file:///c:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/prisma/schema.prisma) — Auth models

Models to define in Phase 2 (auth scope only):

**`users` model:**
```
id              String    @id @default(cuid())
email           String?   @unique
phone           String?   @unique
password_hash   String?
display_name    String?
business_type   BusinessType?
preferred_language String  @default("en")
is_guest        Boolean   @default(false)
created_at      DateTime  @default(now())
updated_at      DateTime  @updatedAt

refresh_tokens  RefreshToken[]
```

**`user_devices` model:**
```
id              String    @id @default(cuid())
user_id         String?
user            User?     @relation(...)
device_id       String    @unique
fcm_token       String?
platform        Platform
app_version     String?
is_active       Boolean   @default(true)
last_seen_at    DateTime  @default(now())
created_at      DateTime  @default(now())
updated_at      DateTime  @updatedAt
```

**`refresh_tokens` model:**
```
id              String    @id @default(cuid())
user_id         String?
user            User?     @relation(...)
token_hash      String    @unique
expires_at      DateTime
revoked_at      DateTime?
device_id       String?
created_at      DateTime  @default(now())
```

**Enums:**
```
enum BusinessType { DEALER DISTRIBUTOR OEM EMPLOYEE OTHER }
enum Platform     { ANDROID IOS }
```

**Key constraints and indexes:**
- `users`: `@@index([email])`, `@@index([phone])`
- `refresh_tokens`: `@@index([user_id])`, `@@index([expires_at])`
- `user_devices`: `@@index([user_id])`, `@@index([device_id])`

> [!NOTE]
> The `refresh_tokens` table in the backend plan has a dual nullable FK (`user_id` OR `admin_user_id`) with a check constraint. For Phase 2, we only add `user_id` FK. The `admin_user_id` column and check constraint will be added when Aary implements admin auth — this avoids a dependency on `admin_users` which doesn't exist yet.

---

### Migration plan

```bash
# Inside camso-backend/
docker compose up -d         # Start local Postgres
npm run prisma:migrate        # Creates first migration
npm run prisma:generate       # Generates Prisma client
npm run dev                   # Server should start
```

First migration name: `init_auth_foundation`

---

### Verification plan

After Phase 1:
1. `npm run dev` starts without errors
2. `GET /health` returns `200 { status: "ok" }`
3. `GET /nonexistent` returns `404` with correct error shape
4. No environment variables are logged in plaintext

After Phase 2:
1. `npm run prisma:migrate` runs without errors
2. Migration SQL is reviewed manually to confirm indexes and constraints
3. `npm run prisma:generate` succeeds
4. Prisma Studio (`npx prisma studio`) shows the three tables with correct columns

---

## Open Questions

1. **Canonical project root**: Should `camso-backend/` be the Git repo root, or should the CEAT root remain the Git root with `camso-backend/` as a subdirectory? **This affects where `.gitignore`, `Dockerfile`, etc. live.** My recommendation: treat `camso-backend/` as the project root for all backend files. I will NOT restructure the directory unless you confirm this.

2. **Multi-file schema now or later?** The backend plan calls for multi-file Prisma. For Phase 2 (auth only), a single-file schema is simpler and avoids potential Prisma 6.x configuration edge cases. Multi-file can be introduced when Aary starts her schemas. **Safe assumption: single file for Phase 2, split to multi-file in Phase 3/4 when needed.**

3. **`uploads/` directory in `camso-backend/`**: Should this be removed? It conflicts with the server-side Firebase Storage upload model. Safe assumption: leave it, don't use it.

4. **Root-level empty skeleton (`CEAT/src/`)**: Should this be removed or does Aary have plans for it? Safe assumption: ignore it, implement only in `camso-backend/`.

5. **`users.email` and `users.phone` — are both optional?** The plan says `password_hash` is nullable (guest users have no password), and the guest flow creates users without email/phone. This implies both can be null, but at least one of `{ email, phone, device_id }` must identify the user. **Assumption: both nullable individually, but a CHECK constraint or application-layer rule ensures guest users have a `device_id` linkage via `user_devices`.**
