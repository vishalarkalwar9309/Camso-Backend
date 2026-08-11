'use strict';

/**
 * src/config/firebase.js
 *
 * WHAT THIS FILE DOES:
 *   Initializes the Firebase Admin SDK and exports the app instance.
 *   Provides a clean infrastructure boundary so all Firebase usage (FCM, Storage)
 *   goes through this single initialized instance.
 *
 * OVERALL DESIGN:
 *   Firebase Admin SDK is initialized once. Feature modules (campaigns, mediaUpload)
 *   import this module — they never call admin.initializeApp() themselves.
 *   If credentials are missing, initialization is skipped and a warning is logged;
 *   the app remains testable without real Firebase credentials.
 *
 * ELEMENTS:
 *   firebaseApp      — initialized firebase-admin App instance (or null)
 *   isFirebaseReady  — boolean flag for readiness check
 *
 * CRITICAL GOTCHA (documented in master plan Section 10):
 *   FIREBASE_PRIVATE_KEY contains real newlines in the actual private key,
 *   but .env parsers store them as escaped \\n sequences.
 *   This file converts \\n → real newlines before passing to the Admin SDK.
 *   Failure to do this causes "error:0909006C:PEM routines" errors at runtime.
 *
 * FINAL OUTPUT:
 *   module.exports = { firebaseApp, isFirebaseReady }
 *
 * IMPORTED BY:
 *   src/core/utils/mediaUpload.js (Storage uploads)
 *   src/modules/campaigns/campaigns.service.js (FCM sends)
 *   src/server.js (/ready endpoint)
 *
 * REFERENCE: docs/CAMSO_Backend_Plan.md Section 10 (FIREBASE_PRIVATE_KEY gotcha)
 *            docs/CAMSO_Backend_Plan.md Section 14 (Firebase ownership)
 */

const admin = require('firebase-admin');
const config = require('./index');

let firebaseApp = null;
let isFirebaseReady = false;

/**
 * initializeFirebase
 *
 * USE: Initializes Firebase Admin SDK using credentials from environment config.
 *      Called once at module load time.
 *
 * HOW IT WORKS:
 *   1. Checks that all three required Firebase credentials are present.
 *   2. Unescapes \\n sequences in FIREBASE_PRIVATE_KEY (the critical gotcha).
 *   3. Calls admin.initializeApp() with service account credentials.
 *   4. Sets isFirebaseReady = true on success.
 *   5. On failure (missing creds or init error), logs a warning and continues.
 *      The app is still usable without Firebase — FCM/upload routes will fail
 *      gracefully at the point of use.
 *
 * CONCEPTS: Firebase Admin SDK initialization, PEM key newline handling.
 *
 * BEFORE: admin SDK uninitialized.
 * AFTER:  admin SDK ready for FCM and Storage calls, or warning logged if skipped.
 */
function initializeFirebase() {
  const { projectId, clientEmail, privateKey, storageBucket } = config.firebase;

  if (!projectId || !clientEmail || !privateKey) {
    // Not an error during local development without Firebase credentials.
    // The /ready endpoint will report Firebase as not initialized.
    console.warn(
      '[Firebase] Credentials not configured. FCM and Storage features will be unavailable. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.',
    );
    return;
  }

  try {
    // CRITICAL: Unescape \\n sequences stored in .env to real newlines.
    // See docs/CAMSO_Backend_Plan.md Section 10.
    const unescapedKey = privateKey.replace(/\\n/g, '\n');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: unescapedKey,
      }),
      storageBucket: storageBucket || undefined,
    });

    isFirebaseReady = true;
  } catch (err) {
    console.error('[Firebase] Initialization failed:', err.message);
    // Do not re-throw — app can still serve non-Firebase routes.
  }
}

// Initialize at module load.
initializeFirebase();

module.exports = { firebaseApp, isFirebaseReady, admin };
