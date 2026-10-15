# CAMSO — Local Development Guide

This guide details how to set up, run, and test the entire CAMSO platform locally on a developer workstation.

---

## 1. System Prerequisites

Ensure the following tools are installed:
- **Node.js**: v18.x or v20.x LTS
- **npm**: v9.x or later
- **PostgreSQL**: v14.x, v15.x, or v16.x running on port `5432`
- **Flutter SDK**: v3.16.x or later with Dart 3.x
- **Git**: v2.30+

---

## 2. Repository Structure

```
CEAT/
├── camso-backend/             # Canonical Express + Prisma REST API (active feature branch)
├── camso-backend-integrated/  # Verified standalone clone of origin/integrated-backend
├── Frontend/                  # Flutter mobile & web client application
├── Aary's backend/            # Unmodified reference archive (READ-ONLY)
└── docs/                      # Architectural specifications & feature matrix
```

---

## 3. Backend Setup & Startup

### Step 1: Navigate to Backend Directory
```bash
cd C:\Users\visha\OneDrive\Desktop\CEAT\camso-backend
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create or verify `.env` in `camso-backend/`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/camso?schema=public"

# JWT Secrets (Local development secrets)
JWT_ACCESS_SECRET="camso_local_dev_access_secret_do_not_use_in_prod_12345678"
JWT_REFRESH_SECRET="camso_local_dev_refresh_secret_do_not_use_in_prod_12345678"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Firebase Cloud Storage & FCM (Optional in local development; mock fallback enabled)
# FIREBASE_PROJECT_ID="camso-bucket"
# FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@camso-bucket.iam.gserviceaccount.com"
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
# FIREBASE_STORAGE_BUCKET="camso-bucket.appspot.com"
```

### Step 4: Run Database Migrations & Seeds
```bash
# Validate and generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate dev

# Seed demo users, categories, products, documents, and business accounts
npm run db:seed:demo
```

### Step 5: Start Development Server
```bash
npm run dev
```
The backend server will start on `http://localhost:4000`. Test the health check endpoint:
```bash
curl http://localhost:4000/health
```

### Step 6: Run Backend Automated Test Suite
```bash
npm test
```
All 46 test suites and 479 tests should pass.

---

## 4. Frontend Setup & Startup

### Step 1: Navigate to Frontend Directory
```bash
cd C:\Users\visha\OneDrive\Desktop\CEAT\Frontend
```

### Step 2: Fetch Flutter Dependencies
```bash
flutter pub get
```

### Step 3: Run Flutter Automated Tests
```bash
flutter test
```
All widget and RBAC unit tests should pass (26 tests).

### Step 4: Run Application in Browser or Emulator
```bash
# Run on Web (Chrome)
flutter run -d chrome

# Run on Edge
flutter run -d edge

# Run on connected Android / iOS device
flutter run
```

> [!NOTE]
> When running on an Android Emulator, the backend running on your host machine is reached via `http://10.0.2.2:4000/api/v1`. On desktop or iOS simulator, it is reached via `http://localhost:4000/api/v1`.

---

## 5. Demo Accounts & Environment Configuration Quick Reference

The backend database seed (`npm run seed:demo`) configures demo accounts matching the mobile client and Admin CMS. Standardized environment variables in `.env`:

| Experience / Persona | Standard Email Variable | Standard Password Variable | Default Email | Auth Endpoint / Mechanism | Backend Role & Notes |
|---|---|---|---|---|---|
| **End User** | `DEMO_END_USER_EMAIL` | `DEMO_END_USER_PASSWORD` *(fallback: `DEMO_CUSTOMER_PASSWORD`)* | `demo.customer@camso.local` | `POST /api/v1/auth/login` | `User` table (`is_guest: false`). Registered end user with personal bookmarks and VOC feedback. |
| **CAMSO Admin** | `DEMO_ADMIN_EMAIL` | `DEMO_ADMIN_PASSWORD` | `demo.admin@camso.local` | `POST /api/v1/admin-auth/login` | `AdminUser` table (`SUPER_ADMIN`). Full access to Admin CMS, user management, and broadcast dispatch. |
| **Dealer** | `DEMO_DEALER_EMAIL` | `DEMO_DEALER_PASSWORD` | `demo.dealer@camso.local` | `POST /api/v1/business-auth/login` | `BusinessUser` table (`DEALER`, org code `ORG-DEALER-DEMO`). Scoped dealer portal & document access. |
| **Distributor** | `DEMO_DISTRIBUTOR_EMAIL` | `DEMO_DISTRIBUTOR_PASSWORD` | `demo.distributor@camso.local` | `POST /api/v1/business-auth/login` | `BusinessUser` table (`DISTRIBUTOR`, org code `ORG-DISTRIB-DEMO`). Scoped distributor portal access. |
| **OEM Partner** | `DEMO_OEM_EMAIL` | `DEMO_OEM_PASSWORD` | `demo.oem@camso.local` | `POST /api/v1/business-auth/login` | `BusinessUser` table (`OEM_PARTNER`, org code `ORG-OEM-DEMO`). Scoped OEM portal & technical fitment specs. |
| **Employee** | `DEMO_EMPLOYEE_EMAIL` | `DEMO_EMPLOYEE_PASSWORD` | `employee@ceat.com` | Client Fast Login (`demo_mode_employee_token`) | Offline demo persona in mobile app for sales rep walkthroughs. No database table or role. |
| **Guest** | *(None)* | *(Passwordless)* | *(Device ID auto-generated)* | `POST /api/v1/auth/guest` or client session | `User` table (`is_guest: true`). Public catalogue, calculators, dealer locator. |
