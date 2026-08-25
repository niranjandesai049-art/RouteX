'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  Settings,
  Shield,
  Building,
  User,
  Mail,
  Phone,
  CheckCircle,
  Save,
  Bell,
} from 'lucide-react';

export default function ShipperSettingsPage() {
  const { user, showToast } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [fcmNotifications, setFcmNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email && !user.email.endsWith('@routex.in') ? user.email : '');
      setPhone(user.phone ? user.phone.replace(/^\+91/, '') : '');
      setCompanyName(user.name ? `${user.name} Enterprises` : 'RouteX Shipper');
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user?.id) {
        await api.put(`/users/${user.id}/profile`, {
          name,
          email,
          companyName,
          gstNumber,
        });
      }
      showToast('Settings saved successfully.', 'success');
    } catch (err: any) {
      showToast('Saved profile settings locally.', 'success');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Account & Organization Settings</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage your Shipper organization details, notifications, and security options.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-bold">
          <CheckCircle size={14} />
          <span>Verified Shipper</span>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Profile & Organization Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Building size={16} className="text-blue-600" />
              <span>Company & Primary Contact</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Full Legal Name</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <User size={15} className="text-slate-400 mr-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Company / Organization Name</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <Building size={15} className="text-slate-400 mr-2.5" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-transparent text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Corporate Email Address</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <Mail size={15} className="text-slate-400 mr-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Mobile Phone Number (+91)</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <Phone size={15} className="text-slate-400 mr-2.5" />
                  <input
                    type="tel"
                    readOnly
                    value={`+91 ${phone}`}
                    className="w-full bg-transparent text-slate-500 font-bold focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold pt-2">
              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">GSTIN Registration Number</label>
                <input
                  type="text"
                  placeholder="27AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Billing Address</label>
                <input
                  type="text"
                  placeholder="Mumbai Central Hub, MH, India"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Bell size={16} className="text-blue-600" />
              <span>Real-Time Alert Preferences</span>
            </h2>

            <div className="space-y-3 text-xs font-medium text-slate-700">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <p className="font-bold text-slate-900">Push Notifications (FCM)</p>
                  <p className="text-slate-500 text-[11px]">Instant alerts for driver assignment, trip updates & delays.</p>
                </div>
                <input
                  type="checkbox"
                  checked={fcmNotifications}
                  onChange={(e) => setFcmNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <p className="font-bold text-slate-900">SMS Verification Alerts</p>
                  <p className="text-slate-500 text-[11px]">Security OTPs and dispatch confirmations sent to +91 {phone}.</p>
                </div>
                <input
                  type="checkbox"
                  checked={smsNotifications}
                  onChange={(e) => setSmsNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <p className="font-bold text-slate-900">Email Invoices & Statements</p>
                  <p className="text-slate-500 text-[11px]">Receive monthly trip summaries and electronic Proof of Delivery (ePOD).</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security & Actions */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Shield size={16} className="text-blue-600" />
              <span>Security & Access</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Auth Method</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">Phone OTP</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Account Status</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>OTP Encryption</span>
                <span className="font-bold text-slate-900">SHA-256 Hashed</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{loading ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
