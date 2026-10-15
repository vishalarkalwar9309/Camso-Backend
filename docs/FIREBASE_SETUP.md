# CAMSO — Firebase Configuration & Services Guide

This document details the configuration, security boundaries, and operational procedures for Firebase services within the CAMSO platform.

---

## 1. Firebase Project Overview

- **Project Identifier**: `camso-bucket`
- **Default Storage Bucket**: `camso-bucket.appspot.com`
- **Current Plan**: Spark (Free tier)
- **Active Integrations**:
  1. **Firebase Cloud Storage** — Media assets, product brochures, tyre schematics, technical datasheets.
  2. **Firebase Cloud Messaging (FCM)** — Push notifications for campaigns, product updates, and business alerts.
  3. **Client Authentication Architecture** — Retains backend JWT authentication for role-based governance with optional Firebase ID token verification for mobile push registration.

---

## 2. Environment Variables Specification

The Firebase Admin SDK reads the following environment variables (defined in `.env` / production secrets manager):

| Variable Name | Required | Description | Example (Masked) |
|---|---|---|---|
| `FIREBASE_PROJECT_ID` | Yes (Prod) | Google Cloud / Firebase project ID | `camso-bucket` |
| `FIREBASE_CLIENT_EMAIL` | Yes (Prod) | Service account client email | `firebase-adminsdk-xxx@camso-bucket.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Yes (Prod) | Service account private RSA key | `-----BEGIN PRIVATE KEY-----\nMIIEv...` |
| `FIREBASE_STORAGE_BUCKET` | Yes (Prod) | Google Cloud Storage bucket name | `camso-bucket.appspot.com` |

> [!IMPORTANT]
> **Private Key Newline Gotcha**: In `.env` files, multi-line PEM keys often have literal `\n` escape sequences. `src/config/firebase.js` automatically converts literal `\n` to true newlines before initializing credentials.

---

## 3. Firebase Cloud Storage Architecture

### 3.1 Media Upload Pipeline
1. Client submits file via `multipart/form-data` to Express endpoint (e.g. `POST /api/v1/admin/media/upload` or document creation).
2. `multer` memory storage buffers the file in memory up to `50 MB`.
3. Validation checks MIME types against whitelist:
   * **Images**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
   * **Documents**: `application/pdf`
   * **Videos**: `video/mp4`, `video/quicktime`
4. Safe filename generated: `${Date.now()}_${sanitizedOriginalFilename}`.
5. In **Production**:
   * File is uploaded directly to `camso-bucket.appspot.com` using `bucket.file(destination).save()`.
   * Public or signed URL is persisted in `media_assets` or `documents` table.
   * If Firebase Storage is unavailable or unconfigured, an `ApiError.internal` is thrown immediately.
6. In **Local Development**:
   * If credentials are not present, file is saved to local `uploads/` folder and flagged with `is_mock: true`.

---

## 4. Firebase Cloud Messaging (FCM) Architecture

### 4.1 Device Token Lifecycle
1. Flutter client obtains an FCM token from Firebase SDK on physical devices.
2. Flutter registers the device via `POST /api/v1/notifications/devices` with `{ device_id, platform, fcm_token }`.
3. Backend records or updates `user_devices` row with `fcm_token` and `is_active = true`.

### 4.2 Transport Engine & Multicast Batching (`src/core/services/fcmService.js`)
- Tokens are deduplicated per dispatch.
- Grouped into chunks of **500 tokens** (FCM maximum per multicast request).
- Dispatched via `messaging.sendEachForMulticast()`.
- Error analysis identifies permanently dead tokens:
  * `messaging/registration-token-not-registered`
  * `messaging/invalid-registration-token`
- Dead tokens are automatically deactivated in `user_devices` (`is_active = false`).

### 4.3 Phase Seven Guard (No Silent Mock Success)
- In development without credentials, FCM dispatches are simulated and explicitly tagged `is_mock: true`.
- In production (`NODE_ENV === 'production'`), if Firebase messaging is not ready, the engine **refuses** simulated success and reports failure with `is_mock: false` and `successCount: 0`.

---

## 5. Firebase Spark Plan Restrictions & Production Upgrade

The `camso-bucket` project is currently on the **Spark (Free)** plan. Key restrictions:

| Capability | Spark Plan Limit | Blaze Plan (Pay-as-you-go) | Production Recommendation |
|---|---|---|---|
| **Cloud Storage** | 5 GB total storage, 1 GB/day download bandwidth | Exceeds 5 GB at ~$0.026/GB, 360 MB/sec egress | Upgrade to Blaze before launch if catalogue media > 5 GB. |
| **Outbound Networking** | Restricted to Google-owned endpoints | Open outbound HTTP/HTTPS | Required if Cloud Functions need to call external APIs. |
| **Cloud Messaging (FCM)** | Unlimited free messages | Unlimited free messages | Free tier is sufficient for push notifications. |
| **Cloud Functions** | Not available on Spark (requires billing account) | Pay per invocation | Upgrade required if serverless cloud functions are deployed. |

---

## 6. How to Supply Production Credentials Securely

1. In the Firebase Console for `camso-bucket`:
   * Go to **Project Settings** > **Service Accounts**.
   * Click **Generate New Private Key** to download the JSON credentials.
2. In production hosting (e.g. Google Cloud Run or AWS Secrets Manager):
   * Set `FIREBASE_PROJECT_ID` = `camso-bucket`
   * Set `FIREBASE_CLIENT_EMAIL` = Service account email
   * Set `FIREBASE_PRIVATE_KEY` = Service account private key string
   * Set `FIREBASE_STORAGE_BUCKET` = `camso-bucket.appspot.com`
3. Never commit the service account JSON file to Git.
