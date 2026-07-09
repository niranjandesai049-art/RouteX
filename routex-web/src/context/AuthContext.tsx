'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { api } from '../lib/api';

export interface UserResponse {
  id: string;
  name: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  /** @deprecated Use Clerk's useUser() hook directly for identity. This syncs with backend. */
  login: (phone: string) => Promise<void>;
  /** @deprecated Registration is handled by Clerk's <SignUp /> component. */
  register: (name: string, phone: string, role: string, email?: string) => Promise<void>;
  logout: () => void;
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

  const { getToken, isSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const getDashboardRedirect = (role: string): string => {
    switch (role) {
      case 'driver':
        return '/driver/dashboard';
      case 'shipper':
        return '/shipper/dashboard';
      case 'fleet_owner':
        return '/fleet/dashboard';
      case 'super_admin':
        return '/admin/dashboard';
      default:
        return '/shipper/dashboard';
    }
  };

  /**
   * Exchange a Clerk JWT for a backend session token.
   * The backend will verify the Clerk token, find-or-create the user profile,
   * and return its own JWT for all subsequent API calls.
   */
  const syncWithBackend = useCallback(async () => {
    if (!isSignedIn || !clerkUser) return;
    try {
      const clerkToken = await getToken();
      if (!clerkToken) return;

      // POST to backend /auth/clerk-sync — backend verifies Clerk JWT and returns its own token
      const response = await api.post<{ accessToken: string; user: UserResponse }>(
        '/auth/clerk-sync',
        {},
        { headers: { Authorization: `Bearer ${clerkToken}` } }
      );

      const { accessToken, user: backendUser } = response.data;
      setBackendToken(accessToken);
      setUser(backendUser);

      // Persist for API interceptor
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(backendUser));
    } catch (err: any) {
      console.error('[RouteX] Backend sync failed:', err?.response?.data || err.message);
      // Fallback: use Clerk user data without backend sync
      if (clerkUser) {
        const fallbackUser: UserResponse = {
          id: clerkUser.id,
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
          role: 'shipper', // default role
          isVerified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified',
        };
        setUser(fallbackUser);
      }
    }
  }, [isSignedIn, clerkUser, getToken]);

  // Sync with backend when Clerk auth state is known
  useEffect(() => {
    if (!clerkLoaded) return;

    if (isSignedIn) {
      setLoading(true);
      syncWithBackend().finally(() => setLoading(false));
    } else {
      // Clerk says not signed in — clear local state
      setUser(null);
      setBackendToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLoading(false);
    }
  }, [clerkLoaded, isSignedIn, syncWithBackend]);

  /**
   * @deprecated Kept for backward compatibility with existing code.
   * New flows use Clerk's <SignIn /> component.
   */
  const login = async (phone: string) => {
    setLoading(true);
    try {
      const response = await api.post<{ accessToken: string; user: UserResponse }>('/auth/login', { phone });
      localStorage.setItem('token', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setBackendToken(response.data.accessToken);
      setUser(response.data.user);
      showToast('Logged in successfully!', 'success');
      router.push(getDashboardRedirect(response.data.user.role));
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please verify your phone number.';
      showToast(message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * @deprecated Kept for backward compatibility.
   */
  const register = async (name: string, phone: string, role: string, email?: string) => {
    setLoading(true);
    try {
      const response = await api.post<{ accessToken: string; user: UserResponse }>(
        '/auth/register', { name, phone, role, email }
      );
      localStorage.setItem('token', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setBackendToken(response.data.accessToken);
      setUser(response.data.user);
      showToast('Registration successful!', 'success');
      router.push(getDashboardRedirect(response.data.user.role));
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed. Try again.';
      showToast(message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setBackendToken(null);
    showToast('Logged out successfully', 'info');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, showToast, backendToken }}>
      {children}

      {/* Toast Notification Renderer */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2.5 z-50 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-lg shadow-xl text-sm font-semibold transition-all duration-300 transform translate-y-0 animate-fade-in-up border ${
              t.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                : t.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                : 'bg-zinc-900/90 text-zinc-100 border-zinc-700'
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
