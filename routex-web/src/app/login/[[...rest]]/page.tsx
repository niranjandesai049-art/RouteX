'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { ModernLoginSignup } from '../../../components/ui/modern-login-signup';

export default function LoginPage() {
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;

    setLoading(true);
    try {
      const res = await sendPhoneOtp(phone);
      if (res?.verificationId) {
        setVerificationId(res.verificationId);
      }
      if (res?.devOtp) {
        setDevOtp(res.devOtp);
        setOtp(res.devOtp);
      }
      setStep('otp');
      setCooldown(60);
    } catch (err) {
      // Error handled by AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;

    setLoading(true);
    try {
      await verifyPhoneOtp(phone, otp, verificationId);
    } catch (err) {
      // Error handled by AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const res = await sendPhoneOtp(phone);
      if (res?.devOtp) {
        setDevOtp(res.devOtp);
        setOtp(res.devOtp);
      }
      setCooldown(60);
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernLoginSignup
      initialMode="login"
      step={step}
      phone={phone}
      setPhone={setPhone}
      otp={otp}
      setOtp={setOtp}
      devOtp={devOtp}
      loading={loading}
      cooldown={cooldown}
      onSendOtp={handleSendOtp}
      onVerifyOtp={handleVerifyOtp}
      onResendOtp={handleResendOtp}
      onResetStep={() => setStep('phone')}
      onSwitchMode={(mode) => {
        if (mode === 'signup') {
          router.push('/register');
        }
      }}
    />
  );
}
