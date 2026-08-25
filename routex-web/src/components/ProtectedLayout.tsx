'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && (!user.role || !allowedRoles.map((r) => r.toLowerCase()).includes(user.role.toLowerCase()))) {
        // Redirect to their real role dashboard if unauthorized for this route
        const userRole = (user.role || '').toLowerCase();
        switch (userRole) {
          case 'driver':
            router.push('/driver/dashboard');
            break;
          case 'shipper':
          case 'company':
            router.push('/shipper/dashboard');
            break;
          case 'fleet_owner':
          case 'transporter':
          case 'truck_owner':
            router.push('/fleet/dashboard');
            break;
          case 'super_admin':
          case 'admin':
            router.push('/admin/dashboard');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="mt-6 text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">
            Authenticating RouteX Session...
          </div>
        </div>
      </div>
    );
  }

  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null; // Don't render content during redirection
  }

  return <>{children}</>;
};
