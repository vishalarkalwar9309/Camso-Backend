# CAMSO Developer Setup & Operational Instructions

> **Document Version:** 1.0.0  
> **Target Audience:** Development Team & Handover Engineer (Aary / Vishal)  
> **Status:** Active & Verified Baseline  
> **Last Verified:** October 2026  

---

## 1. Overview & System Topology

CAMSO by CEAT is an industrial tyre and track catalogue, dealer discovery, and document management platform consisting of three primary subsystems:

1. **Flutter Mobile Application** (`Frontend`): Cross-platform client for Android, iOS, and Web providing customer catalogue browsing, product updates, technical datasheet download/sharing, and dealer location services.
2. **Node.js/Express REST API** (`camso-backend`): Centralized business logic, JWT session management, role-based access control (RBAC), and Supabase PostgreSQL / Storage integration.
3. **React/Vite Admin CMS** (`camso-backend/admin-dashboard`): Administrative single-page application (SPA) for managing products, categories, documents, and customer feedback.

---

## 2. Repository Layout & Git Boundaries

| Component | Working Directory | Associated Git Repository & Remote | Active Branch | Current HEAD / Status |
| :--- | :--- | :--- | :--- | :--- |
| **Flutter Mobile App** | `C:\Users\visha\OneDrive\Desktop\CEAT\Frontend` | *Local directory — see Git publication plan in Section 13* | N/A (untracked workspace) | Verified 118 passing tests; 0 analyze issues |
| **Full-Stack Monorepo** | `C:\Users\visha\OneDrive\Desktop\CEAT\Camso` | `https://github.com/vishalarkalwar9309/Camso.git` | `main` | `58fdde3` (Clean working tree) |
| **Express Backend & CMS** | `C:\Users\visha\OneDrive\Desktop\CEAT\camso-backend` | `https://github.com/vishalarkalwar9309/Camso-Backend.git` | `feature/supabase-render-deployment` | `8cab32c` (Deployed to Render) |
| **Inspection / Aary Workspace** | `C:\Users\visha\OneDrive\Desktop\CEAT\inspection_vira_camso_app` | `https://github.com/Vira711/CAMSO-APP.git` | `main` | `d973569` (Preserved intact) |
| **Handover Documentation** | `C:\Users\visha\OneDrive\Desktop\CEAT\CAMSO-HANDOVER` | *Designated documentation root* | N/A | Current handover package |

> [!IMPORTANT]
> `Frontend/` is an active standalone directory where recent document flow and download bug fixes were developed and verified. It is **not** currently initialized as an independent Git repository. For safe publication without disturbing Aary's remote, consult Section 13.

---

## 3. Prerequisites & Environment Requirements

Verify that your workstation satisfies the following software prerequisites before proceeding:

- **Node.js:** v20.x or higher (Tested on Node v24.19.0)
- **npm:** v10.x or higher
- **Flutter SDK:** Flutter 3.47.2 / Dart 3.13.2 (Channel `stable`)
- **Android Studio / Android SDK:**
  - Android SDK Platform 34 or 36
  - Android SDK Command-line Tools
  - Android SDK Build-Tools 34.0.0+
  - Android Emulator: `Medium_Phone_API_36.0` (or physical Android test device)
- **Git:** 2.40+
- **Docker & Docker Compose:** Optional for local PostgreSQL database testing

---

## 4. Flutter Mobile App Setup (`Frontend`)

### 4.1 Dependency Installation
Navigate to the Flutter directory and resolve dependencies:
```bash
cd Frontend
flutter pub get
```

Key runtime packages installed in `pubspec.yaml`:
- `open_filex: ^5.0.0` (Platform native file opening for saved PDFs)
- `share_plus: ^13.3.1` (Cross-platform system share sheet)
- `path_provider: ^2.1.5` (Device filesystem directory resolution)
- `flutter_map: ^7.0.2` & `latlong2: ^0.9.1` (Dealer locator OpenStreetMap engine)
- `geolocator: ^13.0.2` (Device geolocation and proximity calculation)
- `provider: ^6.1.2` (Application state and dependency injection)
- `http: ^1.2.2` (REST network client)

### 4.2 Static Analysis & Quality Gate
Verify code style and ensure 0 lint errors:
```bash
flutter analyze
```
*Expected output:* `No issues found!`

### 4.3 Automated Testing
Execute the comprehensive test suite (118 tests covering unit, widget, navigation, and download flows):
```bash
flutter test
```
*Expected output:* `All tests passed!` (118/118 passed in ~3s).

To run specific test suites:
```bash
# Document catalogue, CUID validation, and download service tests (18 tests)
flutter test test/document_flow_and_download_test.dart

# Dealer locator, navigation links, and distance calculation tests (26 tests)
flutter test test/dealer_support_test.dart

# Fast login, auth state, and guest session tests
flutter test test/gap_closure_test.dart
```

### 4.4 Running the Application
#### A. Connecting to Live Deployed Backend (Default)
By default, `ApiClient.baseUrl` points to Render: `https://camso-backend.onrender.com/api/v1`.
To run on Chrome (Web):
```bash
flutter run -d chrome
```
To run on Android Emulator / Connected Device:
```bash
flutter run -d android
```

#### B. Connecting to Local Development Backend
To route network requests to a local Express server:
```bash
# For Web or Desktop
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4000/api/v1

# For Android Emulator (10.0.2.2 maps to host machine localhost)
flutter run -d Medium_Phone_API_36.0 --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1
```

### 4.5 Android Build & Eventual Release APK Instructions
> [!CAUTION]
> The final release APK is **HELD PENDING EXPLICIT AUTHORIZATION**. Do not distribute or tag release builds until all final stakeholder checks pass.

When authorized, build the release APK using:
```bash
flutter build apk --release --dart-define=API_BASE_URL=https://camso-backend.onrender.com/api/v1
```
Output artifact: `build/app/outputs/flutter-apk/app-release.apk`.

---

## 5. Backend Service Setup (`camso-backend`)

### 5.1 Dependency Installation
```bash
cd camso-backend
npm install
```

### 5.2 Environment Configuration
Create a `.env` file in `camso-backend/` based on `.env.example`:
```bash
cp .env.example .env
```

**Safe `.env` Configuration Template (Placeholders Only — Do Not Commit Real Secrets):**
```ini
# Application Configuration
NODE_ENV=development
PORT=4000

# Database Connection (Local Docker or Supabase Transaction Pooler)
# Local Docker: postgresql://[DB_USER]:[DB_PASSWORD]@[DB_HOST]:5432/[DB_NAME]
# Supabase Pooler: postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[POOLER_HOST]:6543/postgres?pgbouncer=true
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[POOLER_HOST]:6543/postgres?pgbouncer=true"

# Direct URL for Prisma Migrations (Port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[DIRECT_HOST]:5432/postgres"

# JWT Secrets (Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET="<insert_generated_64_byte_hex_secret_here>"
JWT_REFRESH_SECRET="<insert_generated_64_byte_hex_secret_here>"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Security & Rate Limiting
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Supabase Storage Integration (Private Document Bucket)
SUPABASE_URL="https://<your_supabase_project_ref>.supabase.co"
SUPABASE_SECRET_KEY="<insert_supabase_service_role_secret_key_here>"
SUPABASE_STORAGE_BUCKET="Camso documents"
```

### 5.3 Prisma Database Synchronization
Generate the Prisma Client and apply migrations:
```bash
# Generate TypeScript/JavaScript client
npm run prisma:generate

# Apply pending schema migrations (local or dev database)
npm run prisma:migrate

# Optional: Inspect database tables with Prisma Studio GUI
npm run prisma:studio
```

### 5.4 Starting the Server
```bash
# Development mode with hot-reloading (nodemon)
npm run dev

# Production start
npm start
```
*Health Check Endpoint:* `GET http://localhost:4000/api/v1/health`

---

## 6. Admin CMS Setup (`camso-backend/admin-dashboard`)

### 6.1 Installation & Startup
```bash
cd camso-backend/admin-dashboard
npm install
npm run dev
```
The CMS will launch at `http://localhost:5173`.

### 6.2 CMS Environment Variables
Create `camso-backend/admin-dashboard/.env.local`:
```ini
# Point to local backend during development
VITE_API_URL=http://localhost:4000/api/v1

# Or point to deployed Render backend
# VITE_API_URL=https://camso-backend.onrender.com/api/v1
```

> [!NOTE]
> The Admin CMS is a local-first management utility running via Vite. It has **not** been deployed to production hosting (e.g., Vercel or Render Static).

---

## 7. Fast Login & Role-Based Access Guidance

The CAMSO mobile app includes a Fast Login preset selector on the `LoginScreen` (`/login`).

### Supported Personas:
1. **Dealer** (`demo.dealer@camso.local`): Access to dealer-only pricing documents, sales margins, and commercial agreements.
2. **Distributor** (`demo.distributor@camso.local`): Access to distributor logistics handbooks and regional distribution terms.
3. **Employee** (`employee@ceat.com`): Access to internal technical service manuals and employee bulletins.
4. **OEM Partner** (`demo.oem@camso.local`): Access to OEM engineering specifications and tire fitment blueprints.
5. **Admin** (`demo.admin@camso.local`): Administrative privileges.
6. **Guest** (Passwordless): Public catalogue browsing, public datasheets, dealer discovery.

### Safety Design:
- Selecting a demo persona in the UI populates the **email address only**.
- It intentionally does **not** auto-fill passwords in input fields to prevent leaking credentials on shared screens.
- For quick demonstration without typing credentials, `_handleQuickDemoLogin` creates an authenticated session directly using `state.signInAsDemo(role)`.

---

## 8. Dealer Locator Testing & Geolocation

The Dealer Locator is accessible at `/dealers` or via **Support → Find a Dealer**.

### Technical Operation:
- **Map Engine:** `flutter_map` using OpenStreetMap cartographic tiles (`tile.openstreetmap.org`).
- **Coordinate Routing:** Dealers with verified GPS coordinates (`latitude`, `longitude`) open precise Google Maps coordinates:
  `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG&travelmode=driving`
- **Address Fallback:** Unverified dealers fall back safely to formatted address strings:
  `https://www.google.com/maps/dir/?api=1&destination=ADDRESS&travelmode=driving`
- **Location Permissions:** Request handled transparently through `geolocator`. If permission is denied or dismissed, the app defaults gracefully to Frankfurt/Munich central coordinates without crashing.

---

## 9. Document Downloads, PDF Verification & Storage

When a user triggers a document download in `DocumentDetailScreen` or `DocumentCard`:
1. **Authorization Request:** Client sends `GET /api/v1/documents/:id/download`.
2. **Backend Validation:** Validates `id` format (minimum 8 chars, valid CUID), verifies user's JWT role against `document.accessLevel`, generates a signed Supabase download URL, and returns metadata:
   ```json
   {
     "success": true,
     "data": {
       "download_url": "https://...supabase.co/storage/v1/object/sign/Camso%20documents/...",
       "file_name": "xtr_770_datasheet.pdf",
       "mime_type": "application/pdf",
       "file_size_bytes": 4214
     }
   }
   ```
3. **Payload Download & Header Verification:** `DocumentDownloadService` fetches the binary bytes and checks magic bytes `0x25, 0x50, 0x44, 0x46` (`%PDF`). If an XML error or HTML string is received, the download is aborted with a user-friendly error.
4. **Storage Resolution:** On Android, writes to `/storage/emulated/0/Download/<filename>` (publicly visible in the Android "Files" app). Falls back to app document storage if root Downloads is unwritable.
5. **Open & Share:** Emits an action SnackBar with an **OPEN** button (`OpenFilex`) and enables the AppBar **Share** button (`SharePlus`).

---

## 10. Troubleshooting Common Issues

### Issue 1: "Invalid document ID" (HTTP 422)
- **Cause:** Using legacy short IDs (e.g. `'d007'`). The backend validation schema requires a CUID string with `length >= 8`.
- **Solution:** Use authentic Prisma backend CUIDs (e.g., `cmv9jodyx0000uffkydy4c8ij`).

### Issue 2: Empty Document List on Product Detail Screen
- **Cause:** Product ID mismatch between mock dataset (`p006`) and live database CUID (`cmv6j48qd0045ufj88qjrshv8`).
- **Solution:** Ensure `_fetchProductDocuments()` passes the live CUID or registered PID.

### Issue 3: Render Backend Cold Starts (HTTP Timeout)
- **Cause:** Render free-tier web services sleep after 15 minutes of inactivity. Cold start can take 30–50 seconds.
- **Solution:** Client timeout has been increased to 15 seconds. If initial request fails, tap **Retry** once the instance warms up.

### Issue 4: `google_fonts` SocketException in Unit Tests
- **Cause:** `google_fonts` attempts to download TTF fonts from fonts.gstatic.com at test runtime.
- **Solution:** Always set `GoogleFonts.config.allowRuntimeFetching = false;` in test `setUp()`.

---

## 11. Git Branching & Contribution Workflow

To maintain clean repository hygiene:
1. **Main Branch Protection:** Do not push directly to `main` without testing.
2. **Feature Branch Naming:**
   - Flutter features: `feature/flutter-<feature-name>`
   - Backend fixes: `fix/backend-<issue-name>`
3. **Pre-Push Checklist:**
   ```bash
   flutter analyze   # Must report 0 issues
   flutter test      # Must report 118/118 passing
   ```

---

## 12. Safe Deployment & Rollback Instructions

### 12.1 Backend Deployment (Render)
- **Deploys Automatically:** Pushes to `feature/supabase-render-deployment` trigger automatic builds on Render.
- **Current Deployed Commit:** `8cab32c` (Verified healthy and serving requests).
- **Rollback:** In the Render dashboard, select **Deployments** → locate previous stable build → click **Rollback to this deploy**.

### 12.2 Admin CMS
- **Current Status:** Not deployed to hosted production.
- **Build Command:** `npm run build` inside `camso-backend/admin-dashboard`. Generates production static assets in `dist/`.

---

## 13. Required Access & Credentials Checklist for Aary

To obtain complete development access, Aary must request the following credentials from the project owner:

- [ ] **GitHub Access:** Collaborator write permissions to:
  - `https://github.com/vishalarkalwar9309/Camso-Backend.git`
  - `https://github.com/vishalarkalwar9309/Camso.git`
- [ ] **Supabase Access:** Project dashboard access to `https://eysewvsbnfzphvgyvwcw.supabase.co` to inspect tables and storage bucket `Camso documents`.
- [ ] **Render Dashboard Access:** Deployment management access for `camso-backend` service.
- [ ] **Local Secret Values:**
  - `DATABASE_URL` (Supabase connection string)
  - `SUPABASE_SECRET_KEY` (service-role key for backend storage signature generation)
  - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
