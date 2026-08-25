'use client';

import React, { useState } from 'react';
import { ProtectedLayout } from '../../components/ProtectedLayout';
import { UserProfileModal } from '../../components/UserProfileModal';
import { useAuth } from '../../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Truck,
  Users,
  Compass,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Bell,
  Activity,
} from 'lucide-react';

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/fleet', icon: LayoutDashboard },
    { name: 'Vehicles', href: '/fleet/vehicles', icon: Truck },
    { name: 'Drivers', href: '/fleet/drivers', icon: Users },
    { name: 'Dispatch & Map', href: '/fleet/dispatch', icon: Compass },
    { name: 'Maintenance Log', href: '/fleet/maintenance', icon: Activity },
    { name: 'Wallet & Invoices', href: '/fleet/wallet', icon: CreditCard },
    { name: 'Settings', href: '/fleet/settings', icon: Settings },
  ];

  return (
    <ProtectedLayout allowedRoles={['fleet_owner']}>
      <div className="flex min-h-screen bg-[#FAFAFA] font-sans antialiased text-[#1A1A1A]">
        {/* Sidebar Container */}
        <aside className="w-64 border-r border-[#EBEBEB] bg-white flex flex-col justify-between p-6">
          <div className="space-y-8">
            {/* Logo */}
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                router.push('/');
              }}
              className="flex items-center space-x-3 hover:opacity-90 transition cursor-pointer select-none"
            >
              <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center font-bold text-white text-md">
                R
              </div>
              <span className="font-bold text-lg tracking-tight">RouteX</span>
            </Link>

            {/* Nav Links */}
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-[#2563EB] text-white'
                        : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Section & Logout */}
          <div className="border-t border-[#EBEBEB] pt-4 space-y-2">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-full flex items-center space-x-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center font-bold text-[#2563EB] text-xs shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'F'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#1A1A1A] truncate">{user?.name || 'Fleet Manager'}</p>
                <span className="text-[10px] text-[#888888]">Carrier Profile & Settings</span>
              </div>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-semibold text-[#FF4D4D] hover:bg-[#FFF5F5] rounded-xl transition cursor-pointer"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="bg-white border-b border-[#EBEBEB] h-16 px-8 flex items-center justify-between sticky top-0 z-30">
            <div>
              <h1 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                {navigation.find((n) => n.href === pathname)?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 text-[#888888] hover:text-[#1A1A1A] rounded-full hover:bg-gray-100 transition relative">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full"></span>
              </button>

              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center space-x-3 border-l border-[#EBEBEB] pl-4 hover:opacity-80 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-xs">
                  {user?.name ? user.name[0].toUpperCase() : 'F'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-[#1A1A1A]">{user?.name || 'Carrier'}</p>
                  <p className="text-[10px] text-[#888888]">Active Operator</p>
                </div>
              </button>
            </div>
          </header>

          {/* Page Dynamic Content */}
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>

      {/* Real Authenticated User Profile Modal */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </ProtectedLayout>
  );
}
