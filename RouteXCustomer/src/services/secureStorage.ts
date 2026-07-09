import * as Keychain from 'react-native-keychain';

export class SecureStorage {
  static async saveTokens(
    token: string,
    refreshToken: string,
  ): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(
        'tokens',
        JSON.stringify({ token, refreshToken }),
        {
          service: 'routex.driver.auth',
        },
      );
      return true;
    } catch (err) {
      console.error('SecureStorage save failed:', err);
      return false;
    }
  }

  static async getTokens(): Promise<{
    token: string;
    refreshToken: string;
  } | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'routex.driver.auth',
      });
      if (credentials) {
        return JSON.parse(credentials.password);
      }
      return null;
    } catch (err) {
      console.error('SecureStorage load failed:', err);
      return null;
    }
  }

  static async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: 'routex.driver.auth' });
      return true;
    } catch (err) {
      console.error('SecureStorage clear failed:', err);
      return false;
    }
  }

  static async saveFcmToken(fcmToken: string): Promise<boolean> {
    try {
      await Keychain.setGenericPassword('fcm_token', fcmToken, {
        service: 'routex.driver.fcm',
      });
      return true;
    } catch (err) {
      console.error('SecureStorage save FCM failed:', err);
      return false;
    }
  }

  static async getFcmToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'routex.driver.fcm',
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (err) {
      console.error('SecureStorage load FCM failed:', err);
      return null;
    }
  }

  static async clearFcmToken(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: 'routex.driver.fcm' });
      return true;
    } catch (err) {
      console.error('SecureStorage clear FCM failed:', err);
      return false;
    }
  }
}
