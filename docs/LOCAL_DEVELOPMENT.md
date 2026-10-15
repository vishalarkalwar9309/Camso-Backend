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

## 5. Demo Accounts Quick Reference

The backend database seed includes pre-configured accounts matching the Flutter client's demo login options:

| Role | Email | Password | Organization / Description |
|---|---|---|---|
| **CAMSO Admin** | `demo.admin@camso.local` | `AdminPassword123!` | CAMSO Central Platform — Full CMS & Admin RBAC |
| **Dealer** | `demo.dealer@camso.local` | `DealerPassword123!` | Alpine Equipment GmbH — Approved dealer portal |
| **Distributor** | `distributor@camso.local` | `DistributorPassword123!` | CEAT Specialty Tires Europe — Distributor network |
| **Employee** | `employee@ceat.com` | `EmployeePassword123!` | CEAT Specialty Tyres Ltd. — Internal staff |
| **OEM Partner** | `oem@caterpillar.partner` | `OemPassword123!` | Caterpillar Global OEM — Fitment guides & specs |
| **End User** | `demo.user@camso.local` | `UserPassword123!` | Registered customer with personal bookmarks |
| **Guest** | *(Device ID auto-generated)* | *(No password)* | Public catalogue, guest bookmarks, calculators |
