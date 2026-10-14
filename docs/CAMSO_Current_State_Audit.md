# CAMSO Backend — Current State Audit Report
**Execution Date:** 14 October 2026  
**Auditor:** Antigravity AI Engineering Assistant (Pair-Programming with Vishal Arkalwar)  
**Primary Subject Repositories:**
1. Vishal's Active Working Copy: `C:\Users\visha\OneDrive\Desktop\CEAT\camso-backend`
2. Aary's Separate Working Copy: `C:\Users\visha\OneDrive\Desktop\CEAT\Camso-Backend-day10-admin-crud`
**Contractual Benchmark:** `CAMSO SOW_260821_105506.pdf` (CEAT Specialty Tyres Ltd. & VIT Pune)

---

## A. Workspace & Repository Identity

### 1. Vishal's Active Backend: `camso-backend`
- **Absolute Path:** `C:\Users\visha\OneDrive\Desktop\CEAT\camso-backend`
- **Git Status:** Valid Git repository (`.git` directory present).
- **Branch & HEAD Commit:**
  - Active Branch: `work/vishal-backend`
  - Tracking Remote: `origin` (`https://github.com/vishalarkalwar9309/Camso-Backend.git`)
  - HEAD Commit: `92f9b9a075a0926fc23ce0c7938d4107e231ad30` (`chore: initialize CAMSO backend`, dated 4 Sep 2026).
- **Working Tree Status:**
  - **Modified Tracked Files (13):**
    - `package.json`, `package-lock.json`
    - `prisma/schema.prisma`
    - `src/app.js`, `src/routes/index.js`
    - `src/core/utils/ApiError.js`, `src/core/utils/tokenService.js`
    - `src/modules/auth/auth.controller.js`, `auth.repository.js`, `auth.routes.js`, `auth.service.js`, `auth.validation.js`
    - `tests/integration/auth.test.js`
  - **Untracked Files & Folders (39):**
    - Documentation: `PRD.md`, `docs/Backend_Comparison_and_Required_Changes.md`, `docs/Vishal_Backend_Work_Plan.md`
    - Database: `prisma/migrations/` (5 migrations), `prisma/seed.js`
    - Middleware: `src/core/middleware/adminGuard.js`, `businessGuard.js`, `requireBusinessRole.js`, `requireRole.js`
    - Core services: `src/core/services/` (`auditService.js`, `readinessService.js`)
    - Dataconnect integration: `src/dataconnect-generated/`
    - Implemented Modules: `src/modules/admin-auth/`, `admin-users/`, `analytics/`, `bookmarks/`, `business/`, `business-auth/`, `categories/`, `content/`, `devices/`, `languages/`, `products/`, `search/`
    - Test Suites: 4 integration suites, 21 unit test suites
- **Key Artifact Paths:**
  - Schema: [schema.prisma](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/prisma/schema.prisma) (`C:\Users\visha\OneDrive\Desktop\CEAT\camso-backend\prisma\schema.prisma`)
  - Migrations Directory: `camso-backend/prisma/migrations/` (5 migrations)
  - Seed Script: [seed.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/prisma/seed.js) (`C:\Users\visha\OneDrive\Desktop\CEAT\camso-backend\prisma\seed.js`)
  - Server Entry Points: [server.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/server.js), [app.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/app.js), [index.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/routes/index.js)
- **Environment Variable Configuration Status:**
  - File checked: `.env` (present, 1787 bytes)
  - `NODE_ENV`: configured (`development`)
  - `PORT`: configured (`4000`)
  - `DATABASE_URL`: configured (PostgreSQL string pointing to `localhost:5432/camso`)
  - `JWT_ACCESS_SECRET`: configured
  - `JWT_REFRESH_SECRET`: configured
  - `JWT_ACCESS_EXPIRES_IN`: configured (`15m`)
  - `JWT_REFRESH_EXPIRES_IN`: configured (`30d`)
  - `BCRYPT_ROUNDS`: configured (`12`)
  - `RATE_LIMIT_WINDOW_MS`: configured (`900000`)
  - `RATE_LIMIT_MAX`: configured (`100`)
  - `FIREBASE_*`: **UNCONFIGURED / MISSING** (not present in `.env`, marked pending credentials from CEAT)

---

### 2. Aary's Working Copy: `Camso-Backend-day10-admin-crud`
- **Absolute Path:** `C:\Users\visha\OneDrive\Desktop\CEAT\Camso-Backend-day10-admin-crud`
- **Git Status:** **NOT a standalone Git repository** (no `.git` directory present locally).
  - Folder timestamps indicate creation on 13 October 2026 at 23:40.
  - Corresponds exactly to the remote branch `origin/day10-admin-crud` in `https://github.com/vishalarkalwar9309/Camso-Backend.git`.
  - Upstream Commit: `260232cbf40c3f594ede38b47145ba43d10cf10b` (`day 10 done and push`, committed by Aary Tadwalkar on 13 Oct 2026).
- **Working Tree Status:** Standalone directory containing 5 subdirectories and 7 root files.
  - Local `node_modules` directory: **NOT INSTALLED / FALSE**
  - Local `.env` file: **MISSING** (only `.env.example` exists)
- **Key Artifact Paths:**
  - Multi-file Schema Directory: `Camso-Backend-day10-admin-crud/prisma/schema/` (`catalogue.prisma`, `content.prisma`, `core.prisma`, `engagement.prisma`, `schema.prisma`, `search.prisma`)
  - Migrations: `Camso-Backend-day10-admin-crud/prisma/migrations/20260811070231_init/` (1 monolithic migration)
  - Seed Script: **NONE**
  - Server Entry Points: [server.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/server.js), [app.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/app.js), [index.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/routes/index.js)
  - Swagger Documentation Config: [swagger.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/config/swagger.js)
- **Environment Variable Configuration Status:**
  - `.env` file: **DOES NOT EXIST**
  - `.env.example` defines keys: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_DAYS`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `CORS_ORIGINS`, `LOG_LEVEL`.

---

### 3. Repository Relationship & Structural Comparison

| Feature / Dimension | Vishal's Backend (`camso-backend`) | Aary's Backend (`Camso-Backend-day10-admin-crud`) | Compatibility & Integration Risk |
|---|---|---|---|
| **Git Repository** | Active Git repo on branch `work/vishal-backend` | Unversioned working directory matching `origin/day10-admin-crud` | Branches share common ancestor `92f9b9a` but have diverged by thousands of lines. |
| **Framework Version** | `express: ^5.2.1` | `express: ^4.19.2` | Major Express version divergence (Express 5 vs Express 4 middleware/routing handling). |
| **Primary Key Convention** | `String @id @default(cuid())` across ALL tables | `Int @id @default(autoincrement())` across ALL tables | **CRITICAL BLOCKER**: String CUID vs Int Autoincrement breaks foreign keys and controller validations. |
| **Prisma Schema Architecture** | Single consolidated [schema.prisma](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/prisma/schema.prisma) (18 models) | Multi-file schema in `prisma/schema/*.prisma` (24 models) | Merge conflict if schema files are blindly copied. |
| **Migrations** | 5 sequential, incremental migrations | 1 monolithic initial migration (`20260811070231_init`) | Databases cannot sync without a unified migration baseline. |
| **Route Registration** | Explicit routing in [src/routes/index.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/routes/index.js) (`router.use('/path', ...)`) | Dynamic directory scanning convention (`autoMountModules`) in [src/routes/index.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/routes/index.js) | Architectural difference; exports different objects (`router` vs `{ createRouter }`). |
| **Application Factory** | Exports `app` directly (`module.exports = app`) | Exports `{ createApp }` factory | Test suites and integration harnesses instantiate Express differently. |
| **Installed Dependencies** | `node_modules` present, dependencies verified | `node_modules` **MISSING** | Aary's backend cannot be executed without `npm install`. |

---

## B. Feature-by-Feature Implementation Inventory

Each feature is evaluated across both backends with one of five authoritative statuses:
- **VERIFIED**: Source code exists, non-destructive test execution captured and passed.
- **IMPLEMENTED, NOT VERIFIED**: Source code exists, but meaningful test execution evidence is missing.
- **PARTIAL**: Substantial code exists, but critical operations, sub-endpoints, or contracts are incomplete.
- **NOT FOUND**: No code found in relevant directories.
- **BLOCKED**: Verification cannot run due to missing environment, dependencies (`node_modules`), database, or credentials.

---

### 1. Project Setup, Application Entry Point & Health Endpoints
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:** [src/server.js:L1-L67](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/server.js#L1-L67), [src/app.js:L1-L100](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/app.js#L1-L100), [src/routes/index.js:L18-L39](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/routes/index.js#L18-L39).
  - **Endpoints:** `GET /health` (root liveness), `GET /ready` (root readiness), `GET /api/v1/health` (API liveness), `GET /api/v1/ready` (API readiness).
  - **Test Evidence:**
    - Test Suite: [tests/unit/readiness.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/readiness.test.js) (6 unit tests PASSED).
    - Integration Suite: [tests/integration/readiness_config.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/integration/readiness_config.test.js) (4 passed, 6 skipped due to DB gate).
    - Executed Command: `npm run test:unit` -> 228 tests passed.
  - **Limitations:** Database readiness returns 503 as expected when PostgreSQL service is offline.
  - **Duplication/Conflict:** Aary also defines `/health` and `/ready`, but wraps DB + Firebase checks inside [src/routes/index.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/routes/index.js#L117-L163).
- **Aary's Backend:**
  - **Status:** **IMPLEMENTED, NOT VERIFIED (BLOCKED runtime)**
  - **Code Evidence:** [src/server.js:L1-L164](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/server.js#L1-L164), [src/app.js:L1-L146](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/app.js#L1-L146), [src/routes/index.js:L117-L162](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/routes/index.js#L117-L162).
  - **Endpoints:** `GET /api/v1/health`, `GET /api/v1/ready`, `GET /api/docs` (Swagger UI).
  - **Blocker:** Cannot run tests or start server because `node_modules` is not installed and `.env` is missing.

---

### 2. Database Schema, Migrations, Seeds & Connectivity
- **Vishal's Backend:**
  - **Status:** **PARTIAL (Schema Verified, Database Offline)**
  - **Code Evidence:**
    - Schema: [prisma/schema.prisma](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/prisma/schema.prisma) — 18 models: `User`, `RefreshToken`, `UserDevice`, `Category`, `Product`, `ProductImage`, `ProductSpecification`, `Language`, `AppContent`, `SearchLog`, `PopularSearch`, `Bookmark`, `AdminUser`, `AdminRefreshToken`, `AuditLog`, `BusinessOrganization`, `BusinessUser`, `BusinessRefreshToken`.
    - Migrations: `prisma/migrations/` (5 migrations applied).
    - Seed Script: [prisma/seed.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/prisma/seed.js) (Seeds categories, products, specifications, languages, admin users, business orgs).
  - **Validation Evidence:** Executed `npx prisma validate` -> Exited 0: "The schema at prisma\schema.prisma is valid 🚀".
  - **Limitations:** PostgreSQL daemon on `localhost:5432` is not running. Integration tests requiring live database are guarded and skipped.
- **Aary's Backend:**
  - **Status:** **BLOCKED / NOT VERIFIED**
  - **Code Evidence:** `prisma/schema/` with 24 models across 6 `.prisma` files. Monolithic migration [20260811070231_init/migration.sql](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/prisma/migrations/20260811070231_init/migration.sql).
  - **Blocker:** Running `npx prisma validate` attempts to install external `prisma@8.0.0-rc` over network because local `node_modules` is absent.

---

### 3. Authentication: Customer, Admin & Business (Register / Login / Refresh / Logout)
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:**
    - Customer User Auth: [src/modules/auth/auth.routes.js:L1-L36](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/auth/auth.routes.js#L1-L36), [auth.controller.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/auth/auth.controller.js), [auth.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/auth/auth.service.js).
      - `POST /api/v1/auth/guest`
      - `POST /api/v1/auth/register`
      - `POST /api/v1/auth/login`
      - `POST /api/v1/auth/refresh`
      - `POST /api/v1/auth/logout`
    - Admin Auth: [src/modules/admin-auth/admin-auth.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/admin-auth/admin-auth.routes.js), [admin-auth.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/admin-auth/admin-auth.service.js).
      - `POST /api/v1/admin-auth/login`
      - `POST /api/v1/admin-auth/refresh`
      - `POST /api/v1/admin-auth/logout`
    - Business Auth: [src/modules/business-auth/business-auth.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/business-auth/business-auth.routes.js), [business-auth.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/business-auth/business-auth.service.js).
      - `POST /api/v1/business-auth/register`, `/login`, `/refresh`, `/logout`
  - **Test Evidence:**
    - [tests/unit/auth.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/auth.service.test.js) (PASSED)
    - [tests/unit/admin-auth.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/admin-auth.service.test.js) (PASSED)
    - [tests/unit/business-auth.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/business-auth.service.test.js) (PASSED)
    - [tests/unit/tokenService.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/tokenService.test.js) (PASSED)
    - [tests/unit/password.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/password.test.js) (PASSED)
- **Aary's Backend:**
  - **Status:** **PARTIAL / NOT FOUND**
  - **Code Evidence:** [src/modules/auth/refreshToken.repository.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/auth/refreshToken.repository.js).
  - **Missing Behaviours:** No customer user routes (`/auth/register`, `/auth/login`, `/auth/guest`). No admin login route (`POST /admin/auth/login`). Aary's backend lacks an authentication controller, route file, and validation schemas.

---

### 4. User Profile & Role / Permission Handling
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:**
    - Profile: [src/modules/users/users.routes.js:L1-L26](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/users/users.routes.js#L1-L26) (`GET /api/v1/users/me`, `PATCH /api/v1/users/me`).
    - Roles/Guards: [src/core/middleware/authGuard.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/middleware/authGuard.js), [adminGuard.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/middleware/adminGuard.js), [requireRole.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/middleware/requireRole.js), [businessGuard.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/middleware/businessGuard.js), [requireBusinessRole.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/core/middleware/requireBusinessRole.js).
  - **Test Evidence:** [tests/unit/users.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/users.service.test.js) (PASSED), [tests/unit/adminGuard.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/adminGuard.test.js) (PASSED), [tests/unit/businessGuard.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/businessGuard.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **PARTIAL (Admin Users Only, Customer Profile Missing)**
  - **Code Evidence:** [src/modules/admin-users/admin-users.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/admin-users/admin-users.admin.routes.js#L1-L40), [admin-users.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/admin-users/admin-users.service.js).
    - `GET /api/v1/admin/admin-users`, `POST /api/v1/admin/admin-users`, `PATCH /api/v1/admin/admin-users/:id`.
    - Role guards: [src/core/middleware/adminGuard.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/core/middleware/adminGuard.js), [requireRole.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/core/middleware/requireRole.js).
  - **Missing Behaviours:** No customer user profile routes (`/users/me`).

---

### 5. Device Registration & Ownership Checks
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:** [src/modules/devices/devices.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/devices/devices.routes.js), [devices.controller.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/devices/devices.controller.js), [devices.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/devices/devices.service.js).
    - `POST /api/v1/devices`: register/upsert device (`device_id`, `platform`, `fcm_token`, `app_version`, `model`).
    - `GET /api/v1/devices`: list user's registered devices.
    - `DELETE /api/v1/devices/:id`: soft-deactivate (`is_active = false`) with strict resource-ownership validation (user cannot delete another user's device).
  - **Test Evidence:** [tests/unit/devices.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/devices.service.test.js) (PASSED), [tests/unit/devices.validation.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/devices.validation.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **NOT FOUND**
  - **Findings:** No `devices` module exists in `src/modules/`. `UserDevice` table is only queried as an audience table in [campaigns.repository.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/campaigns/campaigns.repository.js).

---

### 6. Categories & Product Catalogue
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:**
    - Public: [src/modules/categories/categories.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/categories/categories.routes.js) (`GET /api/v1/categories`, `GET /:id`, `GET /:id/products`, `GET /:id/filters`).
    - Admin: [src/modules/categories/categories.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/categories/categories.admin.routes.js) (`GET /api/v1/admin/categories`, `GET /:id`, `POST /`, `PATCH /:id`).
    - Service: [src/modules/categories/categories.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/categories/categories.service.js) (hierarchical tree construction, audit logging on mutations).
  - **Test Evidence:** [tests/unit/categories.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/categories.service.test.js) (PASSED), [tests/unit/categories.validation.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/categories.validation.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **NOT FOUND**
  - **Findings:** `Category` model exists in `prisma/schema/catalogue.prisma`, but no routes, controller, or service exist in `src/modules/`.

---

### 7. Product Specifications & Image Metadata
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:**
    - Public: [src/modules/products/products.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/products/products.routes.js) (`GET /api/v1/products`, `GET /:idOrSlug`).
    - Admin: [src/modules/products/products.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/products/products.admin.routes.js) (`GET /api/v1/admin/products`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/images`).
    - Service: [src/modules/products/products.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/products/products.service.js) (dynamic attribute filtering, spec association, image attachment).
  - **Test Evidence:** [tests/unit/products.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/products.service.test.js) (PASSED), [tests/unit/products.validation.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/products.validation.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **NOT FOUND**
  - **Findings:** No `products` module in `src/modules/`.

---

### 8. Search, Filtering & Multi-Tier Ranking
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:** [src/modules/search/search.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/search/search.routes.js), [search.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/search/search.service.js).
    - `GET /api/v1/search`: 6-tier search priority (Exact PID -> Exact Name -> Name Prefix -> Category -> Specification Value -> Partial Name/Description).
    - `GET /api/v1/search/recent`: user search history from `SearchLog`.
    - `GET /api/v1/search/popular`: aggregated queries from `PopularSearch`.
  - **Test Evidence:** [tests/unit/search.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/search.service.test.js) (PASSED), [tests/unit/search.validation.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/search.validation.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **NOT FOUND**
  - **Findings:** `SearchLog` and `PopularSearch` models exist in `prisma/schema/search.prisma`, but no search service or endpoints exist in `src/modules/`.

---

### 9. Bookmarks / Favourites (with Guest-to-Account Sync)
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:** [src/modules/bookmarks/bookmarks.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/bookmarks/bookmarks.routes.js), [bookmarks.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/bookmarks/bookmarks.service.js).
    - `GET /api/v1/bookmarks`: retrieve paginated user or device bookmarks.
    - `POST /api/v1/bookmarks`: add bookmark (handles 409 conflict).
    - `DELETE /api/v1/bookmarks/:id`: remove bookmark with ownership check.
    - `POST /api/v1/bookmarks/sync`: merges guest device bookmarks into authenticated user account upon login.
  - **Test Evidence:** [tests/unit/bookmarks.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/bookmarks.service.test.js) (PASSED), [tests/unit/bookmarks.validation.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/bookmarks.validation.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **NOT FOUND**
  - **Findings:** `Bookmark` model defined in `prisma/schema/search.prisma`, but no controller or endpoints implemented.

---

### 10. Language Selection, Localized Content & Translations
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:** [src/modules/languages/languages.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/languages/languages.routes.js), [languages.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/languages/languages.service.js).
    - `GET /api/v1/languages` (active languages: `en`, `fr`, `de`, `it`).
    - `GET /api/v1/admin/languages`, `POST /api/v1/admin/languages`, `PATCH /api/v1/admin/languages/:code`.
  - **Test Evidence:** [tests/unit/languages.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/languages.service.test.js) (PASSED), [tests/unit/languages.validation.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/languages.validation.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **IMPLEMENTED, NOT VERIFIED (Core Utility Level)**
  - **Code Evidence:** [src/core/utils/translate.js:L1-L147](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/core/utils/translate.js#L1-L147), [src/core/repositories/translation.repository.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/core/repositories/translation.repository.js).
    - Polymorphic `Translation` table (`entity_type`, `entity_id` [Int], `field`, `language_code`, `value`).
    - Resolves localized fields across documents, testimonials, FAQs, and notifications.
  - **Conflict:** Aary's `Translation` table uses `entity_id Int`, which cannot reference Vishal's CUID strings (`entity_id String`).

---

### 11. App Settings, About, Contact & Legal Content
- **Vishal's Backend:**
  - **Status:** **VERIFIED**
  - **Code Evidence:** [src/modules/content/content.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/content/content.routes.js), [content.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/content/content.service.js).
    - `GET /api/v1/content/:key` (supports `about`, `contact`, `legal`, `settings`).
    - `GET /api/v1/content` (list all active).
    - `GET /api/v1/admin/content/:key`, `PUT /api/v1/admin/content/:key` (audit logged).
  - **Test Evidence:** [tests/unit/content.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/content.service.test.js) (PASSED), [tests/unit/content.validation.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/content.validation.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **PARTIAL (Schema Defined, Dedicated Module Missing)**
  - **Findings:** `AppContent` table is defined in `prisma/schema/content.prisma`, but no dedicated `app-content` module directory exists in `src/modules/`.

---

### 12. Admin/CMS APIs vs Frontend UI Dashboard
- **Backend Admin APIs (Both Backends):**
  - **Vishal's Backend:**
    - Admin Categories: `GET /api/v1/admin/categories`, `POST`, `PATCH /:id`
    - Admin Products: `GET /api/v1/admin/products`, `POST`, `PATCH /:id`, `POST /:id/images`
    - Admin Languages: `GET /api/v1/admin/languages`, `POST`, `PATCH /:code`
    - Admin Content/Settings: `GET /api/v1/admin/content/:key`, `PUT /:key`
    - Admin Users & Organizations: `GET /api/v1/admin/admin-users`, `POST`, `PATCH /:id`, `GET /api/v1/admin/organizations`, `PATCH /:id/approval`
    - Admin Analytics: `GET /api/v1/admin/analytics/catalogue`
  - **Aary's Backend:**
    - Admin Users: `GET /api/v1/admin/admin-users`, `POST`, `PATCH /:id`
    - Admin Documents: `GET /api/v1/admin/documents`, `POST`, `PATCH /:id`, `POST /:id/files`
    - Admin Testimonials: `GET /api/v1/admin/testimonials`, `POST`, `PATCH /:id`
    - Admin FAQs: `GET /api/v1/admin/faqs`, `POST`, `PATCH /:id`
    - Admin Dealers: `GET /api/v1/admin/dealers`, `POST`, `PATCH /:id`
    - Admin Feedback & CSV Export: `GET /api/v1/admin/feedback`, `GET /api/v1/admin/feedback/export?format=csv`
    - Admin Notifications & Campaigns: `GET /api/v1/admin/notifications`, `POST`, `PATCH`, `POST /api/v1/admin/campaigns/:id/send`
- **Frontend UI Dashboard (Web/App UI):**
  - **Status in BOTH Backends:** **NOT FOUND**
  - **Factual Evidence:** Inspection of both codebases confirms that **ZERO** frontend web UI files (`.html`, `.jsx`, `.tsx`, `.vue`, React, Vue, or Angular) exist.
  - **Context from Plan:** Master Plan V4 (`CAMSO_Backend_PlanV4.md` line 33) states: *"Backend Team builds APIs only, no UI. Mobile Team owns all frontend (Flutter consumer + admin views)."*
  - **Swagger UI:** Aary's backend provides interactive API documentation at `/api/docs` via `swagger-ui-express`, but this is an API explorer, not an administrative CMS dashboard.

---

### 13. Documents / Support Library & File Access
- **Vishal's Backend:**
  - **Status:** **NOT FOUND**
  - **Findings:** No `documents` module or `Document` model in Vishal's backend.
- **Aary's Backend:**
  - **Status:** **IMPLEMENTED, NOT VERIFIED (BLOCKED runtime)**
  - **Code Evidence:** [src/modules/documents/documents.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/documents/documents.routes.js), [documents.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/documents/documents.admin.routes.js), [documents.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/documents/documents.service.js), [documents.repository.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/documents/documents.repository.js).
    - Public: `GET /api/v1/documents` (filters: `product_id`, `category_id`, `document_type`, `lang`), `GET /:id`.
    - Admin: `GET /api/v1/admin/documents`, `GET /:id`, `POST /`, `PATCH /:id` (toggle `is_published`), `POST /:id/files` (multipart upload via Multer -> `mediaUpload.js`).
  - **Test File Evidence:** `tests/integration/adminCms.test.js`, `tests/integration/publicContent.test.js` (unexecuted).
  - **Conflict:** Foreign keys `product_id` and `category_id` are defined as `Int` in Aary's repository, but point to `String` CUIDs in Vishal's database.

---

### 14. FAQs & Testimonials
- **Vishal's Backend:**
  - **Status:** **NOT FOUND**
  - **Findings:** Neither FAQs nor Testimonials are implemented in `camso-backend`.
- **Aary's Backend:**
  - **Status:** **IMPLEMENTED, NOT VERIFIED (BLOCKED runtime)**
  - **Code Evidence:**
    - Testimonials: [src/modules/testimonials/testimonials.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/testimonials/testimonials.routes.js), [testimonials.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/testimonials/testimonials.admin.routes.js), [testimonials.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/testimonials/testimonials.service.js).
      - `GET /api/v1/testimonials` (`?product=&type=`).
      - Admin CRUD: `GET /api/v1/admin/testimonials`, `POST`, `PATCH /:id`.
    - FAQs: [src/modules/faqs/faqs.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/faqs/faqs.routes.js), [faqs.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/faqs/faqs.admin.routes.js), [faqs.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/faqs/faqs.service.js).
      - `GET /api/v1/faqs` (`?category=&product=`).
      - Admin CRUD: `GET /api/v1/admin/faqs`, `POST`, `PATCH /:id`.
  - **Test File Evidence:** `tests/integration/adminCms.test.js`, `tests/integration/publicContent.test.js`.

---

### 15. Dealer / Distributor Features
- **Vishal's Backend:**
  - **Status:** **VERIFIED (Launch 2 Foundation)**
  - **Code Evidence:** [src/modules/business-auth/](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/business-auth), [src/modules/business/business.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/business/business.routes.js).
    - Models: `BusinessOrganization`, `BusinessUser`, `BusinessRefreshToken`.
    - Routes:
      - `POST /api/v1/business-auth/register` (dealer/distributor registration).
      - `POST /api/v1/business-auth/login`, `refresh`, `logout`.
      - `GET /api/v1/business/organization` (data-isolated organization profile).
      - `GET /api/v1/business/dealer/portal` (strictly DEALER role).
      - `GET /api/v1/business/distributor/portal` (strictly DISTRIBUTOR role).
      - `GET /api/v1/admin/organizations`, `PATCH /:id/approval` (admin approves business accounts).
  - **Test Evidence:** [tests/unit/business-auth.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/business-auth.service.test.js) (PASSED), [tests/unit/businessGuard.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/businessGuard.test.js) (PASSED).
  - **Missing Behaviours:** Public dealer locator map search.
- **Aary's Backend:**
  - **Status:** **IMPLEMENTED, NOT VERIFIED (Public Locator & Admin Listing)**
  - **Code Evidence:** [src/modules/dealers/dealers.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/dealers/dealers.routes.js), [dealers.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/dealers/dealers.admin.routes.js), [dealers.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/dealers/dealers.service.js).
    - `GET /api/v1/dealers/locator`: Proximity dealer search using SQL Haversine formula (`lat`, `lng`, `radiusKm`, `type`).
    - `GET /api/v1/dealers/csr-contact`: Regional CSR contact by country.
    - Admin CRUD: `GET /api/v1/admin/dealers`, `POST`, `PATCH /:id` (toggle `is_active`).
  - **Complementary Synergy:** Vishal built the authenticated business/distributor portal and authorization layer; Aary built the public dealer locator and operational directory.

---

### 16. Voice / Image Search
- **Status in BOTH Backends:** **NOT FOUND / DEFERRED**
- **Evidence:** SOW Page 1 Section 2 item 6 and Page 2 Section 3 item 9 describe "voice/image search" under Advanced Features (Month 3 / Week 9–10). Neither backend contains speech-to-text, computer vision, or multimodal search endpoints.

---

### 17. Analytics
- **Vishal's Backend:**
  - **Status:** **VERIFIED (Catalogue Analytics)**
  - **Code Evidence:** [src/modules/analytics/analytics.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/analytics/analytics.admin.routes.js), [analytics.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/src/modules/analytics/analytics.service.js).
    - `GET /api/v1/admin/analytics/catalogue`: Aggregates top 10 search queries from `PopularSearch` and top 10 most bookmarked products from `Bookmark`.
  - **Test Evidence:** [tests/unit/analytics.service.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/unit/analytics.service.test.js) (PASSED), [tests/integration/bookmarks_analytics.test.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/camso-backend/tests/integration/bookmarks_analytics.test.js) (PASSED).
- **Aary's Backend:**
  - **Status:** **NOT FOUND**
  - **Findings:** Master plan proposed `GET /admin/analytics/content` (document downloads and feedback summaries), but grep analysis confirms that no `analytics` module or route exists in Aary's backend.

---

### 18. Push Notifications & Campaigns
- **Vishal's Backend:**
  - **Status:** **PARTIAL (Device Token Ingestion Only)**
  - **Code Evidence:** Device FCM token registration exists in `src/modules/devices/` (`POST /api/v1/devices`), but outbound campaign creation and send triggers are not implemented in Vishal's backend.
- **Aary's Backend:**
  - **Status:** **IMPLEMENTED, NOT VERIFIED (Complete Pipeline, BLOCKED runtime)**
  - **Code Evidence:**
    - Notifications: [src/modules/notifications/notifications.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/notifications/notifications.routes.js) (`GET /api/v1/notifications`), [notifications.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/notifications/notifications.admin.routes.js).
    - Campaigns: [src/modules/campaigns/campaigns.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/campaigns/campaigns.admin.routes.js), [campaigns.service.js:L200-L345](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/campaigns/campaigns.service.js#L200-L345).
      - `POST /api/v1/admin/campaigns/:id/send`: Resolves targeting (`ALL_USERS`, `BUSINESS_TYPE`, `LANGUAGE`, `COUNTRY`) against `users` and `user_devices`, deduplicates tokens, batches into chunks of 500, and sends via `firebase-admin` `messaging().sendEachForMulticast()`. Marks unregistered tokens inactive in `user_devices`.
  - **Test File Evidence:** `tests/integration/adminDays910.test.js`.
  - **Integration Prerequisite:** Requires active Firebase credentials in `.env` and resolution of integer vs CUID device IDs.

---

### 19. Pricing & Real-Time Availability
- **Status in BOTH Backends:** **NOT FOUND / DEFERRED**
- **Evidence:** SOW Page 1 Section 2 item 6, Page 2 Section 3 item 9, and Page 4 Section 5.2 assign pricing updates and availability to Month 3 (Week 9–10 Advanced Scope). Neither backend implements real-time ERP pricing or inventory feeds.

---

### 20. Other Discovered Modules
- **Vishal's Backend:**
  - **Firebase Data Connect Artifacts:** `src/dataconnect-generated/` present in repository. Configured in `package.json` as `@dataconnect/generated: "file:src/dataconnect-generated"`. Reflects experimental/pre-generated Firebase Data Connect connectors.
- **Aary's Backend:**
  - **Customer Feedback & VOC Module:**
    - Code: [src/modules/feedback/feedback.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/feedback/feedback.routes.js), [feedback.admin.routes.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/feedback/feedback.admin.routes.js), [feedback.service.js](file:///C:/Users/visha/OneDrive/Desktop/CEAT/Camso-Backend-day10-admin-crud/src/modules/feedback/feedback.service.js).
    - `POST /api/v1/feedback`: Submits customer rating and comment across `PRODUCT`, `SERVICE`, or `PRICING` buckets.
    - `GET /api/v1/admin/feedback`: Admin filter and review list.
    - `GET /api/v1/admin/feedback/export?format=csv`: Exports feedback records to CSV.
    - Status: **IMPLEMENTED, NOT VERIFIED**.

---

## C. Testing & Verification Results (Empirical Evidence)

| Check / Test Target | Command Executed | Backend | Exit Code | Empirical Result & Captured Output Excerpt |
|---|---|---|---|---|
| **Prisma Schema Validation** | `npx prisma validate` | `camso-backend` | 0 | `The schema at prisma\schema.prisma is valid 🚀` |
| **Prisma Schema Validation** | `npx prisma validate` | `Camso-Backend-day10-admin-crud` | Non-zero (Killed) | BLOCKED: Local `node_modules` missing; `npm warn exec The following package was not found: prisma@8.0.0-rc.22` |
| **Unit Test Suite** | `npm run test:unit` | `camso-backend` | 0 | **25 suites passed, 228 tests passed, 0 failed** (Duration: 3.977s) across auth, users, devices, categories, products, search, bookmarks, languages, content, analytics, admin-auth, business-auth, tokenService, password, guards. |
| **Integration Test Suite** | `npm run test:integration` | `camso-backend` | 0 | **2 suites passed, 2 suites skipped, 5 tests passed, 71 skipped** (PostgreSQL offline gate cleanly triggered; root/health probes passed). |
| **Readiness Integration** | `npx jest tests/integration/readiness_config.test.js` | `camso-backend` | 0 | **1 suite passed, 4 passed, 6 skipped** (`GET /health` 200 OK, `GET /api/v1/health` 200 OK, admin auth 401 guard verified). |
| **Unit & Integration Tests** | `npm test` | `Camso-Backend-day10-admin-crud` | N/A | **NOT RUN / BLOCKED**: `node_modules` directory does not exist (`Test-Path` returned `False`); `.env` file does not exist. |
| **Docker Engine Check** | `docker ps` | Host OS | 1 | `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine... daemon is not running` |
| **Local PostgreSQL Port** | `Get-NetTCPConnection -LocalPort 5432` | Host OS | 1 | Port 5432 is not listening; no active PostgreSQL instance reachable. |

---

## D. SOW Scope & Traceability Matrix

**Contract Source Document:** `CAMSO SOW_260821_105506.pdf` (Total Pages: 5)  
**Industry Partner:** CEAT Specialty Tyres Ltd. | **Institute:** Vishwakarma Institute of Technology, Pune  
**Project Start:** 12 August 2026 | **Target Completion:** 31 October 2026

### Core Scope Implementation Matrix (Immediate SOW Delivery)

| SOW Requirement & Citation | Implementation in Vishal's Backend (`camso-backend`) | Implementation in Aary's Backend (`Camso-Backend-day10-admin-crud`) | Actual Combined Status | Remaining Work to Complete | External Dependencies | Proof Required to Call Complete |
|---|---|---|---|---|---|---|
| **1. Product Catalogue & Info** (SOW p.1 §2.1, p.2 §3.2) | Hierarchical categories (`/categories`), products (`/products`), specifications, image linking, admin CRUD. Fully verified with 50+ unit tests. | Table definitions in `catalogue.prisma`; no routes or services implemented. | **VERIFIED (Vishal)** | Seed realistic CEAT tire/track catalogue data into production DB. | PostgreSQL database | Live DB query returning nested categories and product specs. |
| **2. Search & Filtering** (SOW p.1 §2.2, p.2 §3.2) | 6-tier ranking engine (`/search`), query history (`/recent`), hit aggregation (`/popular`). Verified with unit tests. | Table definitions in `search.prisma`; no routes or services implemented. | **VERIFIED (Vishal)** | Tune prefix/substring scoring against large datasets. | PostgreSQL database | HTTP test proving PID > Name > Category ranking order. |
| **3. Customer Support Library** (SOW p.1 §2.3, p.2 §3.3) | Not implemented. | Full public and admin documents CRUD (`/documents`), multilingual attachments (`/files`), Multer upload. | **IMPLEMENTED, NOT VERIFIED (Aary)** | Reconcile `product_id`/`category_id` FKs from `Int` to `String`; install deps; verify with live uploads. | Firebase Storage credentials, Multer | Successful PDF upload via admin endpoint and download via public endpoint. |
| **4. FAQs & Testimonials** (SOW p.1 §2.3, p.2 §3.3) | Not implemented. | Full public and admin CRUD for FAQs and Testimonials (`/faqs`, `/testimonials`) with translations. | **IMPLEMENTED, NOT VERIFIED (Aary)** | Convert entity IDs to match primary key convention; verify endpoints with integration tests. | Database | HTTP 200 response with localized FAQ/testimonial payloads. |
| **5. Bookmarks & Engagement** (SOW p.1 §2.3, p.2 §3.4) | Full CRUD (`/bookmarks`) + guest-to-account synchronization (`/bookmarks/sync`). Verified. | Table definition in `search.prisma`; no endpoints. | **VERIFIED (Vishal)** | Test concurrent sync with live PostgreSQL database. | PostgreSQL database | Integration test proving guest bookmarks merge into user profile on login. |
| **6. Multilingual & Localization** (SOW p.1 §2.4, p.2 §3.4, p.3 §4.4) | Language registry (`/languages`), app content translations (`/content`). Verified. | Polymorphic translation engine (`src/core/utils/translate.js`, `translations` table). | **PARTIAL** | Unify translation table schema so `entity_id` accommodates String CUIDs. | None | Test verifying French, German, Italian retrieval for products and documents. |
| **7. User Profile & Login** (SOW p.1 §2.4, p.2 §3.4) | Complete customer auth (`/auth/register`, `/login`, `/guest`, `/refresh`, `/logout`) and profile (`/users/me`). Verified. | Missing customer auth; only admin user management (`/admin/admin-users`). | **VERIFIED (Vishal)** | Connect Flutter client authentication screens to `/api/v1/auth/*`. | JWT secret, Database | Supertest authentication session lifecycle. |
| **8. Dealer & Distributor Discovery** (SOW p.1 §2.5, p.2 §3.5) | Authenticated business portal (`/business/organization`, `/business/dealer/portal`, `/business/distributor/portal`). Verified. | Public dealer proximity locator (`/dealers/locator` via Haversine) and CSR contacts. Implemented. | **PARTIAL (Split Implementation)** | Mount Aary's dealer routes into unified backend router; reconcile dealer model ID types. | Database | Geo-coordinate query returning nearest dealers within radius. |
| **9. Push Notifications & Campaigns** (SOW p.1 §2.3, p.2 §3.4, p.3 §4.8) | Device token registration (`POST /api/v1/devices`). Verified. | Campaign management (`/admin/campaigns`) and multicast FCM dispatch (`/:id/send`). Implemented. | **PARTIAL** | Provide real Firebase credentials; verify FCM multicast send with mock and live tokens. | Firebase Admin SDK, FCM credentials | FCM send response returning `targetCount`, `successCount`. |
| **10. Admin CMS & Access Control** (SOW p.1 §2.8, p.2 §3.8) | Admin catalogue CRUD, languages, content settings, org approvals, admin login. Verified. | Admin documents, testimonials, FAQs, dealers, feedback CSV export, admin users. Implemented. | **PARTIAL (Backend APIs only, UI missing)** | Merge admin routes into central router; clarify admin dashboard UI deliverable. | None | End-to-end admin CRUD tests across all content models. |
| **11. Analytics** (SOW p.1 §2.8, p.2 §3.8, p.3 §4.8) | Catalogue analytics (`/admin/analytics/catalogue`: top searches & bookmarks). Verified. | Not implemented (`/admin/analytics/content` missing). | **PARTIAL (Catalogue Verified)** | Add content analytics (most downloaded docs, feedback ratings) to analytics module. | Database | HTTP 200 returning top searched terms and downloaded document stats. |
| **12. Customer Feedback (VOC)** (SOW p.1 §2.3, p.2 §3.4) | Not implemented. | Feedback submission (`POST /feedback`), admin list, and CSV export (`/admin/feedback/export`). Implemented. | **IMPLEMENTED, NOT VERIFIED (Aary)** | Mount feedback router into unified backend; run integration tests. | Database | Supertest submitting feedback and downloading CSV report. |

---

### Deferred / Advanced SOW Scope (Phase 2 & Phase 3 Milestones)

The following contractually specified items from `CAMSO SOW_260821_105506.pdf` are explicitly **deferred** from the core backend demo. They remain valid contractual commitments but require external inputs, machine learning models, or Launch 2/3 timelines:

1. **AI-Driven Static Loaded Radius (SLR) Prediction Model**
   - *Citation:* SOW Header (Page 1) & Success Criteria (Page 3, §4: *"The primary quantitative success criterion specified in the project document is ≤3% MAPE on unseen tyre data, supported by robust group-wise validation."*)
   - *Nature:* Data science / ML model training on historical tyre dataset. This is completely separate from the Express.js API backend and will run as an ML service or on-device inference model.
   - *Status:* **DEFERRED / OUT OF BACKEND DEMO SCOPE**.
2. **Specialized Technical Calculators (LOCS & MHE Intensity)**
   - *Citation:* SOW Page 1 §2.7 ("Calculators and technical decision-support features including LOCS and MHE Intensity calculators, subject to evaluation.")
   - *Nature:* Engineering formula implementations pending confirmation of input parameters from CEAT.
   - *Status:* **DEFERRED (Phase 2 / Launch 2)**.
3. **Product Selectors & Advisory Tools**
   - *Citation:* SOW Page 2 §3.7 ("Product Selector, Pressure Advisor, Reverse Track Selector, Rubber Pad Selector and other approved tools.")
   - *Nature:* Complex recommendation algorithms requiring tire load/inflation tables and machine fitment databases.
   - *Status:* **DEFERRED (Phase 2 / Launch 2)**.
4. **Distributor Training Center & Claims Processing Module**
   - *Citation:* SOW Page 2 §3.6 ("Training and claims module for distributor training content, claim registration, document/image uploads and claim-status tracking.")
   - *Status:* **DEFERRED (Launch 2, September 2026)**. Note: Vishal's backend already established the `BusinessOrganization` and `business-auth` foundation for this.
5. **Advanced Multimodal Search & Pricing/Availability Updates**
   - *Citation:* SOW Page 2 §3.9 ("Advanced features including product availability, advanced voice/image-assisted search, pricing updates, training certifications.")
   - *Status:* **DEFERRED (Launch 3, October 2026)**.

---

## E. Final Audit Summary

### 1. Categorical Status Totals

- **Verified Complete (10 modules/features in Vishal's backend):**
  1. Application setup, graceful shutdown, and health/readiness probe layer.
  2. Customer User Authentication (`/auth/*` — register, login, guest, refresh, logout).
  3. User Profile Management (`/users/me`).
  4. Device Registration & Ownership Deactivation (`/devices/*`).
  5. Category Hierarchy Tree & Admin Category CMS (`/categories/*`, `/admin/categories/*`).
  6. Product Catalogue, Dynamic Spec Filters & Image Attachment (`/products/*`, `/admin/products/*`).
  7. Multi-Tier Ranked Search & Popular/Recent Query Logging (`/search/*`).
  8. Bookmarks & Guest-to-Account Synchronization (`/bookmarks/*`).
  9. Languages Registry & Content/App Settings CMS (`/languages/*`, `/content/*`).
  10. Catalogue Analytics (`/admin/analytics/catalogue`).
- **Implemented, Not Verified (6 modules in Aary's backend):**
  1. Support Documents & Document Files Multipart Upload (`/documents/*`).
  2. FAQs Public & Admin CRUD (`/faqs/*`).
  3. Testimonials Public & Admin CRUD (`/testimonials/*`).
  4. Dealer Proximity Locator (Haversine) & CSR Contacts (`/dealers/*`).
  5. Customer Feedback / VOC & CSV Export (`/feedback/*`).
  6. Campaign Targeting & Multicast FCM Pipeline (`/admin/campaigns/*`).
- **Partial (Requiring Schema/Contract Alignment):**
  1. Admin Identity & Access Control: Vishal built `AdminUser` (CUID) + `admin-auth` login; Aary built `AdminUser` (Int) CRUD without login routes.
  2. Multilingual Translations: Vishal built language registry; Aary built polymorphic translation repository.
  3. Dealer/Distributor Ecosystem: Vishal built portal authorization & org approval; Aary built public dealer locator.
- **Missing from Both Codebases:**
  1. **Frontend Admin UI Dashboard:** Neither backend contains an administrative web dashboard (APIs exist, but no React/Flutter web CMS exists).
  2. Content Analytics (`/admin/analytics/content`: document download counters and feedback metrics).
- **Blocked by Environment / External Dependencies:**
  1. Aary's backend runtime verification is **BLOCKED** by missing `node_modules` and missing `.env`.
  2. Integration testing against live PostgreSQL is **BLOCKED** by offline PostgreSQL/Docker daemon.
  3. Outbound FCM push execution and Cloud Storage uploads are **BLOCKED** by missing Firebase service account credentials.

### 2. Highest-Risk Integration Issues
1. **Primary Key Mismatch (`String CUID` vs `Int Autoincrement`):**
   Aary's foreign keys in `documents`, `testimonials`, `faqs`, `feedback`, `audit_logs`, and `translations` assume integer IDs. Connecting them to Vishal's catalogue models (`Product.id`, `Category.id`, `User.id`) will cause PostgreSQL schema migration failures and runtime crashes unless normalized.
2. **Express Version Incompatibility:**
   Vishal's backend uses Express 5 (`^5.2.1`), while Aary's backend uses Express 4 (`^4.19.2`). Path parsing, regex routes, and error-handling behavior differ between the two major versions.
3. **Route Mounting Pattern Collision:**
   Aary's backend uses an automatic filesystem scanner (`autoMountModules`) expecting `<module>.routes.js` and `<module>.admin.routes.js`, while Vishal's backend uses explicit route imports. Merging must maintain a single, deterministic routing paradigm.
4. **Firebase Credential Dependency:**
   Both media uploads and campaign push notifications depend on `firebase-admin`. Without sandbox/dev Firebase project credentials, these write paths cannot be exercised end-to-end.

---
*End of Current State Audit Report.*
