import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { config } from './config';

let firebaseAppInstance: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (firebaseAppInstance) {
    return firebaseAppInstance;
  }

  if (getApps().length > 0) {
    firebaseAppInstance = getApp();
  } else {
    firebaseAppInstance = initializeApp({
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain,
      projectId: config.firebase.projectId,
      messagingSenderId: config.firebase.messagingSenderId,
      appId: config.firebase.appId,
    });
  }

  // Debug: log Firebase app options vs config to help diagnose OTP/billing issues
  try {
    // Some environments may not include all options on the app instance; use any to access
    const opts: any = (firebaseAppInstance as any).options || {};
    // Print a compact summary to console for debugging in the browser
    console.info('Firebase app initialized:', {
      projectId: opts.projectId || config.firebase.projectId,
      apiKey: opts.apiKey || config.firebase.apiKey,
      authDomain: opts.authDomain || config.firebase.authDomain,
      appId: opts.appId || config.firebase.appId,
    });
    console.info('Client config.firebase:', config.firebase);
  } catch (e) {
    // Non-fatal
    console.warn('Failed to log Firebase app options for debugging', e);
  }

  return firebaseAppInstance;
}

export function getFirebaseAuth(): Auth {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  auth.useDeviceLanguage();
  return auth;
}


