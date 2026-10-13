# CAMSO Backend — Complete Onboarding Guide
### For Freshers Joining Aary's Backend Team

> **Read this entire document before touching any code.**  
> It starts from the very basics and builds up to the full project.  
> You do not need prior backend experience — everything is explained here.

---

## Part 1 — Foundational Concepts

*If you already know what a REST API is, skip to Part 2.*

---

### 1.1 What Is a Backend?

When you open any mobile app and see data — product listings, your profile, push notifications — that data comes from somewhere. That "somewhere" is the **backend**.

The backend is a server (a computer running 24/7 somewhere in the cloud) that:
- Stores data in a database
- Exposes **APIs** (Application Programming Interfaces) for the mobile app to call
- Enforces rules (who is allowed to do what)
- Handles business logic (e.g. "only published documents should be visible publicly")

The **mobile app** (Flutter, built by Avni & Vira) is the frontend. It talks to our backend via HTTP requests over the internet.

```
Mobile App (Flutter)
       │
       │  HTTP requests (GET, POST, PATCH)
       │
       ▼
   Our Backend (Node.js + Express)
       │
       │  Database queries (Prisma)
       │
       ▼
   PostgreSQL Database
```

---

### 1.2 What Is a REST API?

REST is a convention for how a client (mobile app) and server (backend) communicate. They talk using **HTTP** — the same protocol your browser uses to load websites.

Each request has:

| Part | What it means | Example |
|------|--------------|---------|
| **Method** | What kind of action | `GET` (read), `POST` (create), `PATCH` (update), `DELETE` (remove) |
| **URL / Path** | Which resource | `/api/v1/documents` |
| **Headers** | Metadata about the request | `Authorization: Bearer <token>` |
| **Body** | Data sent with the request (usually JSON) | `{ "rating": 5, "comment": "Great!" }` |

The server responds with:
- A **status code** (200 = OK, 404 = not found, 401 = not logged in, 500 = server crashed)
- A **JSON body** (the data)

**Example conversation between mobile app and backend:**
```
Mobile App:  GET /api/v1/documents
             Authorization: Bearer eyJhbGci...

Backend:     200 OK
             {
               "success": true,
               "data": [ { "id": 1, "document_type": "MANUAL", ... } ],
               "meta": { "page": 1, "total": 42 }
             }
```

---

### 1.3 What Is Node.js?

**Node.js** is a runtime that lets you run JavaScript on the server (outside a browser). Our backend is written entirely in JavaScript running on Node.js.

We use **Node.js 24 LTS** (Long Term Support) — the most stable recent version.

---

### 1.4 What Is Express?

**Express** is a minimal Node.js web framework. It handles the boring parts of running an HTTP server:
- Listening on a port
- Parsing incoming JSON request bodies
- Routing (which URL path goes to which code)
- Middleware (code that runs on every request, like authentication)

```js
// Tiny example — this is what Express does
const express = require('express');
const app = express();

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(4000); // Server is now running on port 4000
```

Our backend uses Express to build all ~40+ endpoints.

---

### 1.5 What Is a Database and PostgreSQL?

A **database** is where data lives permanently. When the server restarts, data in memory disappears — but data in the database survives.

**PostgreSQL** is a relational database. Data is stored in **tables** (like spreadsheets):

```
admin_users table:
┌────┬───────────────────────┬──────────┬────────────┐
│ id │ email                 │ role     │ is_active  │
├────┼───────────────────────┼──────────┼────────────┤
│  1 │ aary@camso.com        │ SUPER_AD │ true       │
│  2 │ content@camso.com     │ CONTENT_ │ true       │
│  3 │ viewer@camso.com      │ VIEWER   │ false      │
└────┴───────────────────────┴──────────┴────────────┘
```

Tables are related to each other via **foreign keys**:
```
documents table references admin_users (who published it)
document_files table references documents (which document this file belongs to)
```

---

### 1.6 What Is Prisma?

Writing raw SQL queries is verbose and error-prone. **Prisma** is an ORM (Object-Relational Mapper) that lets you talk to PostgreSQL using JavaScript objects instead of SQL strings.

```js
// Without Prisma (raw SQL — tedious and error-prone)
db.query("SELECT * FROM documents WHERE is_published = true AND product_id = $1", [42]);

// With Prisma (clean JavaScript)
prisma.document.findMany({
  where: { is_published: true, product_id: 42 }
});
```

Prisma also uses **schema files** (`.prisma`) to define the shape of your database tables. When you edit a schema file and run `prisma migrate`, it generates the SQL and applies it to the database.

We use **Prisma 6.x** with a multi-file schema — our tables are spread across multiple `.prisma` files, one per domain.

---

### 1.7 What Is JWT Authentication?

**JWT** (JSON Web Token) is how we prove who a user is without storing sessions on the server.

How it works:
1. User sends their email + password to `/admin/auth/login`
2. If correct, the server creates a signed **access token** (valid for 15 minutes)
3. The client stores this token and sends it with every subsequent request in the `Authorization` header
4. The server reads and verifies the token — no database lookup needed (it's cryptographically signed)
5. When the access token expires, the client uses a **refresh token** (valid for 30 days) to get a new access token

```
User → POST /admin/auth/login { email, password }
       ← { accessToken: "eyJ...", refreshToken: "eyJ..." }

User → GET /admin/documents
       Authorization: Bearer eyJ...
       ← 200 { data: [...] }    (token is valid)

User → GET /admin/documents
       Authorization: Bearer eyJ...  (token expired)
       ← 401 Unauthorized

User → POST /admin/auth/refresh { refreshToken: "eyJ..." }
       ← { accessToken: "new eyJ...", refreshToken: "new eyJ..." }
```

---

### 1.8 What Is Role-Based Access Control?

Not every logged-in admin can do everything. We have 4 roles:

| Role | Think of them as... |
|------|-------------------|
| `SUPER_ADMIN` | The boss — can do everything |
| `CONTENT_ADMIN` | Content editor — can create/edit/publish content |
| `MARKETING` | Marketing team — can manage notifications and campaigns |
| `VIEWER` | Read-only staff — can only look, never change |

When an admin hits an endpoint, we check:
1. Do they have a valid JWT? (`adminGuard`)
2. Is their account still active? (`adminGuard`)
3. Does their role allow this specific action? (`requireRole`)

---

## Part 2 — The Project Context

### 2.1 What Are We Building?

**CAMSO** is a mobile app for CEAT Ltd.'s Camso brand — Compact Construction Tires and Tracks. Think of it as a product companion app. No e-commerce — just information, documents, dealer finder, and push notifications.

**Release schedule:**
- **Launch 1** (25 Aug 2026) — Public app — anyone can use it
- **Launch 2** (25 Sep 2026) — Distributor features — requires login

### 2.2 The Two Backend Teams

The backend is split between two teammates:

| Person | Their Domain | Short description |
|--------|-------------|------------------|
| **Aary** | Support, Content & Engagement | Documents, FAQs, Testimonials, Dealer Locator, Feedback, Notifications, Campaigns, Admin Users |
| **Vishal** | Catalogue, Search & Identity | User Auth, Products, Categories, Search, Bookmarks |

They share one codebase, one database, and one set of infrastructure — but each person **owns their own tables and modules**. They never import each other's code.

---

## Part 3 — How This Backend Is Architected

### 3.1 The Layered Architecture

Every request goes through a strict sequence of layers. **Nothing skips a layer.**

```
HTTP Request from Mobile App
          │
          ▼
    ┌─────────────┐
    │   Express   │  ← The web framework — routes the request to the right handler
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Middleware │  ← adminGuard, authGuard, requireRole, auditContext, errorHandler
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Controller │  ← Thin layer — reads request, calls service, sends response
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Service   │  ← Business logic — rules, validation, calls auditService
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ Repository  │  ← ONLY layer that touches Prisma (database)
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Prisma    │  ← ORM — translates your JavaScript into SQL
    └──────┬──────┘
           │
           ▼
    ┌──────────────┐
    │  PostgreSQL  │  ← The actual database
    └──────────────┘
```

**Why strict layers?**
- If something breaks, you know exactly which layer to look at
- Adding a new feature never breaks an unrelated feature
- Tests can mock just one layer to test another in isolation

### 3.2 What Each Layer Is Responsible For

**Route files** (`<name>.routes.js`, `<name>.admin.routes.js`)
- Define which URL paths exist
- Apply middleware (auth guards, role checks)
- Are intentionally thin — they just connect URLs to controller methods
- Example: `router.get('/', requireRole(['VIEWER', 'SUPER_ADMIN']), controller.listDocuments)`

**Controller** (`<name>.controller.js`)
- Receives the HTTP request object (`req`)
- Extracts data from `req.body`, `req.params`, `req.query`
- Calls the service method with that data
- Wraps the response in `ApiResponse.success(res, data)` or lets errors bubble to `errorHandler`
- Should contain zero business logic

```js
// Typical controller method
async function adminGetDocument(req, res) {
  const { id } = req.params;
  const document = await documentsService.getAdminDocument(id);
  ApiResponse.success(res, document);
}
```

**Service** (`<name>.service.js`)
- Contains all business logic
- Validates inputs (e.g. "is this a valid document type?")
- Orchestrates multiple repository calls if needed
- Calls `auditService.record()` after every mutation
- Never imports Prisma directly

```js
// Typical service method (mutation)
async function publishDocument(id, auditContext) {
  const before = await documentsRepository.findById(id);
  if (!before) throw ApiError.notFound('Document not found');
  
  const after = await documentsRepository.publish(id);
  
  await auditService.record({
    actorId:    auditContext.actorId,
    action:     'PUBLISH',
    entityType: 'DOCUMENT',
    entityId:   id,
    before:     { is_published: before.is_published },
    after:      { is_published: true },
  });
  
  return after;
}
```

**Repository** (`<name>.repository.js`)
- The ONLY file in a module that imports Prisma
- Contains only database queries — no business logic
- Returns raw data to the service

```js
// Typical repository method
const { prisma } = require('../../config/database');

async function findPublishedDocuments({ skip, take, orderBy }) {
  return prisma.document.findMany({
    where: { is_published: true },
    skip,
    take,
    orderBy,
    include: { files: true },
  });
}
```

**Validation** (`<name>.validation.js`)
- Uses **Joi** to define input schemas
- Called from services or controllers before processing
- Returns clean, typed data or throws a `VALIDATION_ERROR`

```js
// Typical validation
const Joi = require('joi');

function validateCreateDocument(body) {
  const schema = Joi.object({
    document_type: Joi.string().valid('CATALOGUE','BROCHURE','MANUAL').required(),
    product_id:    Joi.number().integer().optional(),
  });
  const { error, value } = schema.validate(body);
  if (error) throw ApiError.validation(error.message);
  return value;
}
```

---

### 3.3 How the Auto-Mount System Works

This is clever and worth understanding. `src/routes/index.js` scans the `src/modules/` directory at startup and auto-discovers route files:

```js
// routes/index.js does this automatically for every folder in src/modules/
// If src/modules/documents/documents.routes.js exists:
apiRouter.use('/documents', documentsRouter);       // → /api/v1/documents

// If src/modules/documents/documents.admin.routes.js exists:
adminRouter.use('/documents', documentsAdminRouter); // → /api/v1/admin/documents
```

**The rule**: Admin routes (`/api/v1/admin/*`) automatically get `adminGuard` and `auditContext` applied to all of them. You never need to add those manually to individual routes — they're applied to the entire admin router.

**To add a new module**: Just create a new folder in `src/modules/` with the right files — they get picked up automatically. You never edit `routes/index.js`.

---

### 3.4 Middleware — The Gatekeepers

Middleware are functions that run on every request before it reaches the controller. They can modify the request, reject it, or pass it on.

```
Request → [adminGuard] → [auditContext] → [requireRole] → Controller
               │
          Rejects if:
          - no JWT
          - JWT is invalid/expired
          - admin account is_active=false
```

**`adminGuard.js`** — checks admin JWT:
- Reads `Authorization: Bearer <token>` header
- Verifies the JWT cryptographic signature
- Looks up the admin in the database to check `is_active=true`
- Attaches `req.admin = { id, email, role }` to the request
- Rejects with `401 Unauthorized` if anything fails

**`authGuard.js`** — checks user JWT (for end-user endpoints like feedback):
- Same idea but for mobile app users
- Attaches `req.principal = { id, type: 'USER' | 'GUEST' }`

**`requireRole(...roles)`** — checks the admin's role:
- Used per-route: `requireRole(['CONTENT_ADMIN', 'SUPER_ADMIN'])`
- Rejects with `403 Forbidden` if `req.admin.role` is not in the allowed list

**`auditContext.js`** — prepares audit metadata:
- Runs after `adminGuard` so `req.admin` is already set
- Attaches `req.auditContext = { actorId, role, ip, userAgent }`
- Does NOT write anything to the database — that's the service's job

**`errorHandler.js`** — catches everything:
- If any controller, service, or repository throws an error, this catches it
- Formats it into the standard `{ success: false, error: { type, message } }` JSON
- Logs the error to Winston

---

### 3.5 The Response Envelope

Every single response from our backend uses the same shape:

```json
// Success (list)
{
  "success": true,
  "data": [ {...}, {...} ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "totalPages": 8
  }
}

// Success (single item)
{
  "success": true,
  "data": { "id": 42, "document_type": "MANUAL", ... }
}

// Error
{
  "success": false,
  "error": {
    "type": "NOT_FOUND",
    "message": "Document with id 42 not found",
    "details": null
  }
}
```

This is enforced by `src/core/utils/ApiResponse.js` and `src/core/utils/ApiError.js`. The mobile team always gets the same predictable shape — no surprises.

---

### 3.6 Pagination

Any endpoint that returns a list supports pagination:
```
GET /api/v1/documents?page=2&pageSize=10&sort=created_at:desc
```

The `pagination.js` utility handles parsing these query params, calculating `skip`/`take` for Prisma, and building the `meta` response object. Page size is capped at 100.

---

### 3.7 The Translation System

Our app supports multiple languages. Text content (document titles, FAQ questions/answers, notification bodies) is stored in a single shared `translations` table — not in the main entity tables.

**Why one table?** Because we'd need `title_en`, `title_fr`, `title_de`... on every entity otherwise. The polymorphic translation table handles all of them generically.

```
translations table:
┌────┬─────────────┬───────────┬───────┬───────────────┬──────────────────┐
│ id │ entity_type │ entity_id │ field │ language_code │ value            │
├────┼─────────────┼───────────┼───────┼───────────────┼──────────────────┤
│  1 │ DOCUMENT    │ 42        │ title │ en            │ Engine Manual    │
│  2 │ DOCUMENT    │ 42        │ title │ fr            │ Manuel moteur    │
│  3 │ FAQ         │ 7         │ question │ en         │ How to install?  │
│  4 │ FAQ         │ 7         │ answer   │ en         │ Follow steps...  │
└────┴─────────────┴───────────┴───────┴───────────────┴──────────────────┘
```

When the mobile app requests a document in French, `translate.js` fetches French translations. If a French translation doesn't exist, it falls back to English. This English fallback is always applied — we never return empty/null for a field just because a translation is missing.

> **Important design note**: `entity_id` is NOT a real foreign key in the database. It's just a number that the application interprets. This is an intentional design trade-off to keep the translation table generic — documented in the README.

---

### 3.8 Audit Logging Architecture

Every time an admin mutates data (creates, updates, publishes, unpublishes anything), we record it in the `audit_logs` table. This answers: **"Who changed what, when, from where, and what did it look like before and after?"**

**The pattern:**

```
Step 1: auditContext middleware runs (on every /admin/* request)
        → Reads admin info from the verified JWT
        → Attaches req.auditContext = { actorId, role, ip, userAgent }
        → Does NOT write anything

Step 2: Service method runs the mutation
        → Queries "before" state
        → Runs the update
        → Gets "after" state
        → Explicitly calls auditService.record(...)

Step 3: auditService.record() writes to audit_logs
        → Stores actor, action, entity, before/after, IP, user-agent
```

Why does the **service** call audit, not a middleware?  
Because only the service has both the `before` and `after` state in memory. A middleware can't know what changed.

**Every single mutating service method must call `auditService.record()`** — it is a discipline, not automatic magic.

---

## Part 4 — The Full Project Structure

```
camso-backend/
│
├── prisma/
│   ├── schema.prisma              ← Entry: generator + datasource only (no models here)
│   └── schema/
│       ├── core.prisma            ← [SHARED] languages, translations, media_assets,
│       │                             audit_logs, refresh_tokens
│       ├── content.prisma         ← [AARY'S] admin_users, documents, document_files,
│       │                             testimonials, faqs, dealers, feedback, app_content
│       ├── engagement.prisma      ← [AARY'S] notifications, campaigns
│       ├── catalogue.prisma       ← [VISHAL'S] users, user_devices, categories, products,
│       │                             product_images, product_specifications
│       └── search.prisma          ← [VISHAL'S] search_logs, popular_searches, bookmarks
│
├── src/
│   ├── server.js                  ← HTTP server boot, graceful shutdown, crash handlers
│   ├── app.js                     ← Express app factory: helmet, cors, rate-limit, routes
│   │
│   ├── config/
│   │   ├── index.js               ← All env vars (DATABASE_URL, JWT secrets, etc.)
│   │   ├── database.js            ← Prisma singleton — one client shared across the app
│   │   ├── firebase.js            ← Firebase Admin SDK init (FCM + Storage)
│   │   │                             ⚠️ Handles FIREBASE_PRIVATE_KEY \n unescaping
│   │   ├── jwt.js                 ← JWT secrets + expiry config
│   │   └── swagger.js             ← Swagger/OpenAPI auto-docs config
│   │
│   ├── core/
│   │   ├── middleware/
│   │   │   ├── adminGuard.js      ← Verifies admin JWT + is_active check
│   │   │   ├── authGuard.js       ← Verifies user JWT (USER | GUEST)
│   │   │   ├── requireRole.js     ← Enforces allowed roles per route
│   │   │   ├── auditContext.js    ← Prepares req.auditContext (does NOT write to DB)
│   │   │   └── errorHandler.js    ← Catches all errors, formats response
│   │   │
│   │   ├── services/
│   │   │   └── auditService.js    ← .record() — writes to audit_logs table
│   │   │
│   │   ├── repositories/          ← Core repositories shared across modules
│   │   │   ├── auditLog.repository.js      ← Prisma queries for audit_logs
│   │   │   ├── translation.repository.js   ← Prisma queries for translations
│   │   │   └── mediaAsset.repository.js    ← Prisma queries for media_assets
│   │   │
│   │   ├── logger/
│   │   │   ├── winston.js         ← Structured app/error logging (LOG_LEVEL configurable)
│   │   │   └── morgan.js          ← HTTP access log (every request logged)
│   │   │
│   │   └── utils/
│   │       ├── ApiResponse.js     ← ApiResponse.success(res, data, statusCode?)
│   │       │                         ApiResponse.created(res, data)
│   │       ├── ApiError.js        ← ApiError.validation(), .notFound(), .forbidden()
│   │       │                         .unauthorized(), .conflict(), .badRequest()
│   │       ├── asyncHandler.js    ← Wraps async functions so errors go to errorHandler
│   │       ├── pagination.js      ← parsePagination(query), buildPaginationMeta(...)
│   │       ├── tokenService.js    ← generateTokenPair(), rotateRefreshToken(), revokeAll()
│   │       ├── translate.js       ← Fetches translations with English fallback
│   │       └── mediaUpload.js     ← Multer memory-storage + Firebase Storage upload
│   │
│   ├── modules/
│   │   │
│   │   ├── admin-users/           ← [AARY] Manage CMS admin accounts
│   │   │   ├── admin-users.admin.routes.js
│   │   │   ├── admin-users.controller.js
│   │   │   ├── admin-users.service.js     ← bcrypt hashing, password NEVER stored plain
│   │   │   └── admin-users.repository.js
│   │   │
│   │   ├── campaigns/             ← [AARY] FCM push campaigns
│   │   │   ├── campaigns.admin.routes.js
│   │   │   ├── campaigns.controller.js
│   │   │   ├── campaigns.service.js       ← FCM send, batching, token deduplication
│   │   │   └── campaigns.repository.js   ← Reads Vishal's users+user_devices for targeting
│   │   │
│   │   ├── dealers/               ← [AARY] Dealer/distributor directory
│   │   │   ├── dealers.routes.js           ← Public: locator, csr-contact
│   │   │   ├── dealers.admin.routes.js     ← Admin: CRUD
│   │   │   ├── dealers.controller.js
│   │   │   ├── dealers.service.js
│   │   │   ├── dealers.repository.js      ← Haversine SQL for geo-distance
│   │   │   └── dealers.validation.js
│   │   │
│   │   ├── documents/             ← [AARY] Product documents
│   │   │   ├── documents.routes.js         ← Public: list + detail
│   │   │   ├── documents.admin.routes.js   ← Admin: CRUD + file upload
│   │   │   ├── documents.controller.js
│   │   │   ├── documents.service.js
│   │   │   ├── documents.repository.js
│   │   │   └── documents.validation.js
│   │   │
│   │   ├── faqs/                  ← [AARY] Frequently asked questions
│   │   │   ├── faqs.routes.js
│   │   │   ├── faqs.admin.routes.js
│   │   │   ├── faqs.controller.js
│   │   │   ├── faqs.service.js
│   │   │   ├── faqs.repository.js
│   │   │   └── faqs.validation.js
│   │   │
│   │   ├── feedback/              ← [AARY] User-submitted VOC feedback
│   │   │   ├── feedback.routes.js          ← Public (JWT): submit
│   │   │   ├── feedback.admin.routes.js    ← Admin: list + CSV export
│   │   │   ├── feedback.controller.js
│   │   │   ├── feedback.service.js
│   │   │   ├── feedback.repository.js
│   │   │   └── feedback.validation.js
│   │   │
│   │   ├── notifications/         ← [AARY] Push notification records
│   │   │   ├── notifications.routes.js     ← Public: SENT feed
│   │   │   ├── notifications.admin.routes.js ← Admin: CRUD
│   │   │   ├── notifications.controller.js
│   │   │   ├── notifications.service.js
│   │   │   ├── notifications.repository.js
│   │   │   └── notifications.validation.js
│   │   │
│   │   ├── testimonials/          ← [AARY] Customer testimonials
│   │   │   ├── testimonials.routes.js
│   │   │   ├── testimonials.admin.routes.js
│   │   │   ├── testimonials.controller.js
│   │   │   ├── testimonials.service.js
│   │   │   ├── testimonials.repository.js
│   │   │   └── testimonials.validation.js
│   │   │
│   │   └── auth/                  ← [SHARED] Refresh token repository only
│   │       └── refreshToken.repository.js
│   │
│   └── routes/
│       └── index.js               ← Auto-mounts all modules — never edit this
│
├── tests/
│   ├── unit/                      ← Test individual functions with mocked dependencies
│   └── integration/               ← Test full request→response against real DB
│
├── docs/
│   ├── CAMSO_Backend_Plan.md      ← MASTER PLAN — authoritative, wins all conflicts
│   └── CAMSO_Backend_Plan_Aary.md ← Aary's execution doc — daily timeline
│
├── memory-bank/                   ← AI agent memory bank
├── .env.example                   ← Template for environment variables
├── docker-compose.yml             ← Local PostgreSQL for development
├── prisma.config.js               ← Tells Prisma where to find schema files
└── package.json                   ← Dependencies, npm scripts
```

---

## Part 5 — Database Tables (What Aary Owns)

### 5.1 Tables in `content.prisma` (Aary's)

#### `admin_users`
CMS admin accounts. These are NOT end-users — they are CEAT staff who manage the CMS.

| Field | Type | Notes |
|-------|------|-------|
| `id` | Auto-increment int | Primary key |
| `email` | String (unique) | Login email |
| `password_hash` | String | bcrypt hash — **plain password NEVER stored** |
| `is_active` | Boolean (default: true) | If false, cannot login |
| `role` | Enum | `SUPER_ADMIN` / `CONTENT_ADMIN` / `MARKETING` / `VIEWER` |

#### `documents`
Product documents (manuals, catalogues, brochures). Title stored in `translations`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | Auto-increment int | |
| `product_id` | Int? (nullable) | Optional reference to Vishal's `products` |
| `category_id` | Int? (nullable) | Optional reference to Vishal's `categories` |
| `document_type` | Enum | `CATALOGUE` / `BROCHURE` / `MANUAL` / `TECHNICAL_GUIDE` / `BULLETIN` / `WARRANTY` / `VIDEO` |
| `is_published` | Boolean (default: **false**) | New docs start as drafts |

#### `document_files`
One file per language per document. The actual file lives in Firebase Storage; this table stores the reference.

| Field | Type | Notes |
|-------|------|-------|
| `document_id` | FK → documents | |
| `language_code` | String | e.g. `"en"`, `"fr"` |
| `media_asset_id` | FK → media_assets | Points to the uploaded file record |
| `is_offline_downloadable` | Boolean | Should mobile app cache this? |

#### `testimonials`
Customer success stories.

| Field | Type | Notes |
|-------|------|-------|
| `product_id` | Int? | Optional product reference |
| `customer_name` | String | |
| `region` | String | Geographic region |
| `story_type` | Enum | `SOLIDS` / `OPERATING_COST` / `WORN_PRODUCT_REPLACEMENT` / `REPEAT_PURCHASE` |
| `content` | Text | The actual story text |
| `media_asset_id` | Int? | Optional photo/video |
| `is_published` | Boolean (default: false) | |

#### `faqs`
Frequently asked questions. Question and answer stored in `translations`.

| Field | Type | Notes |
|-------|------|-------|
| `product_id` | Int? | Optional product reference |
| `category` | Enum | `COMPANY` / `PRODUCT` / `DISTRIBUTION` |
| `sort_order` | Int | Display order — lower number = shown first |
| `is_published` | Boolean (default: false) | |

#### `dealers`
Dealer and distributor directory with GPS coordinates for the locator.

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Business name |
| `type` | Enum | `DEALER` / `DISTRIBUTOR` |
| `address`, `city`, `state`, `country` | Strings | Location |
| `geo_lat`, `geo_lng` | Decimal | GPS coordinates for Haversine distance calculation |
| `phone`, `email` | String? | Contact info |
| `has_csr` | Boolean | Does this dealer have a customer service rep? |
| `is_active` | Boolean (default: true) | Active listing |

> Note: `dealers` uses `is_active`, not `is_published` — it's an operational entity, not CMS content.

#### `feedback`
Voice-of-customer submissions from end users.

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | Int? | FK to users (Vishal's). Nullable for guest sessions |
| `device_id` | String | Device identifier |
| `product_id` | Int? | Which product the feedback is about |
| `bucket` | Enum | `PRODUCT` / `SERVICE` / `PRICING` |
| `rating` | Int | 1–5 |
| `comment` | Text? | Optional text |

#### `app_content`
Static CMS pages: about, contact, legal, settings. Text stored in `translations`.

| Field | Type | Notes |
|-------|------|-------|
| `key` | String (unique) | `"about"` / `"contact"` / `"legal"` / `"settings"` |
| `extra` | JSON? | Optional extra structured data |

---

### 5.2 Tables in `engagement.prisma` (Aary's)

#### `notifications`
Individual push notification records. Title and body stored in `translations`.

| Field | Type | Notes |
|-------|------|-------|
| `product_id` | Int? | Optional product reference |
| `campaign_id` | Int? | Which campaign this notification belongs to |
| `notification_type` | Enum | `NEW_LAUNCH` / `DISCONTINUED` / `PROMOTION` |
| `created_by` | FK → admin_users | Which admin created it |
| `status` | Enum | `DRAFT` / `SENT` |
| `sent_at` | DateTime? | When it was actually sent |

> Creating a notification does NOT send it. Only the campaign send endpoint triggers actual FCM delivery.

#### `campaigns`
Campaign targeting config — defines WHO receives the push notification.

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Human-readable label |
| `target_type` | Enum | `ALL_USERS` / `BUSINESS_TYPE` / `LANGUAGE` / `COUNTRY` |
| `target_value` | String? | e.g. `"Distributor"`, `"fr"`, `"IN"`. Null for `ALL_USERS` |
| `status` | Enum | `DRAFT` / `SENT` |
| `scheduled_at` | DateTime? | Informational only — no scheduler for Launch 1 |
| `created_by` | FK → admin_users | |

---

### 5.3 Shared Tables (Core — Both Teams Use These)

These are in `core.prisma` and are read/written by both Aary and Vishal through their own repositories.

| Table | What it stores |
|-------|---------------|
| `languages` | Supported language codes (en, fr, de...) |
| `translations` | All multilingual text content for all entities |
| `media_assets` | File upload records (URL, filename, size, mime type) |
| `audit_logs` | Every admin mutation — who, what, when, before, after |
| `refresh_tokens` | Active JWT refresh tokens for both users and admins |

---

## Part 6 — What We've Built (Days 1–10)

### Day 1 — Foundation
Set up the entire project skeleton: Node + Express server, Prisma + PostgreSQL connection, JWT authentication, 4-role admin access control, Winston/Morgan logging, global error handling, standard response envelope, Swagger API docs, and rate limiting.

### Days 2–6 — Public APIs (what mobile app users see)

| Endpoint | What it does |
|----------|-------------|
| `GET /api/v1/health` | Is the server alive? |
| `GET /api/v1/ready` | Is the server alive + DB reachable? |
| `GET /api/v1/documents` | List published product documents |
| `GET /api/v1/documents/:id` | Get one document with language-specific files |
| `GET /api/v1/testimonials` | List published customer stories |
| `GET /api/v1/faqs` | List published FAQs |
| `GET /api/v1/dealers/locator` | Find nearby dealers (Haversine GPS distance in SQL) |
| `GET /api/v1/dealers/csr-contact` | Get CSR contact for a country |
| `POST /api/v1/feedback` | Submit user feedback (requires user JWT) |
| `GET /api/v1/notifications` | List sent notifications (public feed) |

### Days 7–8 — Admin CMS (what CMS staff use)

| Module | Endpoints built |
|--------|----------------|
| Admin Documents | List, detail, create, update, publish/unpublish, file upload |
| Admin Testimonials | List, detail, create, update, publish/unpublish |
| Admin FAQs | List, detail, create, update, publish/unpublish |

### Days 9–10 — Admin Engagement & Users

| Module | Endpoints built |
|--------|----------------|
| Admin Dealers | List, detail, create, update, toggle is_active |
| Admin Feedback | List, filter, export as CSV |
| Admin Notifications | List, detail, create, update |
| Admin Campaigns | List, detail, create (DRAFT), update, send via FCM |
| Admin Users | List, detail, create, update role, deactivate |

**Test status at Day 10 baseline:**
- 10 test suites
- 111 tests
- 0 failures

---

## Part 7 — Complete API Reference

All paths prefixed with `/api/v1`. Auth column: `none` / `userJWT` / `adminJWT`.

### Public & User Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/health` | none | — | Liveness probe |
| GET | `/ready` | none | — | Readiness probe |
| GET | `/documents` | none | — | List published documents |
| GET | `/documents/:id` | none | — | Document detail + files |
| GET | `/testimonials` | none | — | List published testimonials |
| GET | `/faqs` | none | — | List published FAQs |
| GET | `/dealers/locator` | none | — | Geo-search dealers |
| GET | `/dealers/csr-contact` | none | — | CSR contact by country |
| GET | `/notifications` | none | — | Sent notifications feed |
| POST | `/feedback` | userJWT | — | Submit feedback |

### Admin Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/admin/documents` | adminJWT | VIEWER+ | All documents (incl. drafts) |
| GET | `/admin/documents/:id` | adminJWT | VIEWER+ | Document detail |
| POST | `/admin/documents` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Create |
| PATCH | `/admin/documents/:id` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Update / publish |
| POST | `/admin/documents/:id/files` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Upload file |
| GET | `/admin/testimonials` | adminJWT | VIEWER+ | All testimonials |
| GET | `/admin/testimonials/:id` | adminJWT | VIEWER+ | Detail |
| POST | `/admin/testimonials` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Create |
| PATCH | `/admin/testimonials/:id` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Update |
| GET | `/admin/faqs` | adminJWT | VIEWER+ | All FAQs |
| GET | `/admin/faqs/:id` | adminJWT | VIEWER+ | Detail |
| POST | `/admin/faqs` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Create |
| PATCH | `/admin/faqs/:id` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Update |
| GET | `/admin/dealers` | adminJWT | VIEWER+ | All dealers |
| GET | `/admin/dealers/:id` | adminJWT | VIEWER+ | Detail |
| POST | `/admin/dealers` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Create |
| PATCH | `/admin/dealers/:id` | adminJWT | CONTENT_ADMIN, SUPER_ADMIN | Update |
| GET | `/admin/feedback` | adminJWT | VIEWER, CONTENT_ADMIN, SUPER_ADMIN | List |
| GET | `/admin/feedback/export?format=csv` | adminJWT | VIEWER, CONTENT_ADMIN, SUPER_ADMIN | CSV download |
| GET | `/admin/notifications` | adminJWT | VIEWER, MARKETING, SUPER_ADMIN | List |
| GET | `/admin/notifications/:id` | adminJWT | VIEWER, MARKETING, SUPER_ADMIN | Detail |
| POST | `/admin/notifications` | adminJWT | MARKETING, SUPER_ADMIN | Create |
| PATCH | `/admin/notifications/:id` | adminJWT | MARKETING, SUPER_ADMIN | Update |
| GET | `/admin/campaigns` | adminJWT | VIEWER, MARKETING, SUPER_ADMIN | List |
| GET | `/admin/campaigns/:id` | adminJWT | VIEWER, MARKETING, SUPER_ADMIN | Detail |
| POST | `/admin/campaigns` | adminJWT | MARKETING, SUPER_ADMIN | Create (DRAFT) |
| PATCH | `/admin/campaigns/:id` | adminJWT | MARKETING, SUPER_ADMIN | Update |
| POST | `/admin/campaigns/:id/send` | adminJWT | MARKETING, SUPER_ADMIN | Fire FCM push |
| GET | `/admin/admin-users` | adminJWT | SUPER_ADMIN only | List admin accounts |
| GET | `/admin/admin-users/:id` | adminJWT | SUPER_ADMIN only | Detail |
| POST | `/admin/admin-users` | adminJWT | SUPER_ADMIN only | Create admin account |
| PATCH | `/admin/admin-users/:id` | adminJWT | SUPER_ADMIN only | Update role / deactivate |

---

## Part 8 — What We Share With Vishal

### Rules of Cross-Domain Access

> **✅ DO**: Read Vishal's tables using Prisma in **your own** repository files.  
> **❌ DON'T**: Import Vishal's `.service.js` or `.repository.js` files ever.

This keeps the codebase clean — each person's code is independently understandable and testable.

### Tables Aary Reads from Vishal's Domain

| Table | Why we need it | Where we use it |
|-------|---------------|-----------------|
| `users` | Campaign targeting — filter by `business_type`, `country_code`, `preferred_language` | `campaigns.repository.js` |
| `user_devices` | Get FCM tokens to send push to | `campaigns.repository.js` |
| `products` | FK reference — documents, testimonials, FAQs link to products | Read-only references |
| `categories` | FK reference — documents link to categories | Read-only references |

### The Campaign Targeting Logic

When an admin fires `POST /admin/campaigns/:id/send` with e.g. `target_type=COUNTRY`, `target_value=IN`:

```
campaigns.repository.js directly queries:

1. SELECT id FROM users WHERE country_code = 'IN'
2. SELECT fcm_token FROM user_devices WHERE user_id IN (...) AND is_active = true
3. Deduplicate tokens
4. Split into batches of max 500
5. Call Firebase FCM for each batch
6. Mark failed/unregistered tokens as is_active=false in user_devices
7. Update campaign status to SENT
8. Return { targetCount, successCount, failureCount }
```

All of this is in `src/modules/campaigns/campaigns.repository.js` — Vishal's module files are never imported.

---

## Part 9 — Key Coding Rules (Read Before Writing Anything)

1. **Prisma ONLY in repositories.** Controllers, services, and validators are Prisma-free.

2. **Every mutation calls auditService.** No exceptions. One call at the end of every write operation.

3. **Never hard-delete content.** Use `is_published = false` (CMS content) or `is_active = false` (operational entities). The only time `DELETE` is acceptable is on infrastructure records like refresh tokens.

4. **Cross-domain reads go through YOUR own repository.** Never `require('../../../other-module/repo')`.

5. **asyncHandler wraps every async controller method.** This ensures unhandled promise rejections reach `errorHandler`.

6. **ApiError.validation() for bad input, ApiError.notFound() for missing records.** Never throw plain `new Error()` from business code.

7. **Password hash — bcrypt only.** Never store, log, or return `password_hash` in any API response.

8. **English fallback always applies.** When resolving translations for a language, always fall back to English if the requested language is missing.

9. **Admin is_active=false means NOTHING works.** When deactivating an admin user, also revoke all their active refresh tokens in the same service call.

10. **`scheduled_at` on campaigns is informational only.** There is no cron job, no queue, no automatic send. The send only happens when an admin explicitly calls the `/send` endpoint.

---

## Part 10 — What Comes Next

### Still to Build (Required for Launch 1, not yet started)

| Feature | Module | Key endpoints |
|---------|--------|--------------|
| Admin Login & Refresh | `admin-auth/` | `POST /admin/auth/login`, `POST /admin/auth/refresh` |
| App Content (Static Pages) | `app-content/` | `GET /content/:key`, `GET /admin/content/:key`, `PUT /admin/content/:key` |
| Audit Logs Read | (new admin route) | `GET /admin/audit-logs` (SUPER_ADMIN) |
| Analytics Aggregate | (new admin route) | `GET /admin/analytics/content` |

### Integration Phase (Days 11–12)
- Pair with Mobile Team (Avni & Vira)
- Replace mock responses in the Flutter app with real backend calls
- Fix any shape mismatches discovered during integration

### Bug Bash (Days 13–14)
Build and run the full integration test suite covering:
- Admin login + role enforcement
- Admin deactivation + token revocation
- CMS draft → publish workflow
- Campaign targeting (all 4 target types)
- FCM send with batch splitting (1001 tokens = 3 batches)
- Audit log trail on mutations
- Feedback CSV export

### API Docs + README (Day 15)
- Finalize Swagger/OpenAPI covering all endpoints
- Export Postman collection
- Write README with setup, env vars, architecture notes

### Contract Freeze (Day 16)
After Day 16 — **no more API shape changes.** The mobile team will rely on the frozen contract.

---

## Part 11 — Local Setup

### Prerequisites
- Node.js 24 (`nvm install 24 && nvm use 24`)
- Docker (for local PostgreSQL) or a Neon.tech account
- Firebase project (for file uploads and FCM push — can run without for basic dev)

### Steps
```bash
# 1. Clone and enter
git clone <repo-url> && cd camso-backend

# 2. Install all dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — fill in DATABASE_URL and JWT secrets at minimum

# 4. Start local Postgres (skip if using Neon)
docker compose up -d

# 5. Generate the Prisma client (required after any schema change)
npm run prisma:generate

# 6. Apply database migrations
npm run prisma:migrate

# 7. Start the dev server (auto-restarts on file changes)
npm run dev
# → http://localhost:4000
# → Swagger UI: http://localhost:4000/api/docs
```

### Environment Variables

| Variable | Required | What for |
|----------|----------|---------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | Port number (default 4000) |
| `DATABASE_URL` | Yes | Postgres connection string |
| `JWT_ACCESS_SECRET` | Yes | Signs access tokens — keep secret |
| `JWT_REFRESH_SECRET` | Yes | Signs refresh tokens — keep secret |
| `JWT_ACCESS_EXPIRES_IN` | Yes | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_DAYS` | Yes | e.g. `30` |
| `FIREBASE_PROJECT_ID` | FCM/Storage only | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | FCM/Storage only | Service account email |
| `FIREBASE_PRIVATE_KEY` | FCM/Storage only | ⚠️ Store with `\n`, not real newlines |
| `FIREBASE_STORAGE_BUCKET` | File uploads only | Firebase bucket name |
| `CORS_ORIGINS` | Yes | Allowed origins, comma-separated |
| `LOG_LEVEL` | Yes | `info` for dev, `warn` for prod |

> ⚠️ **Firebase private key gotcha**: The key contains embedded newlines. Store it in `.env` as one line with literal `\n` sequences (not real line breaks). The code in `src/config/firebase.js` automatically unescapes them with `.replace(/\\n/g, '\n')` before passing to the SDK.

### Running Tests
```bash
npm test                  # All tests
npm run test:unit         # Unit tests only (fast, no DB needed)
npm run test:integration  # Integration tests (needs DB)
npm run test:coverage     # With coverage report
```

---

## Part 12 — Quick Reference

```bash
npm run dev               # Start dev server
npm test                  # Run test suite
npm run prisma:generate   # Regenerate Prisma client after schema changes
npm run prisma:migrate    # Apply schema migrations to DB
npm run prisma:studio     # Open visual database browser
npm run prisma:validate   # Validate schema files (no DB needed)
```

```
Health:      GET /api/v1/health
Readiness:   GET /api/v1/ready
Swagger UI:  GET /api/docs
```

---

> **Source of truth**: If anything in this document conflicts with `docs/CAMSO_Backend_Plan.md` — **the plan file always wins.** Update the plan first, then update this doc.
