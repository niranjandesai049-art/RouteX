import { useState, useCallback } from 'react';
import auth from '@react-native-firebase/auth';
import { FirebaseAuthService } from '../services/firebase/firebaseAuth.service';
import { AuthApi } from '../api/auth.api';
import { SecureStorage } from '../services/secureStorage';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/slices/authSlice';
import { setDriverProfile } from '../redux/slices/driverSlice';
import { socketService } from '../services/socket/socketService';
import { FcmService } from '../services/firebase/fcmService';

export type OtpFlowState =
  | 'idle'
  | 'sending'
  | 'otp_sent'
  | 'verifying'
  | 'syncing'
  | 'success'
  | 'error';

interface UseFirebaseAuthReturn {
  state: OtpFlowState;
  error: string | null;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  resetState: () => void;
}

/**
 * useFirebaseAuth — encapsulates the full Firebase Phone OTP → Backend JWT flow.
 *
 * Usage:
 *   const { state, error, sendOtp, verifyOtp } = useFirebaseAuth();
 */
export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const dispatch = useDispatch();
  const [state, setState] = useState<OtpFlowState>('idle');
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  /**
   * Step 1: Send OTP via Firebase
   */
  const sendOtp = useCallback(async (phone: string) => {
    try {
      setState('sending');
      setError(null);
      await FirebaseAuthService.sendOtp(phone);
      setState('otp_sent');
    } catch (err: any) {
      const message =
        err?.code === 'auth/invalid-phone-number'
          ? 'Invalid phone number. Please enter a valid 10-digit number.'
          : err?.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : err?.message || 'Failed to send OTP. Please try again.';
      setError(message);
      setState('error');
      throw err; // throw so components can await and know it failed
    }
  }, []);

  /**
   * Step 2: Verify OTP, get Firebase ID token, exchange for backend JWT
   */
  const verifyOtp = useCallback(
    async (otp: string) => {
      try {
        setState('verifying');
        setError(null);

        // Verify with Firebase (uses global session in service)
        await FirebaseAuthService.verifyOtp(otp);

        // Get ID token
        setState('syncing');
        const idToken = await FirebaseAuthService.getIdToken();
        if (!idToken) {
          throw new Error('Failed to retrieve Firebase ID token.');
        }

        // Exchange for backend JWT
        const response = await AuthApi.firebaseSync(idToken);
        const { token, refreshToken, profile } = response;

        // Persist to Redux + SecureStorage
        dispatch(
          setCredentials({
            token,
            refreshToken,
            driverId: profile.id,
            name: `${profile.first_name} ${profile.last_name}`.trim(),
            firebaseUid: auth().currentUser?.uid || null,
          }),
        );
        dispatch(
          setDriverProfile({
            id: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            email: profile.email,
            phone: profile.phone,
            licenseNumber: profile.license_number,
            experienceYears: profile.experience_years,
            status: profile.status as any,
            vehicle: profile.vehicle,
          }),
        );

        await SecureStorage.saveTokens(token, refreshToken);
        socketService.connect(profile.id, token);
        await FcmService.getFcmTokenAndSync();

        setState('success');
      } catch (err: any) {
        const message =
          err?.code === 'auth/invalid-verification-code'
            ? 'Incorrect OTP. Please check and try again.'
            : err?.code === 'auth/code-expired'
            ? 'OTP has expired. Please request a new one.'
            : err?.code === 'auth/session-expired'
            ? 'OTP session expired. Please go back and try again.'
            : err?.message || 'Verification failed. Please try again.';
        setError(message);
        setState('error');
        throw err;
      }
    },
    [dispatch],
  );

  return { state, error, sendOtp, verifyOtp, resetState };
}
