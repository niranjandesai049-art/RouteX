'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { ModernLoginSignup } from '../../../components/ui/modern-login-signup';

export default function RegisterPage() {
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'shipper' | 'fleet_owner' | 'driver'>('shipper');
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
    if (!phone || phone.length < 10 || !name) return;

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
      await verifyPhoneOtp(phone, otp, verificationId, name, role, email);
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
      initialMode="signup"
      step={step}
      phone={phone}
      setPhone={setPhone}
      otp={otp}
      setOtp={setOtp}
      devOtp={devOtp}
      name={name}
      setName={setName}
      email={email}
      setEmail={setEmail}
      role={role}
      setRole={setRole}
      loading={loading}
      cooldown={cooldown}
      onSendOtp={handleSendOtp}
      onVerifyOtp={handleVerifyOtp}
      onResendOtp={handleResendOtp}
      onResetStep={() => setStep('details')}
      onSwitchMode={(mode) => {
        if (mode === 'login') {
          router.push('/login');
        }
      }}
    />
  );
}
