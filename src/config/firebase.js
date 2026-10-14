'use strict';

/**
 * src/config/firebase.js
 *
 * Centralized Firebase Admin SDK initialization.
 * Provides a clean infrastructure boundary for FCM messaging and Storage uploads.
 *
 * Safety & Fallback Behavior:
 * - If FIREBASE_* environment variables are missing (e.g. pending CEAT credentials),
 *   initialization gracefully degrades: isFirebaseReady = false, firebaseApp = null.
 * - Fixes the escaped \\n newline gotcha in FIREBASE_PRIVATE_KEY.
 * - Feature modules (mediaUpload, fcmService) check isFirebaseReady and execute
 *   their safe local/mock fallback path when offline.
 */

const admin = require('firebase-admin');

let firebaseApp = null;
let isFirebaseReady = false;

function initFirebase(env = process.env) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  let privateKey = env.FIREBASE_PRIVATE_KEY;
  const storageBucket = env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    firebaseApp = null;
    isFirebaseReady = false;
    return { firebaseApp, isFirebaseReady };
  }

  // Handle escaped newlines in PEM private key
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    // If an app already exists with default name, reuse it
    if (admin.apps.length > 0) {
      firebaseApp = admin.app();
    } else {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: storageBucket || `${projectId}.appspot.com`,
      });
    }
    isFirebaseReady = true;
  } catch (err) {
    // Log warning and fallback gracefully — do not crash the API server
    console.warn(`[Firebase] Initialization warning: ${err.message}. Running in mock/offline mode.`);
    firebaseApp = null;
    isFirebaseReady = false;
  }

  return { firebaseApp, isFirebaseReady };
}

// Auto-initialize on module load
initFirebase(process.env);

function getFirebaseApp() {
  return firebaseApp;
}

function getIsFirebaseReady() {
  return isFirebaseReady;
}

function getStorageBucket() {
  if (!isFirebaseReady || !firebaseApp) return null;
  return firebaseApp.storage().bucket();
}

function getMessaging() {
  if (!isFirebaseReady || !firebaseApp) return null;
  return firebaseApp.messaging();
}

module.exports = {
  initFirebase,
  getFirebaseApp,
  getIsFirebaseReady,
  getStorageBucket,
  getMessaging,
};
