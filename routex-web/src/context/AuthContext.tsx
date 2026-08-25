'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

export interface UserResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  phone_verified?: boolean;
  email_verified?: boolean;
  isVerified: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: UserResponse | null;
  authenticated: boolean;
  loading: boolean;
  role: string | null;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; message: string; verificationId?: string; devOtp?: string }>;
  verifyPhoneOtp: (
    phone: string,
    otp: string,
    verificationId?: string,
    name?: string,
    role?: string,
    email?: string,
  ) => Promise<void>;
  login: (phone: string) => Promise<void>;
  register: (name: string, phone: string, role: string, email?: string) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  backendToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [backendToken, setBackendToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const getDashboardRedirect = (role: string): string => {
    const cleanRole = role?.toLowerCase()?.trim();
    switch (cleanRole) {
      case 'driver':
        return '/driver/dashboard';
      case 'shipper':
      case 'company':
        return '/shipper/dashboard';
      case 'fleet_owner':
      case 'transporter':
      case 'truck_owner':
        return '/fleet/dashboard';
      case 'super_admin':
      case 'admin':
        return '/admin/dashboard';
      default:
        console.warn(`[RouteX Auth] Unrecognized or missing role '${role}', redirecting to /login.`);
        return '/login';
    }
  };

  const loadMe = useCallback(async (token: string) => {
    try {
      const res = await api.get<UserResponse>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setBackendToken(token);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setBackendToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      loadMe(storedToken);
    } else {
      setLoading(false);
    }
  }, [loadMe]);

  const sendPhoneOtp = async (phone: string) => {
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        verificationId: string;
        resendAvailableAt?: string;
        devOtp?: string;
      }>('/auth/phone/send-otp', {
        phoneNumber: phone,
        phone,
      });

      if (res.data?.devOtp) {
        showToast(`OTP sent! Demo Code: ${res.data.devOtp}`, 'info');
      } else {
        showToast(res.data?.message || 'OTP sent successfully', 'success');
      }
      return res.data;
    } catch (err: any) {
      let msg = 'Failed to send OTP. Try again.';
      if (!err.response) {
        msg = 'Unable to connect to the authentication server.';
      } else if (err.response.data?.message) {
        msg = Array.isArray(err.response.data.message)
          ? err.response.data.message[0]
          : err.response.data.message;
      }
      showToast(msg, 'error');
      throw err;
    }
  };

  const verifyPhoneOtp = async (
    phone: string,
    otp: string,
    verificationId?: string,
    name?: string,
    role?: string,
    email?: string,
  ) => {
    setLoading(true);
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: UserResponse;
      }>('/auth/phone/verify-otp', {
        phoneNumber: phone,
        phone,
        otp,
        verificationId,
        name,
        role,
        email,
      });

      const { accessToken, refreshToken, user: authUser } = res.data;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RouteX Auth] OTP Verified successfully. User ID: ${authUser.id}, Role: ${authUser.role}, Phone: ${authUser.phone}`);
      }
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(authUser));

      setBackendToken(accessToken);
      setUser(authUser);
      showToast('Authentication successful!', 'success');

      const targetRoute = getDashboardRedirect(authUser.role);
      router.push(targetRoute);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'OTP verification failed. Check the code.';
      showToast(msg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string) => {
    await sendPhoneOtp(phone);
  };

  const register = async (name: string, phone: string, role: string, email?: string) => {
    await sendPhoneOtp(phone);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setBackendToken(null);
    showToast('Logged out successfully', 'info');
    router.push('/login');
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/users/me');
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setBackendToken(null);
    showToast('Your account has been permanently deleted.', 'info');
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: !!user,
        loading,
        role: user?.role || null,
        sendPhoneOtp,
        verifyPhoneOtp,
        login,
        register,
        logout,
        deleteAccount,
        showToast,
        backendToken,
      }}
    >
      {children}

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2.5 z-50 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-2xl text-xs font-bold transition-all border ${
              t.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-300 border-emerald-800'
                : t.type === 'error'
                ? 'bg-rose-950/95 text-rose-300 border-rose-800'
                : 'bg-slate-900/95 text-slate-100 border-slate-700'
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="ml-4 text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
