'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ProtectedLayout } from '../../components/ProtectedLayout';
import { UserProfileModal } from '../../components/UserProfileModal';
import { LayoutDashboard, Truck, Wallet, FileText, Settings, LogOut, Bell } from 'lucide-react';

export default function ShipperLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/shipper/dashboard', icon: LayoutDashboard },
    { name: 'Book Load', href: '/shipper/book', icon: Truck },
    { name: 'Shipments', href: '/shipper/shipments', icon: FileText },
    { name: 'Wallet & Billing', href: '/shipper/wallet', icon: Wallet },
    { name: 'Reports', href: '/shipper/reports', icon: FileText },
    { name: 'Settings', href: '/shipper/settings', icon: Settings },
  ];

  return (
    <ProtectedLayout allowedRoles={['shipper']}>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              router.push('/');
            }}
            className="h-16 flex items-center px-6 border-b border-slate-100 hover:opacity-90 transition cursor-pointer select-none"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-sm">
              R
            </div>
            <span className="ml-3 font-extrabold text-slate-900 tracking-tight text-lg">
              RouteX <span className="text-[10px] text-blue-600 font-bold uppercase ml-1 px-1.5 py-0.5 bg-blue-50 rounded-md">Shipper</span>
            </span>
          </Link>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-1">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex w-full items-center px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center mr-2.5">
                {user?.name?.charAt(0) || 'S'}
              </div>
              <span>Profile & Account</span>
            </button>

            <button
              onClick={logout}
              className="flex w-full items-center px-3 py-2 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <LogOut className="mr-2.5 h-4 w-4 text-slate-400 group-hover:text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-800">
                {navigation.find((n) => pathname.startsWith(n.href))?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <button className="text-slate-400 hover:text-slate-600 relative">
                <Bell size={20} />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center space-x-3 border-l border-slate-200 pl-6 text-left hover:opacity-80 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shadow-sm">
                  {user?.name?.charAt(0) || 'S'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-slate-700">{user?.name || 'Shipper'}</p>
                  <p className="text-xs text-slate-500">Shipper Account</p>
                </div>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-[#F8FAFC]">
            {children}
          </main>
        </div>
      </div>

      {/* Real Authenticated User Profile Modal */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </ProtectedLayout>
  );
}
