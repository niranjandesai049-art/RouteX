'use client';

import React from 'react';
import { ProtectedLayout } from '../../components/ProtectedLayout';
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
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center font-bold text-white text-md">
                R
              </div>
              <span className="font-bold text-lg tracking-tight">RouteX</span>
            </div>

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
          <div className="border-t border-[#EBEBEB] pt-4 space-y-3">
            <div className="flex items-center space-x-3 px-2">
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-bold text-[#666666] text-xs">
                {user?.name ? user.name[0].toUpperCase() : 'F'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#1A1A1A] truncate">{user?.name || 'Fleet Manager'}</p>
                <span className="text-[10px] text-[#888888]">Carrier Account</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-semibold text-[#FF4D4D] hover:bg-[#FFF5F5] rounded-xl transition cursor-pointer"
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
              {/* Notification icon */}
              <button className="p-2 text-[#666666] hover:text-[#1A1A1A] transition rounded-lg hover:bg-[#FAFAFA]">
                <Bell size={18} />
              </button>

              <div className="h-6 w-[1px] bg-[#EBEBEB]"></div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-[#666666]">
                  {user?.phone || 'Carrier'}
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-[#E6F4EA] text-[#137333] uppercase rounded-full">
                  Verified
                </span>
              </div>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
