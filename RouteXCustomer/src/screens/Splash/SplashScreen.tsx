import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { setCredentials, clearCredentials } from '../../redux/slices/authSlice';
import { setDriverProfile } from '../../redux/slices/driverSlice';
import { SecureStorage } from '../../services/secureStorage';
import { AuthApi } from '../../api/auth.api';
import { FirebaseAuthService } from '../../services/firebase/firebaseAuth.service';
import { socketService } from '../../services/socket/socketService';
import { FcmService } from '../../services/firebase/fcmService';

interface Props {
  /** Called when the splash session check is complete (regardless of outcome). */
  onSplashComplete?: () => void;
  // Keep navigation prop for backward compat (not used in new stack)
  navigation?: any;
}

export function SplashScreen({ onSplashComplete }: Props) {
  const dispatch = useDispatch();
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();

    // Minimum splash display + auth check
    const checkAuth = async () => {
      try {
        // Strategy 1: Firebase session restore
        const firebaseUser = FirebaseAuthService.getCurrentUser();
        if (firebaseUser) {
          console.log('[Splash] Firebase user detected, restoring session...');
          try {
            const idToken = await FirebaseAuthService.getIdToken();
            if (idToken) {
              const response = await AuthApi.firebaseSync(idToken);
              const { token, refreshToken, profile } = response;

              dispatch(
                setCredentials({
                  token,
                  refreshToken,
                  driverId: profile.id,
                  name: `${profile.first_name} ${profile.last_name}`.trim(),
                  firebaseUid: firebaseUser.uid,
                }),
              );
              dispatch(
                setDriverProfile({
                  id: profile.id,
                  firstName: profile.first_name,
                  lastName: profile.last_name,
                  email: profile.email,
                  phone: profile.phone,
                  licenseNumber: profile.license_number || 'DL-PENDING',
                  experienceYears: profile.experience_years || 0,
                  status: profile.status as any,
                  vehicle: profile.vehicle || null,
                }),
              );

              await SecureStorage.saveTokens(token, refreshToken);
              socketService.connect(profile.id, token);
              await FcmService.getFcmTokenAndSync();
              onSplashComplete?.();
              return;
            }
          } catch (firebaseErr) {
            console.warn(
              '[Splash] Firebase session restore failed:',
              firebaseErr,
            );
            // Fall through to keychain check
          }
        }

        // Strategy 2: Keychain token restore (legacy / fallback)
        const tokens = await SecureStorage.getTokens();
        if (tokens?.token) {
          console.log(
            '[Splash] Keychain token found, validating with backend...',
          );
          // Set token so apiClient interceptor can attach it
          dispatch(
            setCredentials({
              token: tokens.token,
              refreshToken: tokens.refreshToken,
              driverId: '',
              name: '',
            }),
          );

          try {
            const profile = await AuthApi.getProfile();

            dispatch(
              setCredentials({
                token: tokens.token,
                refreshToken: tokens.refreshToken,
                driverId: profile.id,
                name: `${profile.first_name} ${profile.last_name}`.trim(),
              }),
            );
            dispatch(
              setDriverProfile({
                id: profile.id,
                firstName: profile.first_name,
                lastName: profile.last_name,
                email: profile.email,
                phone: profile.phone,
                licenseNumber: profile.license_number || 'DL-PENDING',
                experienceYears: profile.experience_years || 0,
                status: profile.status as any,
                vehicle: profile.vehicle || null,
              }),
            );

            socketService.connect(profile.id, tokens.token);
            await FcmService.getFcmTokenAndSync();
            onSplashComplete?.();
            return;
          } catch {
            console.warn('[Splash] Stored token invalid, clearing...');
            dispatch(clearCredentials());
            await SecureStorage.clearTokens();
          }
        }

        // No valid session found — go to login
        console.log('[Splash] No valid session. Redirecting to Login.');
        onSplashComplete?.();
      } catch (err) {
        console.error('[Splash] Auth check failed:', err);
        onSplashComplete?.();
      }
    };

    // Small delay so logo animation plays
    const timer = setTimeout(checkAuth, 800);
    return () => clearTimeout(timer);
  }, [dispatch, onSplashComplete]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeIn, transform: [{ scale: logoScale }] },
        ]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>R</Text>
        </View>
        <Text style={styles.appName}>RouteX</Text>
        <Text style={styles.tagline}>Driver Portal</Text>
      </Animated.View>

      <Animated.View style={[styles.loaderContainer, { opacity: fadeIn }]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoLetter: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  appName: {
    marginTop: 20,
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 80,
  },
});

export default SplashScreen;
