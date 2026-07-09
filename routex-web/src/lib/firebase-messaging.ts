import { app } from './firebase';
import axios from 'axios';

// Helper to register the service worker dynamically with environment parameters to avoid hardcoding
const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
    };

    const queryParams = new URLSearchParams(config).toString();
    const swUrl = `/firebase-messaging-sw.js?${queryParams}`;

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/firebase-cloud-messaging-push-scope',
    });
    console.log('FCM Service Worker registered successfully with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('FCM Service Worker registration failed:', error);
    return null;
  }
};

// Reusable NotificationService to manage FCM permission request and token registry
export const NotificationService = {
  /**
   * Request push notification permission and return FCM token if granted.
   * Sends the token securely to backend database.
   */
  async requestPermissionAndGetToken(userId: string, authToken: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      // Dynamically import messaging module to prevent SSR/hydration issues during Next.js builds
      const { getMessaging, getToken } = await import('firebase/messaging');
      const messaging = getMessaging(app);

      // Register the service worker dynamically
      const serviceWorkerRegistration = await registerServiceWorker();
      if (!serviceWorkerRegistration) {
        throw new Error('FCM Service Worker registration failed');
      }

      const fcmToken = await getToken(messaging, {
        serviceWorkerRegistration,
      });

      if (fcmToken) {
        console.log('FCM Registration Token generated successfully:', fcmToken);
        await this.saveTokenToBackend(userId, fcmToken, authToken);
        return fcmToken;
      } else {
        console.warn('No FCM registration token returned.');
        return null;
      }
    } catch (error) {
      console.error('Error requesting permission and getting FCM token:', error);
      return null;
    }
  },

  /**
   * Send FCM token securely to the NestJS backend
   */
  async saveTokenToBackend(userId: string, fcmToken: string, authToken: string): Promise<void> {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    try {
      await axios.put(
        `${backendUrl}/users/${userId}/fcm`,
        { fcmToken },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      console.log('FCM Token successfully synchronized with backend database.');
    } catch (error) {
      console.error('Failed to save FCM token to backend database:', error);
    }
  },

  /**
   * Listen for foreground messages and execute callback
   */
  async onMessageReceived(callback: (payload: any) => void): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const { getMessaging, onMessage } = await import('firebase/messaging');
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        console.log('Received foreground message:', payload);
        callback(payload);
      });
    } catch (error) {
      console.error('Failed to register foreground message handler:', error);
    }
  },
};
