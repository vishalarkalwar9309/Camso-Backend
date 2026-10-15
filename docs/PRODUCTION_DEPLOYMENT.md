# CAMSO — Production Deployment & Architecture Guide

This document presents the recommended production deployment architecture, security guidelines, and launch checklist for the CAMSO platform.

---

## 1. Recommended Production Architecture

```
                    ┌──────────────────────────────────────────┐
                    │               END USERS                  │
                    │   (Mobile Apps: Android / iOS / Web)     │
                    └────────────────────┬─────────────────────┘
                                         │
                         HTTPS / TLS 1.3 │
                                         ▼
                    ┌──────────────────────────────────────────┐
                    │          GLOBAL CDN & HOSTING            │
                    │  • Flutter Web: Firebase Hosting         │
                    │  • Mobile: Google Play / Apple App Store │
                    │  • Media Assets: Firebase Cloud Storage  │
                    └────────────────────┬─────────────────────┘
                                         │
                          REST API Calls │ (Bearer JWT)
                                         ▼
                    ┌──────────────────────────────────────────┐
                    │          CANONICAL BACKEND API           │
                    │   Google Cloud Run (Containerized Node)  │
                    │   • Auto-scaling (1 to N instances)      │
                    │   • Strict Production Guards             │
                    │   • FCM Push Transport Engine            │
                    └────────────────────┬─────────────────────┘
                                         │
                                VPC / TLS│
                                         ▼
                    ┌──────────────────────────────────────────┐
                    │          MANAGED POSTGRESQL              │
                    │   Google Cloud SQL / Supabase / AWS RDS  │
                    │   • PostgreSQL 15+ with Prisma ORM       │
                    │   • Automated Daily Backups              │
                    │   • Connection Pooling                   │
                    └──────────────────────────────────────────┘
```

### 1.1 Backend Hosting: Google Cloud Run (Recommended)
- **Rationale**: 
  * Seamless zero-friction integration with existing Firebase project `camso-bucket`.
  * Serverless container runtime scales from zero up to peak load without paying for idle server instances.
  * Native IAM integration with Google Cloud Secret Manager for private keys and database passwords.
  * Automated HTTPS certificates and managed health checks.
- **Alternative**: Render Web Service or AWS ECS Fargate.

### 1.2 Database: Managed PostgreSQL 15+
- **Options**: Google Cloud SQL (PostgreSQL), Supabase, or AWS RDS.
- **Requirements**:
  * Minimum 1 vCPU, 2 GB RAM (for initial production tier).
  * Storage: 20 GB SSD with auto-expansion.
  * Automated automated daily snapshots and point-in-time recovery.
  * Safe production migrations executed via `npx prisma migrate deploy` in CI/CD pipeline.

### 1.3 Frontend Hosting: Firebase Hosting & App Stores
- **Flutter Web**: Deploy to Firebase Hosting (`camso-bucket.web.app`) with single command:
  ```bash
  flutter build web --release
  firebase deploy --only hosting
  ```
- **Android**: Build signed App Bundle:
  ```bash
  flutter build appbundle --release
  ```
- **iOS**: Build IPA via Xcode / Fastlane for TestFlight and App Store submission.

---

## 2. Firebase Services & Spark vs Blaze Evaluation

| Service | Spark Plan (Current) | Blaze Plan (Recommended for Production) | Operational Action |
|---|---|---|---|
| **Storage Bucket** | 5 GB storage, 1 GB/day download egress | $0.026/GB, $0.12/GB egress (unlimited) | Upgrade to Blaze before public launch to avoid hitting 1 GB daily bandwidth cap. |
| **Cloud Messaging (FCM)** | Unlimited free messages | Unlimited free messages | Free on all plans; supported natively. |
| **Cloud Functions** | Not supported | Pay-as-you-go | Needed if background automated jobs (e.g. image thumbnails) are offloaded to cloud triggers. |

---

## 3. Production Environment Configuration

In production, create the following environment variables in your hosting provider's Secret Manager:

```env
# Server Runtime
PORT=8080
NODE_ENV=production

# Database (Replace with production managed connection string with SSL)
DATABASE_URL="postgresql://user:password@prod-db-host:5432/camso?sslmode=require"

# JWT Signing Keys (Generate high-entropy 64-char strings)
JWT_ACCESS_SECRET="<PROD_HIGH_ENTROPY_ACCESS_SECRET>"
JWT_REFRESH_SECRET="<PROD_HIGH_ENTROPY_REFRESH_SECRET>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Security & CORS
ALLOWED_ORIGINS="https://camso-bucket.web.app,https://admin.camso.yourdomain.com"
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200

# Firebase Cloud Storage & FCM (camso-bucket)
FIREBASE_PROJECT_ID="camso-bucket"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@camso-bucket.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET="camso-bucket.appspot.com"
```

---

## 4. Production Security & Quality Gates

The CAMSO backend enforces the following production rules:
1. **No Silent Mock Fallbacks**:
   - In production (`NODE_ENV === 'production'`), file uploads will fail immediately if Firebase Storage is unconfigured or unavailable. It will NEVER save files to local container disk and claim success.
   - FCM campaign dispatches will fail immediately if Firebase credentials are missing; simulated delivery is prohibited.
2. **Strict Role & Tenant Isolation**:
   - Privileged operations (`/admin/*`) require valid Admin JWTs.
   - Business portal endpoints (`/business/*`) verify account approval status (`APPROVED`) server-side.
   - OEM partner endpoints restrict access strictly to authorized OEM technical assets.
3. **HTTP Hardening**:
   - Helmet headers configured (CSP, HSTS, X-Content-Type-Options, Frameguard).
   - Rate limiting prevents brute force authentication attacks.
   - Standardized `ApiResponse` envelopes conceal raw stack traces and internal paths from external clients.

---

## 5. Deployment Step-by-Step Checklist

### Pre-Deployment Verification
- [ ] Ensure all 46 backend test suites pass: `npm test`.
- [ ] Ensure all Flutter tests pass: `flutter test`.
- [ ] Validate Prisma schema and migration consistency: `npx prisma validate`.
- [ ] Confirm no secrets, credentials, or `.env` files are tracked in Git.

### Database Provisioning
- [ ] Provision managed PostgreSQL instance with TLS enabled.
- [ ] Execute production migrations: `npx prisma migrate deploy`.
- [ ] Seed base categories, initial admin account, and document metadata: `npm run db:seed:demo` (or custom production seed).

### Container Build & Deployment
- [ ] Build production Docker image for `camso-backend`:
  ```bash
  docker build -t gcr.io/camso-bucket/camso-backend:v1.0.0 .
  ```
- [ ] Push to Container Registry and deploy to Cloud Run:
  ```bash
  gcloud run deploy camso-backend \
    --image gcr.io/camso-bucket/camso-backend:v1.0.0 \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
  ```
- [ ] Verify health check: `curl https://<service-url>/health` returns `200 OK`.

### Client App Release
- [ ] Update Flutter `ApiClient.baseUrl` to production API endpoint.
- [ ] Build and deploy Web client: `flutter build web --release && firebase deploy --only hosting`.
- [ ] Build and submit Android AAB and iOS IPA for app store review.
