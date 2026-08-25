'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  User,
  Phone,
  Mail,
  Shield,
  CheckCircle,
  LogOut,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, logout, deleteAccount } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !user) return null;

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') return;
    setIsDeleting(true);
    try {
      await deleteAccount();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleDisplayName = (role?: string) => {
    if (!role) return 'Not provided';
    switch (role.toLowerCase()) {
      case 'fleet_owner':
      case 'carrier':
      case 'transporter':
        return 'Fleet Carrier';
      case 'driver':
        return 'Driver';
      case 'super_admin':
      case 'admin':
        return 'System Administrator';
      case 'company_admin':
      case 'company':
        return 'Company Admin';
      case 'shipper':
        return 'Shipper';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const realName = user.name?.trim() || '';
  const realPhone = user.phone ? user.phone.replace(/^\+91/, '') : '';
  const realEmail = user.email && !user.email.endsWith('@routex.in') && !user.email.endsWith('@phone.routex') ? user.email.trim() : '';
  const realId = user.id || '';

  // Generate avatar initial from real user name, else real phone digit
  const avatarInitial = realName
    ? realName.charAt(0).toUpperCase()
    : realPhone
    ? realPhone.charAt(0)
    : 'U';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-[28px] max-w-md w-full shadow-2xl overflow-hidden relative font-sans">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-blue-700 flex items-center justify-center font-black text-2xl shadow-lg">
              {avatarInitial}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-white truncate">
                {realName || 'Not provided'}
              </h3>
              <p className="text-xs text-blue-100 font-medium">{getRoleDisplayName(user.role)}</p>
              <div className="mt-1 flex items-center space-x-1 text-[11px] bg-white/20 px-2 py-0.5 rounded-full w-max">
                <CheckCircle size={11} className="text-emerald-300" />
                <span>{user.isVerified ? 'Verified Account' : 'Active Profile'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body / Real Authenticated Details */}
        <div className="p-6 space-y-5">
          {!showDeleteConfirm ? (
            <>
              <div className="space-y-3 text-xs">
                {/* Full Name */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-2.5 text-slate-500 font-medium">
                    <User size={15} />
                    <span>Full Name</span>
                  </div>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">
                    {realName || 'Not provided'}
                  </span>
                </div>

                {/* Registered Phone */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-2.5 text-slate-500 font-medium">
                    <Phone size={15} />
                    <span>Registered Phone</span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">
                    {realPhone ? `+91 ${realPhone}` : 'Not provided'}
                  </span>
                </div>

                {/* Email Address */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-2.5 text-slate-500 font-medium">
                    <Mail size={15} />
                    <span>Email Address</span>
                  </div>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">
                    {realEmail || 'Not provided'}
                  </span>
                </div>

                {/* Account ID */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-2.5 text-slate-500 font-medium">
                    <Shield size={15} />
                    <span>Account ID</span>
                  </div>
                  <span className="font-bold text-slate-700 font-mono text-[11px] truncate max-w-[150px]">
                    {realId || 'Not provided'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Sign Out of RouteX</span>
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Account</span>
                </button>
              </div>
            </>
          ) : (
            /* Delete Account Confirmation Dialog */
            <div className="space-y-4 text-xs animate-in zoom-in-95 duration-150">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-900">
                <div className="flex items-center space-x-2 font-bold text-sm text-rose-700">
                  <AlertTriangle size={18} />
                  <span>Delete Account Permanently?</span>
                </div>
                <p className="leading-relaxed">
                  This permanently deletes your RouteX account and associated account data. This action cannot be undone.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold">
                  Type <span className="font-mono text-rose-600 font-black">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-rose-600 uppercase"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={deleteConfirmText.trim().toLowerCase() !== 'delete' || isDeleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition disabled:opacity-40 cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default UserProfileModal;
