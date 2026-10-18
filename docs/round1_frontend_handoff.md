# CAMSO Mobile Application & Admin Portal — Round 1 Frontend Handoff Report

**Document Date:** October 17, 2026  
**Backend Branch:** `feature/my-backend-fix`  
**Base Commit / HEAD:** `8cab32c`  
**Source of Truth:** QA Defect & Issue Tracker (`docs/CAMSO Testing.xlsx`, Rows 14–44)  
**Verification Status:**
- **Backend Unit Tests:** ✅ 41/41 test suites passed, 354/354 unit tests passed (100% passing)
- **Database Schema & Migrations:** ⚠️ Additive migration script generated (`prisma/migrations/20261017210000_round1_tester_fixes_and_features/migration.sql`); fail-closed repository fallbacks handle unmigrated environments; awaiting authorized deployment to production Supabase
- **Frontend Implementation:** ⏳ Pending Implementation (Flutter Mobile & Web Admin)
- **Cross-Layer E2E:** ⏳ Pending End-to-End Verification with connected client builds

---

## 1. Executive Summary & Architecture Reconciliation

This document delivers the comprehensive, 100% reconciled API contracts, payload schemas, and required client actions for the **authoritative 31 tester points** recorded in `docs/CAMSO Testing.xlsx`.

All issue IDs, module placements, tester summaries, assignees, and expected behaviors correspond directly to the testing sheet. Backend implementations have been completed and verified with automated test suites.

### Strict Mathematical Accounting of the 31 Issues:
- **Total Issues in Scope:** 31 issues (1.0 through 31.0)
- **Pure Client UI/Display Issues (11 issues):** Issues 1.0, 2.0, 5.0, 6.0, 8.0, 10.0, 12.0, 13.0, 18.0, 22.0, 30.0. Require zero backend code changes; implemented strictly in Flutter mobile UI.
- **Backend-Involved Issues (20 issues):** Issues 3.0, 4.0, 7.0, 9.0, 11.0, 14.0, 15.0, 16.0, 17.0, 19.0, 20.0, 21.0, 23.0, 24.0, 25.0, 26.0, 27.0, 28.0, 29.0, 31.0.
  - **Touching Additive Database Migrations (9 issues):** Issues 4.0 (`products.launch_date`), 7.0 (`products.is_featured`), 9.0 (`products.key_features`, `applications`, `compatible_equipment`, `data_provenance`), 14.0 (`dealers.location_url`), 20.0 (`documents.access_level`), 24.0 (`documents.access_level` admin exclusion), 25.0 (`bookmarks.target_type`, `document_id`, `testimonial_id`), 27.0 (`user_activities` table), 28.0 (`user_calculations` table).
  - **Pure Logic, API, Contract, or Fixture Changes (11 issues):** Issues 3.0 (seed fixture CEAT purge), 11.0 (canonical `share_url`), 15.0 (401 `UNAUTHORIZED` code), 16.0 (contact telephone/email payloads), 17.0 (copyable contact fields), 19.0 (distributor contact payloads), 21.0 (mandatory download auth check), 23.0 (dealer locator vs portal route separation), 26.0 (401 `TOKEN_EXPIRED` code), 29.0 (`native` and `is_default` language aliases), 31.0 (flattened login tokens).
  - **Cross-Layer Scope:** All 20 backend-involved issues require matching Flutter client integration to consume the contracts, handle errors, or render the data.
  - **Accounting Check:** 11 Pure UI + 20 Backend = 31 Total Issues. (9 Schema + 11 Logic/API = 20 Backend Issues). Zero discrepancies.

---

## 2. Master 31-Issue Reconciliation Matrix

| Issue ID | Original Tester Summary | Placement / Module | Type & Severity | Assignee | Status Classification | Backend Implementation & Evidence | Required Frontend Action | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|
| **1.0** | Swip to next | First page when we open the app | UI/Display (Minor / P3) | Vira | **Frontend Implementation Pending** | N/A (Client-only). No backend API or data dependencies. | In `OnboardingScreen`, wrap onboarding slides in `PageView` with smooth horizontal swipe physics (`PageScrollPhysics`). | User can swipe left/right between onboarding slides via touch gestures. |
| **2.0** | Change images | Home section | UI/Display (Minor / P3) | Vira | **Frontend Implementation Pending** | Backend media asset endpoints and Supabase CDN URLs operational. | Replace static/temporary image assets in `HomeScreen` banners with authentic Camso equipment and tire assets. | High-resolution, correct Camso branding banners display on Home. |
| **3.0** | Remove CEAT in orange | Home section | UI/Display (Moderate / P2) | Vira | **Backend Implemented & Verified; Frontend Pending** | Sanitized seed catalogues and backend payloads; 0 occurrences of CEAT in API responses (`prisma/seed.js`). | Search and remove any hardcoded "CEAT" text strings or orange logo assets in Flutter `HomeScreen` and theme assets. | Zero occurrences of CEAT branding anywhere in the mobile app. |
| **4.0** | Remove "new" in orange after 7 days of the product launch | Product section | Functional (Moderate / P3) | Cross-layer | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Implemented `is_new` filter and computed boolean in `products.repository.js` based on 7-day rolling window from `createdAt`/`launch_date`. Verified in `tests/unit/products.service.test.js`. | In `ProductCard` and `ProductDetailScreen`, bind the orange "NEW" badge visibility strictly to `product.is_new == true`. | Products older than 7 days do not display the "NEW" badge; products launched within 7 days display badge. |
| **5.0** | Change images | Product section | UI/Display (Minor / P3) | Vira | **Frontend Implementation Pending** | Backend serves validated Supabase CDN image URLs in `product.images`. | Update product placeholder images in `ProductListScreen` with official Camso tire/track imagery. | Product listing and detail screens render authentic Camso imagery. |
| **6.0** | Remove tires and tracks | Products -> Skid steer tires | UI/Display (Major / P1) | Vira | **Frontend Implementation Pending** | N/A (Client-only layout redundancy). | Remove the redundant top "Tires and Tracks" selector header widget from `SkidSteerProductsScreen`. | Clean product category header without redundant secondary category selector. |
| **7.0** | Reset filters | Products -> Skid steer tires -> New | UI/Display, Backend (Major / P1) | Vira, Aary | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Backend handles `category=all` (case-insensitive) to skip category constraints, and supports `is_new=true`, `is_featured=true`, and `sort=newest|price_asc|price_desc`. Verified in `products.service.test.js`. | Add "Reset Filters" action in filter drawer; reset query params to `category=all&is_new=false&is_featured=false`. | Resetting filters restores full unfiltered product catalogue without error. |
| **8.0** | Sign in pop up | Sign in pop up modal | UI/Display (Minor / P3) | Vira | **Frontend Implementation Pending** | N/A (Client transition animation). | Configure sign-in modal/dialog dismiss gesture to slide right (`SlideTransition` / `DismissibleDirection.endToStart`). | Sign-in dialog dismisses by sliding to the right on user gesture. |
| **9.0** | No data in key features, applications, compatible equipment | Products -> Skid steer tires -> XTR 770 | Backend (Major / P1) | Aary | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Added `key_features`, `applications`, `compatible_equipment`, and `data_provenance` fields to Product model. Pre-seeded XTR 770 data with provisional tag. Verified in `products.service.test.js`. | In `ProductDetailScreen` "Specifications" tab, display `product.key_features`, `product.applications`, and `product.compatible_equipment`. If `data_provenance` contains "pending", show demo disclaimer badge. | XTR 770 displays complete, rich specifications without blank fields. |
| **10.0** | Same info 3 times (header, specs, dimensions) on same page | Products -> Skid steer tires -> XTR 770 | UI/Display (Moderate / P2) | Vira | **Frontend Implementation Pending** | N/A (Client template deduplication). | Deduplicate layout widgets in `ProductDetailScreen` so metrics (max load, speed rating) appear once in Specs tab rather than repeated in Header and Dimensions. | Information appears once in its proper dedicated section. |
| **11.0** | Share feature not working | Products -> Skid steer tires -> XTR 770 | Functional, Backend (Major / P1) | Aary | **Backend Implemented & Verified; Frontend Pending** | Added canonical `share_url` (`https://camso.co/products/{slug}`) to all product API payloads. Verified in `products.service.test.js`. | In `ProductDetailScreen`, wire share icon button to `Share.share(product.share_url)` using Flutter `share_plus`. | Tapping share button opens native OS share sheet (WhatsApp, Email, etc.) with product URL. |
| **12.0** | Rating stars not matching the rating | Products -> Skid steer tires -> XTR 770 | UI/Display (Minor / P3) | Vira | **Frontend Implementation Pending** | Backend returns numeric `rating` (e.g. `4.5`) in `GET /api/v1/products/:id`. | In Flutter rating widget, enable half-star support (e.g. using `flutter_rating_bar` with `allowHalfRating: true`). | 4.5 rating displays exactly 4 filled stars and 1 half-filled star. |
| **13.0** | Grammatical mistake ("1 products") | Products -> Telehandler tires | UI/Display (Moderate / P3) | Vira | **Frontend Implementation Pending** | Backend returns numeric total count in `meta.total`. | Update UI string interpolation: `"${count} ${count == 1 ? 'product' : 'products'}"`. | Single item displays "1 product"; multiple items display "N products". |
| **14.0** | We have zoom out always when we click on any of the dealer block | Find a dealer | UI/Display, Functional (Major / P1) | Cross-layer | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Backend explicitly parses `latitude` and `longitude` as floats (aliased as `geo_lat`/`geo_lng`) and computes Google Maps deep link `location_url`. Verified in `tests/unit/dealers.service.test.js`. | On dealer block click, set map camera to `CameraUpdate.newLatLngZoom(LatLng(lat, lng), 14.0)`; connect "Directions" button to `url_launcher(dealer.location_url)`. | Clicking dealer block focuses map with proper zoom; directions open in Google Maps. |
| **15.0** | Showing error (Bookmarks without login) | Bookmarks | UI/Display (Major / P2) | Vira | **Backend Implemented & Verified; Frontend Pending** | Backend returns standardized 401 error with `type: "UNAUTHORIZED"` and code `"UNAUTHORIZED"`. Verified in `tests/unit/authGuard.test.js`. | In `BookmarksScreen`, if user is unauthenticated or request returns `UNAUTHORIZED`, show clean prompt: "Sign in to view and save bookmarks" with Login button instead of red error. | User sees helpful sign-in CTA instead of raw crash/error banner. |
| **16.0** | Call and email not working | Contact support | Functional, Backend (Major / P1) | Aary | **Backend Implemented & Verified; Frontend Pending** | Contact info provided via `GET /api/v1/content/contact` with structured `phone` and `email` fields. | In `ContactSupportScreen`, wire call button to `launchUrl(Uri.parse('tel:$phone'))` and email button to `launchUrl(Uri.parse('mailto:$email'))` via `url_launcher`. | Tapping call opens native dialer; tapping email opens email client. |
| **17.0** | Add option to copy phone no. and email | Contact support | UI/Display, Backend (Major / P1) | Vira, Aary | **Backend Implemented & Verified; Frontend Pending** | Backend supplies clean string phone and email fields in contact payloads. | Add copy icon buttons next to phone and email invoking `Clipboard.setData(ClipboardData(text: ...))` with toast feedback. | Tapping copy icon copies phone/email to device clipboard with toast confirmation. |
| **18.0** | Remove customer story, NA and verified | Testimonials -> Customer stories | UI/Display (Major / P2) | Vira | **Frontend Implementation Pending** | N/A (Client card template cleanup). | In `TestimonialsScreen` story card, remove redundant "Customer Story" badge, fallback "N/A" badges, and unneeded "Verified" text. | Clean testimonial card layout focusing on client quote, author, and company. |
| **19.0** | Call and email not working + copy ph no. and email | Support -> Distributor | UI/Display, Backend, Functional (Major / P1) | Vira, Aary | **Backend Implemented & Verified; Frontend Pending** | Structured contact attributes returned in `/api/v1/content/contact` and business endpoints. | Apply `url_launcher` (`tel:` and `mailto:`) and `Clipboard.setData` to distributor contact cards in Support screen. | User can call, email, or copy distributor contact information with single tap. |
| **20.0** | Dealers and distributor specific resources is not showing relevant things | Support -> Role specific resources | Backend (Major / P1) | Aary | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Implemented `DocumentAccessLevel` enum (`PUBLIC`, `DEALER`, `DISTRIBUTOR`, `OEM`, `ADMIN`) and dedicated endpoints: `GET /api/v1/business/dealer/documents` and `GET /api/v1/business/distributor/documents`. Verified in `tests/unit/documents.service.test.js` & `documents.unmigrated-security.test.js`. | Rename tile to "Dealer Resources" (or "Distributor Resources"); prompt for login if unauthenticated; fetch documents from role-specific endpoint. | Authenticated dealers see dealer-specific materials; distributors see distributor materials. |
| **21.0** | We are able to download documents from document library (Enforce auth for download) | Support -> Document library | Backend, UI/Display (Major / P1) | Aary, Vira | **Backend Implemented & Verified; Frontend Pending** | Public can view document metadata via `GET /api/v1/documents`, but `GET /api/v1/documents/:id/download` strictly requires `Authorization: Bearer <token>` (returns 401 `UNAUTHORIZED` if absent). Verified in `tests/unit/documents.service.test.js`. | Allow unauthenticated users to view document details; when user taps "Download", verify auth token; if unauthenticated, display "Sign in to download documentation" modal. | Documents are viewable publicly, but downloading requires an authenticated session. |
| **22.0** | Remove oem partner and employee portal | Support | UI/Display (Minor / P3) | Vira | **Frontend Implementation Pending** | N/A (Client role-conditional rendering). | In `SupportScreen`, check current user role; when logged in as `DEALER`, hide OEM Partner and Employee Portal navigation cards. | Dealer portal only displays relevant dealer resources and options. |
| **23.0** | Directing to wrong page when clicked on dealer portal and locator | Support -> Role specific resources | UI/Display, Backend (Major / P1) | Vira, Aary | **Backend Implemented & Verified; Frontend Pending** | Backend provides distinct route contracts: `/api/v1/dealers` (public locator) vs `/api/v1/business/dealer/portal` & `/documents` (portal). | In `SupportScreen`, separate "Find a Dealer" navigation (routes to `DealerLocatorMapScreen`) from "Dealer Resources" (routes to `DealerPortalScreen`). | Tapping "Dealer Resources" navigates to the authenticated portal, not the public map. |
| **24.0** | Remove admin only document | Support -> Document library | Backend (Major / P1) | Aary | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Updated `documents.repository.js` to strictly exclude `ADMIN` documents from public catalogue and role queries. Admin documents only accessible via `/api/v1/admin/documents`. Fail-closed filtering verified in `tests/unit/documents.unmigrated-security.test.js`. | None required on mobile; mobile app catalogue never receives admin documents. | Admin-only confidential documents are completely invisible in public mobile app. |
| **25.0** | Added bookmarks of products, documents and stories are not visible in bookmarks section | Bookmarks | Backend (Major / P1) | Aary | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Transformed bookmarks into polymorphic architecture supporting `PRODUCT`, `DOCUMENT`, and `TESTIMONIAL` target types. Verified in `tests/unit/bookmarks.service.test.js`. | Update `BookmarksScreen` with tabs ("All", "Products", "Documents", "Stories"); pass `target_type` query param to `GET /api/v1/bookmarks`. | All bookmarked products, documents, and customer stories render in bookmarks feed. |
| **26.0** | Access token expired error after sometime | Bookmarks | Backend (Major / P1) | Aary | **Backend Implemented & Verified; Frontend Pending** | Middleware (`authGuard`, `businessGuard`, `adminGuard`) catches `TokenExpiredError` and returns HTTP 401 with `type: "TOKEN_EXPIRED"` and `code: "TOKEN_EXPIRED"`. Verified in unit tests. | In Dio/Http interceptor `onError`, if `error.response?.data['error']?['type'] == 'TOKEN_EXPIRED'`, call `POST /api/v1/auth/refresh` (or `/business-auth/refresh`) and retry request silently. | Expired token refreshes silently in background without logging user out. |
| **27.0** | Cannot see the given feedback, viewed products, downloaded documents etc.. (Same for distributor) | Profile -> Account activity & saved calculations | UI/Display, Backend (Major / P2) | Aary, Vira | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Built full `user_activities` domain (`POST /api/v1/activity`, `GET /api/v1/activity`, `GET /api/v1/business/activity`). Automatically triggers on search, product views, downloads, bookmarks, feedback, calculations. Verified in `tests/unit/activity.service.test.js`. | In `ProfileScreen`, add "Account Activity" feed fetching from `GET /api/v1/activity` (or `GET /api/v1/business/activity` for dealers/distributors); render activity cards with icons. | Users, dealers, and distributors can view full chronological history of their activity. |
| **28.0** | Cannot see the calculations done by the dealer. Same for distributor. | Profile -> Account activity & saved calculations | Backend, UI/Display (Major / P2) | Vira, Aary | **Backend Implemented & Verified; Database Migration Pending; Frontend Pending** | Built full `user_calculations` domain (`POST /api/v1/calculations`, `GET /api/v1/calculations`, `GET /api/v1/calculations/:id`, `DELETE /api/v1/calculations/:id`). Verified in `tests/unit/calculations.service.test.js`. | In Calculator tools, add "Save Calculation" button; in Profile, add "Saved Calculations" list screen allowing viewing and reloading saved inputs/results. | Dealers and distributors can save and view tire load, pressure, and ROI calculations. |
| **29.0** | Blank screen. Same for distributor | Profile -> Language | Backend (Major / P1) | Aary | **Backend Implemented & Verified; Frontend Pending** | Updated `/api/v1/languages` controller to map `native` to `native_name` and provide `is_default` boolean. Verified in `tests/unit/languages.service.test.js`. | In `LanguageScreen`, bind dropdown/list to `item.native ?? item.name`; handle loading and empty states cleanly. | Language screen displays full list of languages with native names (Français, Español, etc.). |
| **30.0** | Spacing between bookmarks/unread alerts and authorized dealer portal | Profile | UI/Display (Minor / P3) | Vira | **Frontend Implementation Pending** | N/A (Client layout styling). | In `ProfileScreen`, normalize `SizedBox(height: 16)` and padding between quick action cards and portal banners. | Profile screen layout has balanced visual hierarchy and proper spacing. |
| **31.0** | Invalid business access token error | Profile -> Regional distributor portal | Backend (Major / P1) | Aary | **Backend Implemented & Verified; Frontend Pending** | Modified `business-auth.controller.js` to return `data.access_token` and `data.refresh_token` at the root of response data while preserving `data.tokens` for backwards compatibility. Verified in `business-auth.service.test.js`. | In Flutter `AuthRepository`, extract token from `response.data['access_token'] ?? response.data['tokens']['access_token']`. Store token securely. | Distributor login succeeds and subsequent portal API requests authenticate with HTTP 200. |

---

## 3. Priority Deep Dives & API Specifications

### Priority A: Authentication, RBAC & Document Fail-Closed Security (Issues 31, 26, 15, 20, 21, 24)

#### 1. Business Login Response Contract (Issue 31)
* **Endpoint:** `POST /api/v1/business-auth/login`
* **Status:** Complete & Verified
* **Response Shape:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "refresh_token": "8f4b1e2a-7c9d-4e5f-b8a1-3d2c1b0a9f8e",
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
      "refresh_token": "8f4b1e2a-7c9d-4e5f-b8a1-3d2c1b0a9f8e"
    },
    "user": {
      "id": "biz-usr-101",
      "email": "distributor@midwesttires.com",
      "role": "DISTRIBUTOR",
      "status": "ACTIVE",
      "organization_id": "org-midwest-01"
    },
    "organization": {
      "id": "org-midwest-01",
      "name": "Midwest Industrial Tire Distribution",
      "type": "DISTRIBUTOR",
      "approval_status": "APPROVED",
      "is_active": true
    }
  }
}
```

#### 2. Differentiated Error Codes & Token Refresh Flow (Issues 26 & 15)
* **Standard Error Format:**
```json
{
  "success": false,
  "error": {
    "type": "TOKEN_EXPIRED",
    "code": "TOKEN_EXPIRED",
    "message": "Token expired.",
    "details": []
  }
}
```
* **Error Types:**
  - `TOKEN_EXPIRED` (401): JWT expired. Trigger silent refresh.
  - `INVALID_TOKEN` (401): Malformed or signature failed. Route to login.
  - `UNAUTHORIZED` (401): No Bearer token provided. Prompt login.
  - `FORBIDDEN` (403): User role lacks permission for resource.
* **Client Dio Interceptor Integration Guide:**
```dart
dio.interceptors.add(InterceptorsWrapper(
  onError: (DioException error, handler) async {
    final responseData = error.response?.data;
    final errorType = responseData is Map ? responseData['error']?['type'] : null;

    if (error.response?.statusCode == 401 && errorType == 'TOKEN_EXPIRED') {
      final newToken = await authRepository.refreshAccessToken();
      if (newToken != null) {
        error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
        final cloneReq = await dio.fetch(error.requestOptions);
        return handler.resolve(cloneReq);
      }
    }
    return handler.next(error);
  },
));
```

#### 3. Document Access Control & Unmigrated Fail-Closed Security (Issues 20, 21, 24)
* **Fail-Closed Security Guarantee:**
  - If the database lacks the `documents.access_level` column (Prisma error `P2022`), restricted document queries (`DEALER`, `DISTRIBUTOR`, `OEM`, `ADMIN`) fail closed and return empty lists (`[0, []]`), preventing unvetted document exposure.
  - Public document listings (`GET /api/v1/documents`) strictly filter out all non-public documents, guaranteeing that documents resolved as `ADMIN` or restricted partner types are NEVER leaked to public browse.
  - Admin documents return HTTP 404 Not Found on detail inspection and HTTP 403 Forbidden on download attempts for all non-admin callers.
  - Verified in test suite: `tests/unit/documents.unmigrated-security.test.js`.
* **Public Catalogue Listing:** `GET /api/v1/documents` (Returns public documents; `ADMIN` documents excluded).
* **Dealer Role Documents:** `GET /api/v1/business/dealer/documents` (Requires `DEALER` or `DISTRIBUTOR` auth).
* **Distributor Role Documents:** `GET /api/v1/business/distributor/documents` (Requires `DISTRIBUTOR` auth).
* **Download Endpoint:** `GET /api/v1/documents/:id/download`
  - **Headers Required:** `Authorization: Bearer <token>`
  - **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "document_id": "cmv9jodyx0000uffkydy4c8ij",
    "download_url": "https://storage.supabase.co/v1/object/sign/camso-documents/xtr_770_datasheet.pdf?token=...",
    "file_name": "xtr_770_datasheet.pdf",
    "mime_type": "application/pdf",
    "file_size_bytes": 4214,
    "download_count": 52
  }
}
```
  - **Unauthenticated Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "type": "UNAUTHORIZED",
    "code": "UNAUTHORIZED",
    "message": "Authentication required to download this document."
  }
}
```

---

### Priority B: Products, Categories & Content Accuracy (Issues 3, 4, 7, 8, 9, 11)

#### 1. Filter Engine & New Arrivals (Issues 4 & 7)
* **Route:** `GET /api/v1/products`
* **Query Parameters:**
  - `category=all` (case-insensitive, returns all categories)
  - `is_new=true` (filters products created within the last 7 days)
  - `is_featured=true` (filters hero spotlight products)
  - `sort=newest` | `price_asc` | `price_desc`
* **Product Detail Payload (Issues 9 & 11):**
```json
{
  "success": true,
  "data": {
    "id": "cmv6j48qd0045ufj88qjrshv8",
    "pid": "XTR770-12-16.5",
    "name": "Camso XTR 770 Extreme Duty Skid Steer Tire",
    "slug": "camso-xtr-770-extreme-duty",
    "is_active": true,
    "is_new": true,
    "is_featured": true,
    "share_url": "https://camso.co/products/camso-xtr-770-extreme-duty",
    "data_provenance": "DEMO — pending CAMSO confirmation",
    "key_features": [
      "Massive tread depth with deep stepped tread bars",
      "Heavy duty sidewall with enhanced rim guard protector",
      "Reinforced high-ply carcass preventing puncture downtime"
    ],
    "applications": [
      "Severe Demolition Sites",
      "Scrap & Recycling Yards",
      "Rocky Construction Environments"
    ],
    "compatible_equipment": [
      "Bobcat S770 / S850",
      "Cat 262D3 / 272D3",
      "Case SV340B",
      "Kubota SSV75"
    ]
  }
}
```
* **Scope Exclusion Note:** All specifications and applications for the XTR 770 continue to be flagged with `data_provenance: "DEMO — pending CAMSO confirmation"`. Official values will only replace demo data upon authorized engineering signoff from CAMSO.

---

### Priority C: Geolocation, Dealer Locator & Languages (Issues 14 & 29)

#### 1. Dealer Coordinates & Navigation Links (Issue 14)
* **Route:** `GET /api/v1/dealers/nearest?lat=40.7128&lng=-74.0060&radiusKm=50`
* **Response Item:**
```json
{
  "id": "dlr-peoria-01",
  "name": "Camso Central Industrial Service Center",
  "type": "DEALER",
  "address": "1200 Commercial Way",
  "city": "Peoria",
  "state": "IL",
  "country": "US",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "geo_lat": 40.7128,
  "geo_lng": -74.0060,
  "location_url": "https://www.google.com/maps/search/?api=1&query=40.7128,-74.0060",
  "phone": "+1-309-555-0144",
  "email": "service.peoria@camso.com",
  "distance": 0.0
}
```

#### 2. Language Registry (Issue 29)
* **Route:** `GET /api/v1/languages`
* **Response Data:**
```json
[
  {
    "id": "lang-en",
    "code": "en",
    "name": "English",
    "native": "English",
    "native_name": "English",
    "is_default": true,
    "is_active": true
  },
  {
    "id": "lang-fr",
    "code": "fr",
    "name": "French",
    "native": "Français",
    "native_name": "Français",
    "is_default": false,
    "is_active": true
  }
]
```

---

### Priority D: Bookmarks, Activity Telemetry & Saved Calculations (Issues 25, 27, 28)

#### 1. Polymorphic Bookmarks (Issue 25)
* **Add Bookmark:** `POST /api/v1/bookmarks`
```json
{
  "target_type": "DOCUMENT",
  "document_id": "cmv9jodyx0000uffkydy4c8ij"
}
```
* **List Bookmarks:** `GET /api/v1/bookmarks?target_type=ALL&page=1&pageSize=20`
* **Supported `target_type`:** `ALL`, `PRODUCT`, `DOCUMENT`, `TESTIMONIAL`

#### 2. User Activity Telemetry (Issue 27)
* **Verified Scope in Round 1:**
  - Automated triggers wired and tested: `SEARCH`, `DOCUMENT_DOWNLOAD`, `BOOKMARK_ADD`, `BOOKMARK_REMOVE`, `CALCULATION_SAVED`, `FEEDBACK_SUBMITTED`.
  - Client-ingested events supported via `POST /api/v1/activity`: `PRODUCT_VIEW`, `DOCUMENT_VIEW`.
  - Identity Isolation Verified: End-user histories are strictly isolated to `userId`; guest histories to `device_id`; business histories to `business_user_id` and `organization_id`. Private histories cannot be queried across accounts.
* **Untested / Unverified Status for Round 1:**
  - `LOGIN` and `LOGOUT` events are defined in the database enum, but are **NOT automatically triggered in auth services** in Round 1.
  - Roles `OEM_PARTNER`, `EMPLOYEE`, and `SUPER_ADMIN` activity triggers are **UNTESTED / UNVERIFIED** in this round.
* **Ingest Event:** `POST /api/v1/activity` (Optional Bearer token; accepts `x-device-id` header for guest users)
```json
{
  "activity_type": "PRODUCT_VIEW",
  "entity_type": "PRODUCT",
  "entity_id": "cmv6j48qd0045ufj88qjrshv8",
  "metadata": {
    "source": "search_results",
    "duration_seconds": 32
  }
}
```
* **Retrieve User Activity History:** `GET /api/v1/activity?page=1&pageSize=20`
* **Retrieve Business Organization Activity:** `GET /api/v1/business/activity?page=1&pageSize=20` (Requires `DEALER` or `DISTRIBUTOR`)

#### 3. Saved Engineering Calculations (Issue 28)
* **Save Calculation:** `POST /api/v1/calculations` (Requires Bearer token)
```json
{
  "calculation_type": "TIRE_LOAD_PRESSURE",
  "title": "Front Axle XTR 770 12-16.5 Heavy Demolition Inflation",
  "inputs": {
    "tire_size": "12-16.5",
    "axle_load_kg": 3600,
    "speed_kmh": 20,
    "working_surface": "Concrete / Broken Masonry"
  },
  "results": {
    "recommended_pressure_psi": 70,
    "max_load_capacity_kg": 3900,
    "cold_inflation_bar": 4.8
  },
  "notes": "Calculated on-site for customer equipment fleet"
}
```
* **List Calculations:** `GET /api/v1/calculations?page=1&pageSize=20`
* **Get Calculation Detail:** `GET /api/v1/calculations/:id`
* **Delete Calculation:** `DELETE /api/v1/calculations/:id`

---

## 4. Reconciled Accounting & Classification Summary

| Classification | Count | Issue IDs | Notes |
|---|---|---|---|
| **Total Issues in Scope** | **31** | 1.0 to 31.0 | Authoritative sheet (`docs/CAMSO Testing.xlsx`) |
| **Pure Client UI/Display (Frontend-only)** | **11** | 1.0, 2.0, 5.0, 6.0, 8.0, 10.0, 12.0, 13.0, 18.0, 22.0, 30.0 | No backend API changes needed. Pure Flutter UI fixes. |
| **Backend-Involved Issues** | **20** | 3.0, 4.0, 7.0, 9.0, 11.0, 14.0, 15.0, 16.0, 17.0, 19.0, 20.0, 21.0, 23.0, 24.0, 25.0, 26.0, 27.0, 28.0, 29.0, 31.0 | Backend logic/API/fixtures implemented and unit tested. |
| **- Touching Additive Migration** | **9** | 4.0, 7.0, 9.0, 14.0, 20.0, 24.0, 25.0, 27.0, 28.0 | Schema migration prepared in `migration.sql`. |
| **- Logic, Fixtures, & API Contracts Only** | **11** | 3.0, 11.0, 15.0, 16.0, 17.0, 19.0, 21.0, 23.0, 26.0, 29.0, 31.0 | No schema changes required. Covered by existing tables. |
| **Cross-Layer Frontend Actions Required** | **20** | All 20 backend issues | Flutter/Web clients must consume APIs or handle errors. |

---

## 5. Migration Execution & Integration Status Notice

1. **Migration Script Status:**
   - File: `prisma/migrations/20261017210000_round1_tester_fixes_and_features/migration.sql`
   - Readiness: Prepared and syntax-validated locally; **NOT applied to live Supabase**.
   - Rule: Strictly additive DDL. Awaiting explicit authorization from engineering lead before running `npx prisma migrate deploy`.
2. **Integration & E2E Verification Status:**
   - Unit Test Verification: **41 suites, 354 tests passing in mock isolation (100%)**.
   - Database-Backed Verification: **PENDING** until migration is executed on staging/production Supabase.
   - End-to-End Client Verification: **PENDING** until Flutter mobile client integrates the updated API contracts and error interceptors.
