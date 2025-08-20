import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging, deleteToken } from 'firebase/messaging';
import { config } from './config';

let messagingInstance: Messaging | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isVapidKeyWellFormed(vapidKey: string): { valid: boolean; reason?: string } {
  try {
    const keyBytes = urlBase64ToUint8Array(vapidKey);
    if (keyBytes.length !== 65) {
      return { valid: false, reason: `Unexpected key length ${keyBytes.length}, expected 65 bytes (uncompressed P-256 public key).` };
    }
    if (keyBytes[0] !== 0x04) {
      return { valid: false, reason: `Unexpected first byte 0x${keyBytes[0].toString(16)}, expected 0x04 (uncompressed point).` };
    }
    return { valid: true };
  } catch (e: any) {
    return { valid: false, reason: `Base64URL decode failed: ${e?.message || e}` };
  }
}

export async function initializeFirebase(): Promise<Messaging | null> {
  try {
    if (!(await isSupported())) {
      console.warn('Firebase messaging is not supported in this browser');
      return null;
    }

    const app = initializeApp({
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain,
      projectId: config.firebase.projectId,
      messagingSenderId: config.firebase.messagingSenderId,
      appId: config.firebase.appId,
    });

    const messaging = getMessaging(app);
    messagingInstance = messaging;
    return messaging;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
}

export function getMessagingInstance(): Messaging | null {
  return messagingInstance;
}

export async function requestFcmToken(serviceWorkerRegistration?: ServiceWorkerRegistration): Promise<string | null> {
  try {
    if (!messagingInstance) {
      const messaging = await initializeFirebase();
      if (!messaging) return null;
    }

    const vapidKeyRaw = config.firebase.vapidKey;
    const vapidKey = (vapidKeyRaw || '').trim().replace(/^"|^'|"$|'$/g, '');
    if (!vapidKey || vapidKey.toLowerCase().includes('your_web_push')) {
      console.error('VAPID key is missing or a placeholder. Set VITE_FIREBASE_VAPID_KEY to your Web Push public key from Firebase Console → Project Settings → Cloud Messaging.');
      return null;
    }
    const formatCheck = isVapidKeyWellFormed(vapidKey);
    if (!formatCheck.valid) {
      console.error('VAPID key appears malformed:', formatCheck.reason);
      return null;
    }

    // Ensure we have a service worker registration
    let swReg: ServiceWorkerRegistration | undefined = serviceWorkerRegistration;
    if (!swReg && 'serviceWorker' in navigator) {
      swReg = await navigator.serviceWorker.ready;
    }

    // Pre-subscribe to push with the VAPID key to surface clearer errors and avoid races
    if (swReg) {
      try {
        const existing = await swReg.pushManager.getSubscription();
        if (!existing) {
          const applicationServerKey = urlBase64ToUint8Array(vapidKey);
          await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        }
      } catch (subscribeError) {
        console.error('PushManager.subscribe failed. This usually means the VAPID public key is invalid for this origin/project or notifications are blocked by the browser/policies.', subscribeError);
        return null;
      }
    }

    const token = await getToken(messagingInstance!, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });
    return token;
  } catch (error: any) {
    if (error?.code === 'messaging/permission-blocked') {
      console.warn('Notifications permission blocked');
      return null;
    }
    if (error?.name === 'AbortError' || /push service error/i.test(String(error?.message))) {
      console.error('Error getting FCM token: Push service error. This usually means the VAPID key is invalid or mismatched for the Firebase project. Verify VITE_FIREBASE_VAPID_KEY matches the Web Push certificates public key for projectId', config.firebase.projectId);
      try {
        // Attempt to delete any existing token and retry once with a fresh subscription
        await deleteToken(messagingInstance!);
        const retryToken = await getToken(messagingInstance!, {
          vapidKey,
          serviceWorkerRegistration,
        });
        return retryToken || null;
      } catch (retryError) {
        console.error('Retry after deleteToken failed:', retryError);
        return null;
      }
    } else {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messagingInstance) return;
  onMessage(messagingInstance, callback);
}


