'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import LandingPage from '../components/LandingPage';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Redirect authenticated users to their specific dashboard
      switch (user.role) {
        case 'driver':
          router.push('/driver/dashboard');
          break;
        case 'shipper':
          router.push('/shipper/dashboard');
          break;
        case 'fleet_owner':
          router.push('/fleet/dashboard');
          break;
        case 'super_admin':
          router.push('/admin/dashboard');
          break;
        default:
          break;
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render landing page for unauthenticated visitors
  return (
    <LandingPage
      onNavigate={(portal) => {
        if (portal === 'shipper' || portal === 'driver' || portal === 'fleet' || portal === 'admin') {
          router.push('/login');
        }
      }}
    />
  );
}
