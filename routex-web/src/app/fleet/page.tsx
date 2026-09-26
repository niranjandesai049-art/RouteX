'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Truck,
  Users,
  Compass,
  CreditCard,
  TrendingUp,
  BrainCircuit,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface KPIState {
  trucksCount: number;
  driversCount: number;
  activeTrips: number;
  balance: number;
}

interface TripLog {
  id: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  price: number;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
}

export default function FleetDashboardIndex() {
  const [kpis, setKpis] = useState<KPIState>({
    trucksCount: 0,
    driversCount: 0,
    activeTrips: 0,
    balance: 0,
  });
  const [trips, setTrips] = useState<TripLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string>('Loading operations analytics...');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Trucks
      const trucksRes = await api.get('/api/fleet/trucks');
      const trucksData = trucksRes.data || [];

      // 2. Fetch Drivers
      const driversRes = await api.get('/api/fleet/drivers');
      const driversData = driversRes.data || [];

      // 3. Fetch Wallet Balance
      const balanceRes = await api.get('/api/fleet/wallet/balance');
      const walletBalance = balanceRes.data?.balance || 0;

      // 4. Fetch Bookings
      const bookingsRes = await api.get('/api/fleet/bookings');
      const bookingsData = bookingsRes.data || [];

      // 5. Fetch Activity Logs
      const logsRes = await api.get('/api/fleet/logs');
      const logsData = logsRes.data || [];

      const active = bookingsData.filter((b: any) =>
        ['assigned', 'at_pickup', 'in_transit', 'at_delivery'].includes(b.status.toLowerCase())
      ).length;

      setKpis({
        trucksCount: trucksData.length,
        driversCount: driversData.length,
        activeTrips: active,
        balance: walletBalance,
      });

      setTrips(bookingsData.slice(0, 5));
      setActivityLogs(logsData.slice(0, 6));

      // 6. Fetch AI recommendations
      const aiInsightsRes = await api.post('/ai/insights', {
        totalTrucks: trucksData.length,
        activeTrucks: active,
        idleTrucks: Math.max(0, trucksData.length - active),
        fuelSpentLiters: trucksData.length * 280,
        totalRevenue: bookingsData.reduce((acc: number, cur: any) => acc + (cur.price || 0), 0),
      });
      setAiRecommendations(aiInsightsRes.data?.insights || 'Optimize dispatch scheduling to minimize fuel usage.');

    } catch (err) {
      console.error('Failed to load fleet dashboard indicators:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-[#EBEBEB] rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-96 bg-white border border-[#EBEBEB] rounded-2xl"></div>
          <div className="h-96 bg-white border border-[#EBEBEB] rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#1A1A1A]">Welcome back, Fleet Operations</h2>
        <p className="text-sm text-[#666666] mt-1">Real-time status updates of vehicles, drivers, and payouts.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Fleet Size</span>
            <p className="text-3xl font-extrabold text-[#1A1A1A]">{kpis.trucksCount}</p>
            <p className="text-[10px] text-[#888888]">{kpis.trucksCount - kpis.activeTrips} Available Vehicles</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center">
            <Truck size={22} />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Total Drivers</span>
            <p className="text-3xl font-extrabold text-[#1A1A1A]">{kpis.driversCount}</p>
            <p className="text-[10px] text-[#888888]">100% Identity Verified</p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-[#137333] rounded-2xl flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Active Trips</span>
            <p className="text-3xl font-extrabold text-[#1A1A1A]">{kpis.activeTrips}</p>
            <p className="text-[10px] text-[#888888]">Socket.IO live telemetries</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Compass size={22} />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Settled Payouts</span>
            <p className="text-3xl font-extrabold text-[#1A1A1A]">₹{kpis.balance.toLocaleString()}</p>
            <p className="text-[10px] text-[#137333] font-semibold flex items-center">
              <TrendingUp size={12} className="mr-1" /> Ready to Withdraw
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <CreditCard size={22} />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: AI Recommendations & Recent Shipments */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Insights Card */}
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 text-[#2563EB]">
              <BrainCircuit size={20} />
              <h3 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">RouteX AI Operations Advisor</h3>
            </div>
            <div className="bg-[#FAFAFA] border border-[#EBEBEB] p-4 rounded-xl text-xs text-[#444444] leading-relaxed whitespace-pre-line font-medium">
              {aiRecommendations}
            </div>
          </div>

          {/* Recent Shipments List */}
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">Recent Trips & Allocation</h3>
              <Link href="/fleet/dispatch" className="text-xs font-bold text-[#2563EB] flex items-center hover:underline">
                Dispatch Board <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>

            {trips.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#888888]">
                No shipments assigned to company yet. Add vehicles and drivers to get matched.
              </div>
            ) : (
              <div className="divide-y divide-[#EBEBEB]">
                {trips.map((trip) => (
                  <div key={trip.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-[#1A1A1A] font-bold">
                        <MapPin size={12} className="text-[#666666]" />
                        <span>{trip.pickup_address.split(',')[0]} → {trip.delivery_address.split(',')[0]}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[#888888]">
                        <span className="flex items-center"><Clock size={11} className="mr-1" /> {new Date(trip.created_at).toLocaleDateString()}</span>
                        <span className="font-semibold text-[#1A1A1A]">₹{trip.price.toLocaleString()}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 font-bold uppercase rounded-full text-[9px] ${
                        trip.status.toLowerCase() === 'completed'
                          ? 'bg-[#E6F4EA] text-[#137333]'
                          : trip.status.toLowerCase() === 'in_transit'
                          ? 'bg-blue-50 text-[#2563EB]'
                          : 'bg-gray-50 text-[#666666]'
                      }`}>
                        {trip.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Activity Audit Logs */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">Operator Audit Feed</h3>
          
          {activityLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#888888]">
              No activity logs recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex space-x-3 text-xs">
                  <div className="w-1.5 h-1.5 bg-[#2563EB] rounded-full mt-1.5 flex-shrink-0"></div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#1A1A1A] uppercase tracking-wide text-[10px]">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-[#666666]">{log.entity_type} record update</p>
                    <span className="text-[9px] text-[#888888]">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
