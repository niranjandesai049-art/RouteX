'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, CheckCircle2, DollarSign, Award, Truck, ShieldAlert } from 'lucide-react';
import { LiveTrackingMap } from './maps/MapLoader';
import { useSocket } from '../context/SocketContext';
import { api } from '../lib/api';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  gstNo?: string;
  isVerified: boolean;
}

export default function AdminPanel() {
  const { socket } = useSocket();
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0.00,
    commissionCollected: 0.00,
    pendingKYC: 0,
    activeTrips: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [notifInput, setNotifInput] = useState('');

  const fetchAdminData = async () => {
    try {
      // Fetch stats
      const statsRes = await api.get('/api/dashboard/admin');
      if (statsRes.status === 200) {
        setMetrics(statsRes.data);
      }

      // Fetch users
      const usersRes = await api.get('/api/users');
      if (usersRes.status === 200) {
        const data = usersRes.data;
        const mapped = data.map((u: any) => ({
          id: u.id,
          name: u.first_name ? `${u.first_name} ${u.last_name}`.trim() : u.name || 'User',
          phone: u.phone_number || u.phone || '',
          role: u.role,
          gstNo: u.companies?.[0]?.gstin || u.gstNo || '',
          isVerified: u.verification_state === 'verified' || u.isVerified || false,
        }));
        setUsers(mapped);
      }

      // Fetch active bookings
      const bookingsRes = await api.get('/bookings');
      if (bookingsRes.status === 200) {
        const data = Array.isArray(bookingsRes.data) ? bookingsRes.data : (bookingsRes.data?.bookings || []);
        const mapped = data.map((b: any) => {
          let pAddr = 'Delhi';
          let dAddr = 'Mumbai';
          try {
            if (typeof b.pickup_address === 'string' && b.pickup_address.trim().startsWith('{')) {
              pAddr = JSON.parse(b.pickup_address).address || b.pickup_address;
            } else if (typeof b.pickup_address === 'string') {
              pAddr = b.pickup_address;
            } else if (b.pickup_address && typeof b.pickup_address === 'object') {
              pAddr = b.pickup_address.address || 'Delhi';
            }
          } catch {}
          try {
            if (typeof b.delivery_address === 'string' && b.delivery_address.trim().startsWith('{')) {
              dAddr = JSON.parse(b.delivery_address).address || b.delivery_address;
            } else if (typeof b.delivery_address === 'string') {
              dAddr = b.delivery_address;
            } else if (b.delivery_address && typeof b.delivery_address === 'object') {
              dAddr = b.delivery_address.address || 'Mumbai';
            }
          } catch {}

          return {
            id: b.id,
            pickup: pAddr,
            destination: dAddr,
            status: b.status,
            price: parseFloat((b.quoted_price || 0).toString()),
            truckType: b.cargo_description || 'Tata Ace',
            weight: b.estimated_weight_kg ? `${parseFloat(b.estimated_weight_kg.toString()) / 1000} Tons` : '1 Ton',
          };
        });
        setBookings(mapped);
      }
    } catch (err) {
      console.warn('API connection offline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleStatusChange = (data: any) => {
      console.log('Admin Panel received socket status update:', data);
      fetchAdminData();
    };

    const statuses = ['assigned', 'at_pickup', 'in_transit', 'at_delivery', 'completed', 'searching', 'cancelled'];
    statuses.forEach(status => {
      socket.on(`booking:${status}`, handleStatusChange);
    });

    return () => {
      statuses.forEach(status => {
        socket.off(`booking:${status}`, handleStatusChange);
      });
    };
  }, [socket]);

  const handleApproveKYC = async (id: string) => {
    try {
      const res = await api.put(`/api/users/${id}/verify`, { isVerified: true });
      if (res.status === 200) {
        await fetchAdminData();
      }
    } catch (err) {
      alert('Could not update user KYC status.');
    }
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifInput) return;
    setNotifications(prev => [notifInput, ...prev]);
    setNotifInput('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-gray-50 min-h-screen text-sm text-gray-500 font-semibold">
        Fetching Super Admin database metrics...
      </div>
    );
  }

  const pendingKYCList = users.filter(u => !u.isVerified);
  const verifiedDriversList = users.filter(u => u.role === 'driver' && u.isVerified);

  return (
    <div className="bg-[#F5F5F5] min-h-screen text-gray-900 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Gross Transaction Volume</span>
              <p className="text-3xl font-bold mt-1 text-gray-900">₹{metrics.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Platform Commission (5%)</span>
              <p className="text-3xl font-bold mt-1 text-gray-900">₹{metrics.commissionCollected.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
              <Award size={24} />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Pending KYC Reviews</span>
              <p className="text-3xl font-bold mt-1 text-gray-900">{metrics.pendingKYC}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
              <FileText size={24} />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Active Global Loads</span>
              <p className="text-3xl font-bold mt-1 text-gray-900">{metrics.activeTrips}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <Truck size={24} />
            </div>
          </div>
        </div>

        {/* Live GPS Tracking map container */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900">Live GPS Freight Tracking</h3>
          <div className="h-96 rounded-xl overflow-hidden border border-gray-200 relative">
            <LiveTrackingMap bookings={bookings} users={users} />
          </div>
        </div>

        {/* Dashboard Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KYC Approvals Panel */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Pending KYC & Verification Requests</h3>
              <span className="text-xs font-bold text-gray-400">Prisma Live Query</span>
            </div>
            
            {pendingKYCList.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <ShieldCheck size={48} className="mx-auto mb-4 text-gray-200" />
                <p className="font-semibold text-gray-600 text-sm">No users registered yet.</p>
                <p className="text-xs text-gray-400 mt-1">All registered companies and drivers are fully verified.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingKYCList.map(req => (
                  <div key={req.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <div>
                      <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase">{req.role}</span>
                      <h5 className="font-bold text-gray-900 mt-1">{req.name}</h5>
                      <p className="text-xs text-gray-500">Phone: {req.phone} {req.gstNo ? `| GST: ${req.gstNo}` : ''}</p>
                    </div>
                    
                    <button
                      onClick={() => handleApproveKYC(req.id)}
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                    >
                      Verify & Approve KYC
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: AI Fraud & Notifications */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Active Verified Drivers */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">Active Verified Drivers</h3>
              {verifiedDriversList.length === 0 ? (
                <p className="text-xs text-gray-400">No active drivers.</p>
              ) : (
                <div className="space-y-3">
                  {verifiedDriversList.map(d => (
                    <div key={d.id} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 last:border-0">
                      <span className="font-bold">{d.name}</span>
                      <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">Verified</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Broadcast notifications */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Send Global Notification</h3>
              <form onSubmit={handleSendNotification} className="space-y-3">
                <textarea
                  value={notifInput}
                  onChange={(e) => setNotifInput(e.target.value)}
                  placeholder="Enter message to broadcast..."
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-600 h-20 resize-none"
                  required
                />
                <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-2 rounded-lg text-xs transition">
                  Send Push Broadcast
                </button>
              </form>
              
              {notifications.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400">RECENTLY BROADCASTED</p>
                  {notifications.map((n, i) => (
                    <div key={i} className="text-xs bg-gray-50 border border-gray-100 p-2 rounded text-gray-600 truncate">
                      {n}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
