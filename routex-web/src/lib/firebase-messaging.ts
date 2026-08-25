import { api } from './api';

// Initialize Firebase App dynamically only on the client-side
let firebaseApp: any = null;

const getFirebaseApp = async () => {
  if (typeof window === 'undefined') return null;

  if (!firebaseApp) {
    const { initializeApp, getApps } = await import('firebase/app');

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyPlaceholderKeyForRouteXApp12345678',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'routex-india.firebaseapp.com',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'routex-india',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'routex-india.appspot.com',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:abcdef1234567890',
    };

    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
  }

  return firebaseApp;
};

/**
 * Register Firebase Service Worker dynamically and await active readiness
 */
const registerServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyPlaceholderKeyForRouteXApp12345678';
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'routex-india';
      const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(apiKey)}&projectId=${encodeURIComponent(projectId)}`;

      const registration = await navigator.serviceWorker.register(swUrl);
      
      // Wait for the service worker to become active and ready
      const readyRegistration = await navigator.serviceWorker.ready;
      console.log('FCM Service Worker registered and active:', readyRegistration.scope);
      return readyRegistration || registration;
    } catch (err) {
      console.warn('FCM Service Worker registration deferred:', err);
      return null;
    }
  }
  return null;
};

export const NotificationService = {
  /**
   * Request Notification permission and retrieve FCM Token safely
   */
  async requestPermissionAndGetToken(userId: string, authToken: string): Promise<string | null> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this browser environment.');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission was not granted by user.');
        return null;
      }

      const app = await getFirebaseApp();
      if (!app) return null;

      const { getMessaging, getToken } = await import('firebase/messaging');
      const messaging = getMessaging(app);

      const serviceWorkerRegistration = await registerServiceWorker();
      if (!serviceWorkerRegistration) {
        console.warn('No active service worker registration available for FCM.');
        return null;
      }

      let fcmToken: string | null = null;
      try {
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration,
        });
      } catch (tokenErr: any) {
        console.warn('FCM PushManager token subscription notice:', tokenErr.message);
        return null;
      }

      if (fcmToken) {
        console.log('FCM Registration Token generated successfully:', fcmToken);
        await this.saveTokenToBackend(userId, fcmToken, authToken);
        return fcmToken;
      } else {
        console.warn('No FCM registration token returned.');
        return null;
      }
    } catch (error: any) {
      console.warn('FCM permission or token request notification:', error.message);
      return null;
    }
  },

  /**
   * Send FCM token securely to the NestJS backend via api client
   */
  async saveTokenToBackend(userId: string, fcmToken: string, authToken: string): Promise<void> {
    try {
      await api.put(
        `/users/${userId}/fcm`,
        { fcmToken },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      console.log('FCM Token successfully synchronized with backend database.');
    } catch (error: any) {
      console.warn('FCM token synchronization notification:', error.message);
    }
  },

  /**
   * Listen for foreground messages and execute callback
   */
  async onMessageReceived(callback: (payload: any) => void): Promise<() => void> {
    if (typeof window === 'undefined') return () => {};

    const app = await getFirebaseApp();
    if (!app) return () => {};

    const { getMessaging, onMessage } = await import('firebase/messaging');
    const messaging = getMessaging(app);

    return onMessage(messaging, (payload) => {
      console.log('Foreground FCM Message received:', payload);
      callback(payload);
    });
  },

  async onMessageListener(callback: (payload: any) => void): Promise<() => void> {
    return this.onMessageReceived(callback);
  },
};

// Backwards-compatible export alias
export const fcmClient = NotificationService;
