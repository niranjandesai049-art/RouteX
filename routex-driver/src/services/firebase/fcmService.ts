import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { apiClient } from '../../api/apiClient';
import { SecureStorage } from '../secureStorage';
import { store } from '../../redux/store';
import { addNotification } from '../../redux/slices/notificationSlice';

export class FcmService {
  static async requestUserPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS',
          {
            title: 'Notification Permission',
            message:
              'RouteX Driver App needs permission to show push notifications for new load offers and shipment updates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('POST_NOTIFICATIONS permission denied on Android 13+');
          return false;
        }
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('FCM permission authorized.');
        return true;
      }
      return false;
    } catch (err) {
      console.error('FCM permission request failed:', err);
      return false;
    }
  }

  static async getFcmTokenAndSync(): Promise<string | null> {
    try {
      // Get token
      const token = await messaging().getToken();
      if (token) {
        console.log('Retrieved FCM Device Token:', token);
        // Save FCM token securely
        await SecureStorage.saveFcmToken(token);
        // Sync with backend if authenticated
        const state = store.getState();
        if (state.auth.isAuthenticated) {
          await this.syncTokenWithBackend(token);
        }
        return token;
      }
      return null;
    } catch (err) {
      console.error('Failed to get FCM Device Token:', err);
      return null;
    }
  }

  static async syncTokenWithBackend(fcmToken: string): Promise<boolean> {
    try {
      // Sync with NestJS user profile FCM endpoint
      await apiClient.put('/users/fcm-token', { fcmToken });
      console.log('Successfully synced FCM token with backend.');
      return true;
    } catch (err) {
      console.error('Failed to sync FCM token with backend:', err);
      return false;
    }
  }

  static listenToTokenRefresh() {
    messaging().onTokenRefresh(async token => {
      console.log('FCM Token refreshed:', token);
      await SecureStorage.saveFcmToken(token);
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        await this.syncTokenWithBackend(token);
      }
    });
  }

  static initializeNotificationHandlers() {
    // 1. Foreground Message Handler
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground Push Notification Received:', remoteMessage);

      // Save notification to Redux slice
      if (remoteMessage.notification) {
        store.dispatch(
          addNotification({
            id: remoteMessage.messageId || String(Date.now()),
            title: remoteMessage.notification.title || 'New Update',
            body: remoteMessage.notification.body || 'No description available',
            data: remoteMessage.data as Record<string, string>,
          }),
        );
      }
    });

    // 2. Background / Terminated App Notification Clicks
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        'Notification caused app to open from background state:',
        remoteMessage,
      );
      // Handle navigation or custom redirection if data properties exist
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from terminated state:',
            remoteMessage,
          );
          // Handle initial route routing
        }
      });
  }
}
