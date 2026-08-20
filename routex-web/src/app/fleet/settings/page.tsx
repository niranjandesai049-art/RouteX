'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import {
  Settings,
  Shield,
  FileText,
  Clock,
  CheckCircle,
  Building,
} from 'lucide-react';

interface CompanyProfile {
  legal_name: string;
  trade_name?: string;
  corporate_email?: string;
  corporate_phone?: string;
  registration_number?: string;
  tax_id?: string;
  is_verified: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  created_at: string;
  details: any;
}

export default function FleetSettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit fields
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regNo, setRegNo] = useState('');
  const [taxId, setTaxId] = useState('');

  const fetchProfileAndLogs = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current profile
      const profRes = await api.get('/api/companies/profile');
      if (profRes.data) {
        setProfile(profRes.data);
        setLegalName(profRes.data.legal_name || '');
        setTradeName(profRes.data.trade_name || '');
        setEmail(profRes.data.corporate_email || '');
        setPhone(profRes.data.corporate_phone || '');
        setRegNo(profRes.data.registration_number || '');
        setTaxId(profRes.data.tax_id || '');
      }

      // 2. Fetch Activity Logs
      const logsRes = await api.get('/api/fleet/logs');
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to load company profile settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndLogs();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/api/companies/profile', {
        companyName: legalName,
        gstNo: taxId,
      });
      alert('Company profile settings saved successfully.');
      fetchProfileAndLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update company profile.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Columns: Edit Settings Form */}
        <div className="lg:col-span-2 bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-[#EBEBEB] pb-4">
            <Building size={20} className="text-[#2563EB]" />
            <h3 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">Company Profile Details</h3>
          </div>

          {isLoading ? (
            <p className="text-xs text-[#888888] animate-pulse">Loading settings...</p>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs font-semibold text-[#666666]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Legal Business Name</label>
                  <input
                    type="text"
                    required
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB] text-[#1A1A1A]"
                  />
                </div>
                <div className="space-y-1">
                  <label>Trade Name (DBA)</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB] text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Corporate Email</label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-gray-50 border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none text-[#666666] cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label>Corporate Phone</label>
                  <input
                    type="text"
                    disabled
                    value={phone}
                    className="w-full bg-gray-50 border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none text-[#666666] cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Registration Number (CIN)</label>
                  <input
                    type="text"
                    disabled
                    value={regNo}
                    className="w-full bg-gray-50 border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none text-[#666666] cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label>GSTIN Tax Identification ID</label>
                  <input
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="27AAAT1909M1Z5"
                    className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB] text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#EBEBEB] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-green-600 rounded-full"></span>
                  <span className="text-[11px] text-[#137333]">Carrier Verification Status: Approved</span>
                </div>
                <button
                  type="submit"
                  className="bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Security & Operator Audit Logs */}
        <div className="space-y-6">
          {/* Security Compliance Card */}
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 text-[#2563EB]">
              <Shield size={18} />
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#1A1A1A]">Access Security</h4>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed">
              Your profile is guarded with multi-factor authentication. Permissions are assigned dynamically by role groups.
            </p>
          </div>

          {/* Detailed Audit Logs */}
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-6 shadow-sm space-y-6 max-h-[350px] overflow-y-auto">
            <h3 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">System Audit Log</h3>
            
            {logs.length === 0 ? (
              <p className="text-center py-6 text-xs text-[#888888]">No logs registered.</p>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex space-x-3 text-xs border-b border-[#FAFAFA] pb-2 last:border-0">
                    <Clock size={14} className="text-[#888888] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#1A1A1A] uppercase text-[10px] tracking-wide">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-[#666666] mt-0.5">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 8)})` : ''}
                      </p>
                      <span className="text-[9px] text-[#888888]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
