import { useState, useCallback, useRef } from 'react';
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
  devOtp: string | null;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  resetState: () => void;
}

/**
 * useFirebaseAuth — encapsulates the full Firebase Phone OTP → Backend JWT flow with RouteX backend OTP fallback.
 */
export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const dispatch = useDispatch();
  const [state, setState] = useState<OtpFlowState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [currentPhone, setCurrentPhone] = useState<string>('');

  const isBackendFallbackRef = useRef<boolean>(false);
  const verificationIdRef = useRef<string | undefined>(undefined);

  const resetState = useCallback(() => {
    setState('idle');
    setError(null);
    setDevOtp(null);
    isBackendFallbackRef.current = false;
    verificationIdRef.current = undefined;
  }, []);

  /**
   * Step 1: Send OTP via Firebase (with RouteX Backend Fallback)
   */
  const sendOtp = useCallback(async (phone: string) => {
    try {
      setState('sending');
      setError(null);
      setDevOtp(null);
      setCurrentPhone(phone);

      try {
        await FirebaseAuthService.sendOtp(phone);
        isBackendFallbackRef.current = false;
      } catch (fbErr: any) {
        console.warn('[AUTH] Firebase Phone Auth failed/disabled, falling back to RouteX Backend OTP:', fbErr?.message);
        isBackendFallbackRef.current = true;

        const res = await AuthApi.sendBackendOtp(phone);
        if (res?.verificationId) {
          verificationIdRef.current = res.verificationId;
        }
        if (res?.devOtp) {
          setDevOtp(res.devOtp);
        }
      }

      setState('otp_sent');
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Failed to send OTP. Please try again.';
      setError(Array.isArray(message) ? message[0] : message);
      setState('error');
      throw err;
    }
  }, []);

  /**
   * Step 2: Verify OTP, get credentials, update Redux + SecureStorage
   */
  const verifyOtp = useCallback(
    async (otp: string) => {
      try {
        setState('verifying');
        setError(null);

        let response: any;

        if (isBackendFallbackRef.current) {
          response = await AuthApi.verifyBackendOtp(currentPhone, otp, verificationIdRef.current, 'shipper');
        } else {
          await FirebaseAuthService.verifyOtp(otp);
          setState('syncing');
          const idToken = await FirebaseAuthService.getIdToken();
          if (!idToken) {
            throw new Error('Failed to retrieve Firebase ID token.');
          }
          response = await AuthApi.firebaseSync(idToken);
        }

        const { token, refreshToken, profile } = response;

        dispatch(
          setCredentials({
            token,
            refreshToken,
            driverId: profile.id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
            firebaseUid: auth().currentUser?.uid || null,
          }),
        );
        dispatch(
          setDriverProfile({
            id: profile.id,
            firstName: profile.first_name || 'RouteX',
            lastName: profile.last_name || 'User',
            email: profile.email || '',
            phone: profile.phone || currentPhone,
            licenseNumber: profile.license_number || 'DL-PENDING',
            experienceYears: profile.experience_years || 0,
            status: (profile.status as any) || 'available',
            vehicle: profile.vehicle || null,
          }),
        );

        await SecureStorage.saveTokens(token, refreshToken);
        try {
          socketService.connect(profile.id, token);
          await FcmService.getFcmTokenAndSync();
        } catch {}

        setState('success');
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          (err?.code === 'auth/invalid-verification-code'
            ? 'Incorrect OTP. Please check and try again.'
            : err?.code === 'auth/code-expired'
            ? 'OTP has expired. Please request a new one.'
            : err?.message || 'Verification failed. Please try again.');
        setError(Array.isArray(message) ? message[0] : message);
        setState('error');
        throw err;
      }
    },
    [dispatch, currentPhone],
  );

  return { state, error, devOtp, sendOtp, verifyOtp, resetState };
}
