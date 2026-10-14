'use strict';

/**
 * Unit tests for src/config/firebase.js
 */

const { initFirebase, getIsFirebaseReady, getStorageBucket, getMessaging } = require('../../src/config/firebase');

describe('Firebase Configuration & Fallback (src/config/firebase.js)', () => {
  it('gracefully degrades to offline/mock mode when credentials are not configured', () => {
    const { firebaseApp, isFirebaseReady } = initFirebase({});
    expect(firebaseApp).toBeNull();
    expect(isFirebaseReady).toBe(false);
    expect(getIsFirebaseReady()).toBe(false);
    expect(getStorageBucket()).toBeNull();
    expect(getMessaging()).toBeNull();
  });

  it('handles escaped newline sequences in FIREBASE_PRIVATE_KEY without throwing', () => {
    // When credentials contain escaped newlines but are invalid PEM strings, it logs a warning and falls back
    const { isFirebaseReady } = initFirebase({
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_CLIENT_EMAIL: 'test@camso.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7\\n-----END PRIVATE KEY-----\\n',
    });
    expect(isFirebaseReady).toBe(false);
  });
});
