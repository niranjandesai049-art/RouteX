import auth from '@react-native-firebase/auth';

// Store the active OTP session globally for the app
let activeConfirmation: any = null;

/**
 * FirebaseAuthService — wraps @react-native-firebase/auth for phone OTP flow.
 * Used exclusively by the Driver App.
 */
export const FirebaseAuthService = {
  /**
   * Send OTP to the given phone number.
   * @param phone 10-digit Indian number (without +91)
   * @returns PhoneAuthListener confirmation object
   */
  async sendOtp(phone: string) {
    const fullPhone = `+91${phone.replace(/\D/g, '')}`;
    activeConfirmation = await auth().signInWithPhoneNumber(fullPhone);
    return activeConfirmation;
  },

  /**
   * Verify the OTP code entered by the driver.
   */
  async verifyOtp(otp: string) {
    if (!activeConfirmation) {
      throw new Error('auth/session-expired');
    }
    const result = await activeConfirmation.confirm(otp);
    activeConfirmation = null; // Clear session on success
    return result;
  },

  /**
   * Get the current Firebase ID token (force-refreshes if expired).
   */
  async getIdToken(): Promise<string | null> {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return null;
    }
    return currentUser.getIdToken(true);
  },

  /**
   * Sign out the current Firebase user.
   */
  async signOut() {
    activeConfirmation = null;
    await auth().signOut();
  },

  /**
   * Returns the current Firebase user, or null if not signed in.
   */
  getCurrentUser() {
    return auth().currentUser;
  },

  /**
   * Subscribe to Firebase auth state changes.
   * Call the returned function to unsubscribe.
   */
  onAuthStateChanged(
    callback: (user: ReturnType<typeof auth>['currentUser'] | null) => void,
  ) {
    return auth().onAuthStateChanged(callback);
  },
};
