import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Vite loads public credentials from your frontend environment configuration files
const firebaseConfig = {
 apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
 authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
 storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
 messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
 appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firebase App Check with reCAPTCHA Enterprise
const appCheckKey = import.meta.env.VITE_FIREBASE_APPCHECK_KEY;
const isDev = import.meta.env.DEV;
const configuredDebugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;

// In local development, only initialize App Check if a debug token has been configured or dev mode is explicitly requested.
// This avoids repeated 403 "App attestation failed" errors when a locally generated debug token is not yet registered in Firebase Console.
if (typeof window !== 'undefined' && appCheckKey && (!isDev || configuredDebugToken || import.meta.env.VITE_ENABLE_DEV_APPCHECK === 'true')) {
  if (isDev) {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = configuredDebugToken || true;
  }

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckKey),
      isTokenAutoRefreshEnabled: !isDev
    });
  } catch (appCheckErr) {
    console.warn('Firebase App Check initialization warning:', appCheckErr);
  }
}

// The default web persistence stack can fall back to in-memory/session storage,
// which iOS standalone PWAs wipe when Safari hands control back after a redirect
// sign-in. Pin persistence to durable storage (IndexedDB, then localStorage) so
// the auth session survives the round-trip. Ordered by preference.
setPersistence(auth, indexedDBLocalPersistence).catch(() =>
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Both unavailable (private mode / storage blocked): keep the default.
  })
);

export const googleProvider = new GoogleAuthProvider();