'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedLayout } from '../../../components/ProtectedLayout';
import AdminPanel from '../../../components/AdminPanel';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedLayout allowedRoles={['super_admin']}>
      <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
        {/* Dashboard Header Bar */}
        <header className="bg-slate-900 text-white py-4 px-6 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition cursor-pointer">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-bold text-lg">R</div>
            <span className="font-extrabold tracking-tight">RouteX <span className="text-xs text-blue-400 font-semibold uppercase ml-1 px-1.5 py-0.5 bg-blue-900/50 rounded">Admin Panel</span></span>
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-bold text-slate-300">Welcome, {user?.name || 'Admin'}</span>
            <button
              onClick={logout}
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1">
          <AdminPanel />
        </main>
      </div>
    </ProtectedLayout>
  );
}
