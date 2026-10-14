# Product Requirements Document (PRD) — CAMSO Backend Master Execution Plan

**Project:** CAMSO Mobile App Backend  
**Repository:** `C:\Users\visha\OneDrive\Desktop\CEAT\camso-backend`  
**Working Branch:** `work/vishal-backend` (Milestone 1) → `integrate/aary-backend` (Milestone 2)  
**Authoritative References:** CAMSO Master Plan V4 (`files/CAMSO_Backend_PlanV4.md`), `docs/Vishal_Backend_Work_Plan.md`, `CAMSO_Backend_Plan_Aary.md`

---

## 1. Executive Summary & Architecture Overview

The CAMSO Backend is a Node.js LTS, Express 5, and Prisma ORM service powering the CAMSO mobile application and administrative CMS. The project is executed in three strictly staged milestones:
1. **Milestone 1 — Vishal's Backend:** Product catalogue, hierarchical categories, specification filtering, multi-tier ranked search, bookmarks with guest-to-account synchronization, device-token management, catalogue analytics, and platform health probes.
2. **Milestone 2 — Integration of Aary's Backend:** Content management (documents, testimonials, FAQs, app content), dealer locator, VOC feedback, campaigns/push pipeline, and admin authentication/authorization.
3. **Milestone 3 — Comprehensive Testing, Hardening & Development Test Data:** Full regression testing, security boundary validation, and safe local development/test data seeding.

---

## 2. Milestone 1 — Vishal's Backend (Independent Completion)

### Goal
Implement and verify all Module 2 endpoints and models assigned to Vishal on branch `work/vishal-backend` before merging any external branches.

### Bounded Tasks:
- **Task 1.1: Devices & User Profile Verification** *(COMPLETED)*
  - `POST /api/v1/devices`: Register/update device token (`device_id`, `platform`, `fcm_token`, `app_version`).
  - `DELETE /api/v1/devices/:id`: Soft-deactivate device (`is_active = false`), owner-protected.
  - `GET /api/v1/devices`: List authenticated user's registered devices.
  - Verification: 59 passing unit tests across auth, users, devices, token service, and password utilities.
- **Task 1.2: Categories Module (Public Tree & Admin Management)**
  - Schema: `Category` model (`id`, `parent_id`, `name`, `slug`, `description`, `icon_url`, `is_active`, `sort_order`).
  - Public Endpoints:
    - `GET /api/v1/categories`: Hierarchical parent-child tree, active-only.
    - `GET /api/v1/categories/:id`: Category detail view with immediate children.
    - `GET /api/v1/categories/:id/products`: Paginated products under category.
    - `GET /api/v1/categories/:id/filters`: Distinct filterable specification keys/values.
  - Admin Endpoints:
    - `GET /api/v1/admin/categories`: All categories including inactive.
    - `GET /api/v1/admin/categories/:id`: Category admin detail.
    - `POST /api/v1/admin/categories`: Create category (audit log logged).
    - `PATCH /api/v1/admin/categories/:id`: Update category / toggle active status.
- **Task 1.3: Products & Specifications Module**
  - Schema: `Product`, `ProductImage`, `ProductSpecification` models.
  - Public Endpoints:
    - `GET /api/v1/products`: Multi-filter query (`category`, `q`, `spec_*`, sort, pagination).
    - `GET /api/v1/products/:idOrSlug`: Product detail with specifications, images, and translations.
  - Admin Endpoints:
    - `GET /api/v1/admin/products`, `GET /api/v1/admin/products/:id`.
    - `POST /api/v1/admin/products`, `PATCH /api/v1/admin/products/:id`.
    - `POST /api/v1/admin/products/:id/images`: Link uploaded media asset.
- **Task 1.4: Multi-Tier Ranked Search & Query Logging**
  - Schema: `SearchLog`, `PopularSearch` models.
  - Endpoints:
    - `GET /api/v1/search`: 6-tier ranking priority (Exact PID > Exact Name > Prefix Name > Category > Spec > Partial).
    - `GET /api/v1/search/recent`: Authenticated user's recent search queries.
    - `GET /api/v1/search/popular`: Aggregated top queries by hit count.
- **Task 1.5: Bookmarks & Guest-to-Account Synchronization**
  - Schema: `Bookmark` model with PostgreSQL partial unique indexes (`user_id, product_id` WHERE `user_id IS NOT NULL`; `device_id, product_id` WHERE `device_id IS NOT NULL`).
  - Endpoints:
    - `GET /api/v1/bookmarks`: Retrieve paginated bookmarked products.
    - `POST /api/v1/bookmarks`: Add bookmark (409 Conflict on duplicate).
    - `DELETE /api/v1/bookmarks/:id`: Remove bookmark.
    - `POST /api/v1/bookmarks/sync`: Merge guest device bookmarks into authenticated user account.
- **Task 1.6: Catalogue Analytics & Platform Foundation**
  - Endpoints:
    - `GET /api/v1/admin/analytics/catalogue`: Aggregated top searched terms and top bookmarked products.
    - `GET /api/v1/health`: Process liveness probe.
    - `GET /api/v1/ready`: Process readiness probe verifying live database connectivity.

### Milestone 1 Acceptance Gate
1. All Vishal-scope endpoints coded and mounted.
2. Unit tests passing with 0 failures for every service, controller, and validation schema.
3. Database integration tests executed or verified against active PostgreSQL container.
4. Prisma schema validation passes.
5. Zero secrets logged or committed.
6. Git working tree clean on `work/vishal-backend`.

---

## 3. Milestone 2 — Integrate Aary's Backend

### Entry Condition
Milestone 1 acceptance gate fully passed and verified.

### Scope & Compatibility Reconciliation:
1. **Branch Strategy:** Create dedicated branch `integrate/aary-backend` from verified `work/vishal-backend`.
2. **Schema & Model Merging:**
   - Reconcile Aary's 24 models (`admin_users`, `documents`, `testimonials`, `faqs`, `dealers`, `feedback`, `campaigns`, `languages`, `translations`, `media_assets`, `audit_logs`).
   - Preserve Vishal's CUID primary key convention or reconcile cleanly without breaking foreign key integrity.
3. **Middleware & Security Integration:**
   - Unify `authGuard.js` (user/guest auth) and `adminGuard.js` / `requireRole.js` (admin auth).
   - Reconcile `auditService.js` and `auditContext.js` across admin routes.
4. **Route Aggregation:** Mount all public and administrative content routes in `src/routes/index.js`.
5. **Combined Regression Testing:** Verify both Vishal endpoints and Aary endpoints pass in unified test run.

### Milestone 2 Acceptance Gate
1. Unified Prisma schema compiles and validates (`prisma validate`).
2. All combined routes mounted without naming collisions or duplicate middleware.
3. Admin role-based access control tested across all admin endpoints.
4. Combined unit and integration test suites pass.

---

## 4. Milestone 3 — Comprehensive Testing, Hardening & Safe Test Data

### Goal
Provide 100% end-to-end reliability, fix edge cases, and provide safe, repeatable test seeding.

### Test Strategy:
1. **Unit Testing:** 100% service, helper, and validation coverage.
2. **Database Integration Testing:** End-to-end HTTP request testing with Supertest against PostgreSQL.
3. **Security Testing:**
   - Bearer token authentication & role authorization checks.
   - Cross-user resource tampering checks (e.g., deactivating another user's device).
   - Refresh token replay and compromised token revocation.
4. **Search Ranking Verification:** Exact PID > Name > Category > Spec ranking assertions.
5. **Bookmark Concurrency & Partial Index Deduplication:** Verify duplicate bookmark rejection and guest sync.

### Safe Development & Test Data Strategy:
1. **Seed Script (`prisma/seed.js`):**
   - Realistic, fictional test categories (Excavator, Loader, Agricultural, Industrial).
   - Sample products with specifications, dimensions, and placeholder image assets.
   - Popular search terms and search history samples.
   - Seed users (Guest, Registered Dealer, Admin roles: `SUPER_ADMIN`, `CONTENT_ADMIN`).
   - Zero production data, zero real credentials, zero live external notifications.

### Milestone 3 Acceptance Gate
1. All unit and integration suites pass.
2. Seed script executes idempotently (`npm run prisma:seed`).
3. Readiness check (`GET /api/v1/ready`) returns 200 OK.
4. Complete audit documentation delivered.

---

## 5. Ralph Loop Operational Constraints

- Work in strictly bounded, sequential iterations.
- Inspect Git status, diffs, and test outputs after each bounded task.
- Stop on missing external credentials, schema conflicts, or failing tests.
- Never commit secrets or push to remote without authorization.
