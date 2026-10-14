# CAMSO Backend — Unified API Specification

**Version:** 1.0.0 (Launch 1 Baseline)  
**Base URL:** `http://localhost:4000/api/v1`  
**Protocol:** REST over HTTP / JSON  
**Authentication Standard:** Bearer JWT in `Authorization: Bearer <token>`  
**Response Standard:** Unified envelope `{ success: boolean, data: any, meta?: object, error?: object }`

---

## 1. System Health & Readiness

### Liveness Probe
- **Endpoint:** `GET /health` and `GET /api/v1/health`
- **Auth:** None (Public)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "timestamp": "2026-10-14T10:55:00.000Z"
    }
  }
  ```

### Readiness Probe
- **Endpoint:** `GET /ready` and `GET /api/v1/ready`
- **Auth:** None (Public)
- **Response `200 OK` (when dependencies operational):**
  ```json
  {
    "success": true,
    "data": {
      "status": "ready",
      "timestamp": "2026-10-14T10:55:00.000Z",
      "checks": {
        "database": "connected",
        "firebase": "unconfigured"
      }
    }
  }
  ```
- **Response `503 Service Unavailable`:** If database connection fails.

---

## 2. Customer Authentication & Profile

### Register Account
- **Endpoint:** `POST /api/v1/auth/register`
- **Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "SecurePassword123",
    "display_name": "John Doe",
    "preferred_language": "en"
  }
  ```
- **Response `201 Created`:** Returns `{ access_token, refresh_token, user }`.

### Customer Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response `200 OK`:** Returns `{ access_token, refresh_token, user }`.

### Guest Sign-In
- **Endpoint:** `POST /api/v1/auth/guest`
- **Body:**
  ```json
  {
    "device_id": "client-device-uuid-1234",
    "platform": "ANDROID"
  }
  ```
- **Response `201 Created` / `200 OK`:** Returns guest session token with `is_guest: true`.

### Customer Profile
- **Endpoint:** `GET /api/v1/users/me`
- **Auth:** Customer Bearer Token
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "cmv...",
      "email": "customer@example.com",
      "display_name": "John Doe",
      "is_guest": false,
      "preferred_language": "en"
    }
  }
  ```

---

## 3. Administrative Authentication (`/api/v1/admin-auth`)

### Admin Login
- **Endpoint:** `POST /api/v1/admin-auth/login`
- **Body:**
  ```json
  {
    "email": "demo.admin@camso.local",
    "password": "<admin-password>"
  }
  ```
- **Response `200 OK`:** Returns `{ access_token, refresh_token, admin: { id, email, role: "SUPER_ADMIN" } }`.

### Admin Self Profile
- **Endpoint:** `GET /api/v1/admin-auth/me`
- **Auth:** Admin Bearer Token
- **Response `200 OK`:** Returns admin identity.

### Admin Users List
- **Endpoint:** `GET /api/v1/admin/admin-users`
- **Auth:** Admin Bearer Token (`SUPER_ADMIN` role required)
- **Response `200 OK`:** Returns paginated list of administrator accounts.

---

## 4. Business Authentication & Portals (Dealer & Distributor)

### Business Login
- **Endpoint:** `POST /api/v1/business-auth/login`
- **Body:**
  ```json
  {
    "email": "demo.dealer@camso.local",
    "password": "<dealer-password>"
  }
  ```
- **Response `200 OK`:** Returns `{ tokens: { access_token, refresh_token }, user, organization }`.

### Scoped Organization Details
- **Endpoint:** `GET /api/v1/business/organization`
- **Auth:** Business Bearer Token (`DEALER` or `DISTRIBUTOR`)
- **Isolation:** Scoped strictly to caller's registered organization.

### Dealer Portal
- **Endpoint:** `GET /api/v1/business/dealer/portal`
- **Auth:** Business Bearer Token (`DEALER` role ONLY; returns `403 Forbidden` for Distributor).

### Distributor Portal
- **Endpoint:** `GET /api/v1/business/distributor/portal`
- **Auth:** Business Bearer Token (`DISTRIBUTOR` role ONLY; returns `403 Forbidden` for Dealer).

---

## 5. Catalogue & Search

### Browse Categories (Hierarchy Tree)
- **Endpoint:** `GET /api/v1/categories`
- **Auth:** Public
- **Response `200 OK`:** Recursive parent-child category tree.

### Browse Products
- **Endpoint:** `GET /api/v1/products?category_id=&q=&sort=&page=1&pageSize=20`
- **Auth:** Public
- **Filtering:** Multi-attribute filtering supported via query params.

### 6-Tier Ranked Search
- **Endpoint:** `GET /api/v1/search?q=camso`
- **Auth:** Public (optional guest/user token for search logging)
- **Ranking Priority:**
  1. Exact PID match
  2. Exact Name match
  3. Prefix Name match
  4. Category Name match
  5. Specification Value match
  6. Partial Description / Keyword match

### Top & Recent Searches
- **Endpoint:** `GET /api/v1/search/popular` (Aggregated hit counts)
- **Endpoint:** `GET /api/v1/search/recent` (Caller's search history)

---

## 6. Bookmarks & Guest-to-Account Synchronization

### Manage Bookmarks
- **List:** `GET /api/v1/bookmarks` (Authenticated user or linked guest device)
- **Add:** `POST /api/v1/bookmarks` (`{ product_id: "cmv..." }`)
- **Delete:** `DELETE /api/v1/bookmarks/:id`

### Guest-to-Account Sync
- **Endpoint:** `POST /api/v1/bookmarks/sync`
- **Auth:** Authenticated User Bearer Token
- **Body:** `{ "guest_token": "<guest-jwt-token>" }`
- **Behavior:** Merges bookmarks from the guest device into the registered user's account, deduplicating existing entries and invalidating conflicting ownership.

---

## 7. Media Uploads & File Management

### Administrative Media Upload
- **Endpoint:** `POST /api/v1/admin/media/upload`
- **Auth:** Admin Bearer Token (`CONTENT_ADMIN`, `MARKETING`, or `SUPER_ADMIN`)
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `file`: Binary file stream (max 50MB; allowed: PDF, JPEG, JPG, PNG, WEBP, MP4, MOV).
  - `folder`: Optional destination directory (`products`, `categories`, `documents`, `banners`, `general`).
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "url": "https://storage.googleapis.com/.../1791975000_tire.png",
      "filename": "1791975000_tire.png",
      "mimetype": "image/png",
      "size": 1048576,
      "is_mock": false
    }
  }
  ```
  *(Returns `is_mock: true` and local path when running in offline/mock development mode).*

---

## 8. Push Notifications & Campaign Delivery

### Dispatch Push Notification
- **Endpoint:** `POST /api/v1/admin/notifications/send`
- **Auth:** Admin Bearer Token (`MARKETING` or `SUPER_ADMIN`)
- **Body:**
  ```json
  {
    "title": "New CAMSO Catalogue Released",
    "body": "Download the latest technical manual from your app.",
    "target_type": "ALL_USERS",
    "data": {
      "screen": "catalogue",
      "categoryId": "cmv..."
    }
  }
  ```
- **Targeting Strategies:**
  - `ALL_USERS`: Dispatches to all active registered devices with FCM tokens.
  - `PLATFORM`: Filter by operating system (`target_value: "ANDROID"` or `"IOS"`).
  - `LANGUAGE`: Filter by customer language preference (`target_value: "en"`, `"fr"`, etc.).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "targetCount": 250,
      "successCount": 248,
      "failureCount": 2,
      "invalidTokensCount": 2,
      "is_mock": true
    }
  }
  ```
  *(Dead tokens identified by FCM provider are automatically deactivated in `user_devices`).*
