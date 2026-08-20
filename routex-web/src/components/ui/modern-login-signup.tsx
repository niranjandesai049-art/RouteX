'use client';

import React, { useState } from 'react';
import { Phone, ArrowRight, ShieldCheck, RefreshCw, Lock, Mail, User, UserCheck } from 'lucide-react';
import Link from 'next/link';

export interface ModernLoginSignupProps {
  initialMode?: 'login' | 'signup';
  step: 'phone' | 'otp' | 'details';
  phone: string;
  setPhone: (val: string) => void;
  otp: string;
  setOtp: (val: string) => void;
  devOtp?: string;
  name?: string;
  setName?: (val: string) => void;
  email?: string;
  setEmail?: (val: string) => void;
  role?: 'shipper' | 'fleet_owner' | 'driver';
  setRole?: (role: 'shipper' | 'fleet_owner' | 'driver') => void;
  loading: boolean;
  cooldown: number;
  onSendOtp: (e: React.FormEvent) => void;
  onVerifyOtp: (e: React.FormEvent) => void;
  onResendOtp: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
  onResetStep?: () => void;
}

export function ModernLoginSignup({
  initialMode = 'login',
  step,
  phone,
  setPhone,
  otp,
  setOtp,
  devOtp,
  name = '',
  setName,
  email = '',
  setEmail,
  role = 'shipper',
  setRole,
  loading,
  cooldown,
  onSendOtp,
  onVerifyOtp,
  onResendOtp,
  onSwitchMode,
  onResetStep,
}: ModernLoginSignupProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');

  const handleToggle = (targetSignUp: boolean) => {
    setIsSignUp(targetSignUp);
    if (onResetStep) onResetStep();
    onSwitchMode(targetSignUp ? 'signup' : 'login');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient background lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Split 21st.dev Auth Container */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-[32px] md:rounded-[40px] shadow-2xl shadow-slate-950/50 border border-slate-800/20 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] transition-all duration-500">
        
        {/* LEFT PANEL — Curved Blue/Indigo Branding Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden lg:rounded-r-[120px] transition-all duration-500">
          {/* Subtle Radial Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* RouteX Brand Badge */}
          <div className="relative z-10 flex items-center space-x-3">
            <div className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-md">
              R
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Route<span className="text-blue-200">X</span>
            </span>
          </div>

          {/* Central Call To Action Greeting */}
          <div className="relative z-10 my-8 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              {isSignUp ? 'Welcome Back!' : 'New here?'}
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-xs">
              {isSignUp
                ? 'To keep connected with your RouteX logistics operations, please sign in with your registered account.'
                : 'Join us today and discover India’s most advanced digital freight marketplace. Create your account in seconds!'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleToggle(!isSignUp)}
                className="inline-block border-2 border-white/90 hover:bg-white hover:text-blue-600 text-white font-bold tracking-widest text-xs uppercase px-8 py-3.5 rounded-full transition-all duration-300 shadow-lg shadow-black/10 text-center cursor-pointer"
              >
                {isSignUp ? 'SIGN IN' : 'SIGN UP'}
              </button>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="relative z-10 text-[10px] text-blue-200 font-medium tracking-wide">
            © {new Date().getFullYear()} RouteX Technologies. Verified Platform.
          </div>
        </div>

        {/* RIGHT PANEL — Clean White Authentication Area */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isSignUp ? 'Create Account' : 'Sign in'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                {isSignUp
                  ? 'Join RouteX and manage your freight journey smarter.'
                  : 'Enter your registered mobile phone number to receive a security OTP code.'}
              </p>
            </div>

            {/* FORM STATE SWITCHING */}
            {step === 'otp' ? (
              /* OTP VERIFICATION FORM */
              <form onSubmit={onVerifyOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      6-Digit Security OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={() => onResetStep && onResetStep()}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Change Details
                    </button>
                  </div>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden px-4 py-3 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    <Lock className="text-slate-400 mr-3 shrink-0" size={18} />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-transparent text-slate-900 text-center tracking-[0.5em] text-lg font-black focus:outline-none placeholder-slate-300"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sent to <strong className="text-slate-700">+91 {phone}</strong>
                  </p>
                </div>

                {devOtp && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <div className="font-bold text-blue-900 flex items-center gap-1.5 text-[11px]">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        Demo / Development OTP Code
                      </div>
                      <div className="text-xl font-black tracking-[0.2em] text-blue-700 font-mono">
                        {devOtp}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtp(devOtp)}
                      className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                    >
                      Auto-fill OTP
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold tracking-wider uppercase text-xs sm:text-sm py-3.5 rounded-full shadow-xl shadow-blue-600/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Verifying...' : isSignUp ? 'COMPLETE REGISTRATION' : 'VERIFY & ACCESS PORTAL'}</span>
                  {isSignUp ? <UserCheck size={16} /> : <ShieldCheck size={16} />}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={onResendOtp}
                    disabled={cooldown > 0 || loading}
                    className="text-blue-600 font-bold hover:text-blue-700 disabled:opacity-40 flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</span>
                  </button>
                  <span className="text-slate-400 text-[10px] font-medium">RouteX Hashed Security</span>
                </div>
              </form>
            ) : isSignUp ? (
              /* REGISTRATION INITIAL DETAILS FORM */
              <form onSubmit={onSendOtp} className="space-y-4">
                {/* Role Selection Tabs */}
                {setRole && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Select Portal Role
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold bg-slate-100 p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setRole('shipper')}
                        className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer ${
                          role === 'shipper'
                            ? 'bg-white text-blue-600 shadow font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Company
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('fleet_owner')}
                        className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer ${
                          role === 'fleet_owner'
                            ? 'bg-white text-blue-600 shadow font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Carrier
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('driver')}
                        className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer ${
                          role === 'driver'
                            ? 'bg-white text-blue-600 shadow font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Driver
                      </button>
                    </div>
                  </div>
                )}

                {/* Name / Company / Transporter Input */}
                {setName && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      {role === 'shipper'
                        ? 'Company Name'
                        : role === 'fleet_owner'
                        ? 'Transporter Name'
                        : 'Full Legal Name'}
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                      <User className="text-slate-400 mr-3 shrink-0" size={16} />
                      <input
                        type="text"
                        required
                        placeholder={
                          role === 'shipper'
                            ? 'e.g. Acme Freight Logistics'
                            : role === 'fleet_owner'
                            ? 'e.g. Sharma Roadways'
                            : 'e.g. Ramesh Sharma'
                        }
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent text-slate-900 text-xs font-semibold focus:outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* Phone Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Mobile Phone Number
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    <Phone className="text-slate-400 mr-3 shrink-0" size={16} />
                    <span className="text-xs font-bold text-slate-800 mr-2 border-r border-slate-300 pr-2">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-transparent text-slate-900 text-xs font-semibold focus:outline-none placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Email Input */}
                {setEmail && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Email Address (Optional)
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                      <Mail className="text-slate-400 mr-3 shrink-0" size={16} />
                      <input
                        type="email"
                        placeholder="ramesh@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent text-slate-900 text-xs font-semibold focus:outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* Primary SIGN UP Button */}
                <button
                  type="submit"
                  disabled={loading || phone.length < 10 || !name}
                  className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold tracking-wider uppercase text-xs sm:text-sm py-3.5 rounded-full shadow-xl shadow-blue-600/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-2"
                >
                  <span>{loading ? 'Sending OTP...' : 'SIGN UP'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              /* LOGIN PHONE NUMBER FORM */
              <form onSubmit={onSendOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Mobile Phone Number
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden px-4 py-3 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                    <Phone className="text-slate-400 mr-3 shrink-0" size={18} />
                    <span className="text-xs font-bold text-slate-800 mr-3 border-r border-slate-300 pr-3">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-transparent text-slate-900 text-sm font-semibold focus:outline-none placeholder-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold tracking-wider uppercase text-xs sm:text-sm py-3.5 rounded-full shadow-xl shadow-blue-600/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Sending OTP...' : 'LOGIN'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* Social Platform Sign In/Up */}
            <div className="pt-3 space-y-3">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] font-semibold text-slate-400 whitespace-nowrap uppercase tracking-wider">
                  Or sign in with social platforms
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => alert('Google Sign-In ready via OAuth.')}
                  className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm"
                  title="Sign in with Google"
                >
                  G
                </button>
                <button
                  type="button"
                  onClick={() => alert('LinkedIn Business OAuth ready.')}
                  className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm"
                  title="Sign in with LinkedIn"
                >
                  in
                </button>
                <button
                  type="button"
                  onClick={() => alert('Twitter / X OAuth ready.')}
                  className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm"
                  title="Sign in with X / Twitter"
                >
                  𝕏
                </button>
              </div>
            </div>

            {/* Mobile Footer Toggle */}
            <div className="lg:hidden text-center pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                {isSignUp ? 'Already registered? ' : "Don't have an account? "}
              </span>
              <button
                type="button"
                onClick={() => handleToggle(!isSignUp)}
                className="text-blue-600 font-bold hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ModernLoginSignup;
