import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation.types';
import { useFirebaseAuth } from '../../hooks/useFirebaseAuth';
import { FirebaseAuthService } from '../../services/firebase/firebaseAuth.service';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'OTP'>;
  route: RouteProp<RootStackParamList, 'OTP'>;
};

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

export default function OtpScreen({ navigation, route }: Props) {
  const { phone } = route.params;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  const { state, error, devOtp, verifyOtp, sendOtp, resetState } = useFirebaseAuth();

  useEffect(() => {
    if (devOtp && devOtp.length === 6) {
      setOtp(devOtp.split(''));
    }
  }, [devOtp]);

  const loading = state === 'verifying' || state === 'syncing';
  const isSuccess = state === 'success';

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    // Focus first cell
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Navigate to Dashboard on success
  useEffect(() => {
    if (isSuccess) {
      navigation.replace('Dashboard');
    }
  }, [isSuccess, navigation]);

  // Shake animation on error
  useEffect(() => {
    if (state === 'error') {
      Animated.sequence([
        Animated.timing(errorShake, {
          toValue: 10,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(errorShake, {
          toValue: -10,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(errorShake, {
          toValue: 8,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(errorShake, {
          toValue: -8,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(errorShake, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [state]);

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every(d => d !== '') && digit) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(
    (code?: string) => {
      const otpCode = code ?? otp.join('');
      if (otpCode.length < OTP_LENGTH) {
        return;
      }
      verifyOtp(otpCode);
    },
    [otp, verifyOtp],
  );

  const handleResend = async () => {
    if (countdown > 0 || resending) {
      return;
    }
    setResending(true);
    resetState();
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
    try {
      await sendOtp(phone);
      setCountdown(RESEND_COUNTDOWN);
    } catch {
      // error handled in hook
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.content, { opacity: fadeIn }]}>
          {/* Header */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconEmoji}>📱</Text>
          </View>
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
          </Text>

          {/* OTP Boxes */}
          <Animated.View
            style={[
              styles.otpRow,
              { transform: [{ translateX: errorShake }] },
            ]}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpCell,
                  digit ? styles.otpCellFilled : null,
                  state === 'error' ? styles.otpCellError : null,
                ]}
                value={digit}
                onChangeText={text => handleOtpChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </Animated.View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.button,
              (loading || otp.some(d => !d)) && styles.buttonDisabled,
            ]}
            onPress={() => handleVerify()}
            disabled={loading || otp.some(d => !d)}
            activeOpacity={0.85}>
            <Text style={styles.buttonText}>
              {state === 'verifying'
                ? 'Verifying…'
                : state === 'syncing'
                ? 'Setting up your account…'
                : 'Verify OTP'}
            </Text>
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {countdown > 0 ? (
              <Text style={styles.countdown}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                <Text style={styles.resendLink}>
                  {resending ? 'Sending…' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 52,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 32,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  otpCellFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  otpCellError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#64748B',
    fontSize: 14,
  },
  countdown: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  resendLink: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
});
