# CAMSO — API Integration & Contract Guide

This document specifies the REST API contract and client integration architecture connecting the Flutter mobile/web frontend (`Frontend/`) with the canonical Express/Prisma backend (`camso-backend/`).

---

## 1. Architecture Overview

- **Base URL**: `http://localhost:4000/api/v1` (Local Dev) / `https://api.camso.yourdomain.com/api/v1` (Production)
- **Protocol**: HTTP/1.1 & HTTP/2 over TLS in Production
- **Payload Format**: `application/json` (UTF-8)
- **Multipart Uploads**: `multipart/form-data` with `file` field
- **Standard Success Envelope**:
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
- **Standard Paginated Envelope**:
  ```json
  {
    "success": true,
    "data": [ ... ],
    "meta": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3
    }
  }
  ```
- **Standard Error Envelope**:
  ```json
  {
    "success": false,
    "message": "Human-readable description of the error",
    "errors": [ ... ]
  }
  ```

---

## 2. Authentication & Authorization Contracts

### 2.1 Guest Device Registration
- **Endpoint**: `POST /api/v1/auth/guest`
- **Auth**: None (Public)
- **Request**:
  ```json
  {
    "device_id": "camso-dev-1792061831381",
    "platform": "FLUTTER",
    "app_version": "1.0.0"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOi...",
      "device_id": "camso-dev-1792061831381",
      "expires_at": "2026-11-15T00:00:00.000Z"
    }
  }
  ```

### 2.2 End User Authentication
- **Register**: `POST /api/v1/auth/register`
  * Request: `{ "email": "user@example.com", "password": "UserPass123!", "display_name": "John Doe", "phone": "+1234567890" }`
  * Response (`201 Created`): `{ "tokens": { "accessToken": "...", "refreshToken": "..." }, "user": { ... } }`
- **Login**: `POST /api/v1/auth/login`
  * Request: `{ "email": "user@example.com", "password": "UserPass123!" }`
  * Response (`200 OK`): `{ "tokens": { "accessToken": "...", "refreshToken": "..." }, "user": { ... } }`
- **Refresh**: `POST /api/v1/auth/refresh`
  * Request: `{ "refreshToken": "..." }`
  * Response (`200 OK`): `{ "tokens": { "accessToken": "...", "refreshToken": "..." } }`
- **Profile**: `GET /api/v1/users/me`
  * Auth: `Bearer <accessToken>`
  * Response (`200 OK`): User object with profile metadata.

### 2.3 Business Partner Authentication (Dealer, Distributor, OEM Partner)
- **Register (Access Request)**: `POST /api/v1/business-auth/register`
  * Request:
    ```json
    {
      "email": "partner@equipment.com",
      "password": "PartnerPass123!",
      "display_name": "Klaus Schmidt",
      "phone": "+49123456789",
      "business_type": "DEALER", // "DEALER" | "DISTRIBUTOR" | "OEM_PARTNER"
      "company_name": "Alpine Equipment GmbH",
      "tax_id": "DE123456789",
      "territory": "Bavaria, Germany",
      "city": "Munich",
      "country": "Germany"
    }
    ```
  * Note: Registrations are created in `PENDING` state and require CAMSO Administrator approval before privileged portal access is unlocked.
- **Login**: `POST /api/v1/business-auth/login`
  * Request: `{ "email": "partner@equipment.com", "password": "PartnerPass123!" }`
  * Response (`200 OK`):
    ```json
    {
      "success": true,
      "data": {
        "tokens": { "accessToken": "...", "refreshToken": "..." },
        "user": {
          "id": "cmv...",
          "email": "demo.dealer@camso.local",
          "display_name": "Klaus Schmidt",
          "role": "DEALER",
          "organization": {
            "id": "cmv...",
            "name": "Alpine Equipment GmbH",
            "type": "DEALER",
            "status": "APPROVED"
          }
        }
      }
    }
    ```
  * Response (`403 Forbidden`): Returned if business account approval status is `PENDING` or `REJECTED`.

### 2.4 CAMSO Admin Authentication
- **Login**: `POST /api/v1/admin-auth/login`
  * Request: `{ "email": "admin@camso.local", "password": "AdminPassword123!" }`
  * Response (`200 OK`): `{ "tokens": { "accessToken": "..." }, "admin": { "id": "...", "email": "...", "role": "SUPER_ADMIN" } }`

---

## 3. Product Catalogue & Ranked Search

### 3.1 Public Product Listing
- **Endpoint**: `GET /api/v1/products`
- **Query Parameters**:
  * `category` (string, optional): Category slug or ID
  * `q` (string, optional): Keyword query
  * `page` (number, default 1)
  * `pageSize` (number, default 20)
  * `sort` (string, default `newest`): `newest` | `popular` | `name_asc` | `name_desc`
  * `spec_<attribute>` (string, optional): Specification facet filter (e.g. `spec_ply_rating=16PR`)
- **Response** (`200 OK`): Paginated product items with attached images and specifications.

### 3.2 Product Detail
- **Endpoint**: `GET /api/v1/products/:idOrSlug`
- **Response** (`200 OK`): Full product entity with all specifications, category hierarchy, and media assets.

### 3.3 6-Tier Ranked Search
- **Endpoint**: `GET /api/v1/search?q=<query>&limit=20`
- **Search Priority Tiers**:
  1. Exact PID match (e.g. `CAMSO-400`)
  2. Exact Product Name match
  3. Prefix Name match
  4. Category Name match
  5. Specification match (e.g. `17.5-25`, `L-3`)
  6. Description / applications / features match
- **Popular & Recent Queries**:
  * `GET /api/v1/search/popular`: Top searched keywords.
  * `GET /api/v1/search/recent`: User or guest recent queries.

---

## 4. Bookmarks & Synchronization

- **List Bookmarks**: `GET /api/v1/bookmarks` (supports optional `device_id` query parameter for guests).
- **Add Bookmark**: `POST /api/v1/bookmarks` `{ "product_id": "cmv..." }`
- **Remove Bookmark**: `DELETE /api/v1/bookmarks/:productIdOrBookmarkId`
- **Guest-to-Account Synchronization**: `POST /api/v1/bookmarks/sync`
  * Request: `{ "guest_token": "eyJ...", "device_id": "...", "product_ids": ["cmv...", "..."] }`
  * Response (`200 OK`): `{ "success": true, "synced_count": 3 }`

---

## 5. Technical Documents & Downloads

- **Public Document List**: `GET /api/v1/documents?category=&lang=&page=&pageSize=`
- **Document Detail**: `GET /api/v1/documents/:id`
- **Document Download**: `GET /api/v1/documents/:id/download?lang=en`
  * Behavior: Increments `download_count` in database, logs download audit event, and returns redirect (`302`) to CDN/Storage signed URL or streams the document buffer.
- **OEM Technical Documents**: `GET /api/v1/business/oem/documents`
  * Restricted to authenticated users with `OEM_PARTNER` role or `SUPER_ADMIN`.

---

## 6. Feedback, Inquiries, and Content

- **Submit Feedback (VOC)**: `POST /api/v1/feedback`
  * Request: `{ "name": "John", "email": "john@example.com", "rating": 5, "category": "TYRE_PERFORMANCE", "message": "Excellent traction in muddy conditions." }`
  * Response (`201 Created`): `{ "success": true, "id": "cmv..." }`
- **Public FAQs**: `GET /api/v1/faqs?category=`
- **Public Testimonials**: `GET /api/v1/testimonials?featured=true`

---

## 7. Push Notifications & Campaigns

- **Device Registration**: `POST /api/v1/notifications/devices`
  * Request: `{ "device_id": "...", "platform": "ANDROID", "fcm_token": "fcm_token_string..." }`
- **Notification Feed**: `GET /api/v1/notifications?lang=en`
- **Campaign Dispatch (Admin Only)**: `POST /api/v1/admin/campaigns/:id/send`
  * Triggers chunked multicast dispatch via FCM (500 tokens per batch).
  * Automatically deactivates unregistered/invalid FCM tokens.
