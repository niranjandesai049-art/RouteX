'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import LandingPage from '../components/LandingPage';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render RouteX Landing/Home page for all visitors (both unauthenticated and authenticated)
  return (
    <LandingPage
      onNavigate={(portal) => {
        if (user) {
          // If user is already authenticated, take them directly to requested portal
          switch (portal) {
            case 'driver':
              router.push('/driver/dashboard');
              break;
            case 'shipper':
              router.push('/shipper/dashboard');
              break;
            case 'fleet':
              router.push('/fleet/dashboard');
              break;
            case 'admin':
              router.push('/admin/dashboard');
              break;
            default:
              if (user.role === 'driver') {
                router.push('/driver/dashboard');
              } else if (user.role === 'fleet_owner') {
                router.push('/fleet/dashboard');
              } else if (user.role === 'super_admin') {
                router.push('/admin/dashboard');
              } else {
                router.push('/shipper/dashboard');
              }
          }
        } else {
          // If unauthenticated, redirect to login
          router.push('/login');
        }
      }}
    />
  );
}
