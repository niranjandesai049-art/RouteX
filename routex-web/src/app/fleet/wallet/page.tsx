'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import {
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  FileText,
  Clock,
  Download,
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  method: string;
  created_at: string;
  gateway_transaction_id: string;
  bookings?: {
    booking_reference: string;
  } | null;
}

export default function FleetWalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const balanceRes = await api.get('/api/fleet/wallet/balance');
      setBalance(balanceRes.data?.balance || 0);

      const transRes = await api.get('/api/fleet/wallet/transactions');
      setTransactions(transRes.data || []);
    } catch (err) {
      console.error('Failed to load wallet ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) return;

    try {
      await api.post('/api/fleet/wallet/payout', {
        amount: Number(payoutAmount),
      });
      setIsPayoutModalOpen(false);
      setPayoutAmount('');
      fetchWalletData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payout failed. Please check balance.');
    }
  };

  const handleDownloadInvoice = (tx: Transaction) => {
    let invoiceContent = `==================================================
                 ROUTEX INDIA
             OFFICIAL PAYOUT INVOICE
==================================================
Transaction Reference: ${tx.gateway_transaction_id}
Date: ${new Date(tx.created_at).toLocaleString()}
Payment Mode: Net Banking
Settlement Status: ${tx.status.toUpperCase()}

Amount: INR ${Number(tx.amount).toLocaleString()}
--------------------------------------------------
Thank you for partnering with RouteX.
RouteX Logistics Operating System.
==================================================`;
    
    const blob = new Blob([invoiceContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `invoice_${tx.gateway_transaction_id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Upper Panel: Card & Withdrawal trigger */}
      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Settled Logistics Capital</span>
          <h2 className="text-4xl font-extrabold text-[#1A1A1A]">₹{balance.toLocaleString()}</h2>
          <p className="text-[11px] text-[#888888] flex items-center">
            <TrendingUp size={12} className="text-[#137333] mr-1" /> Linked to company net-banking settlements account
          </p>
        </div>

        <button
          onClick={() => setIsPayoutModalOpen(true)}
          className="flex items-center space-x-2 bg-[#2563EB] text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
        >
          <ArrowUpRight size={16} />
          <span>Withdraw Capital</span>
        </button>
      </div>

      {/* Transactions Ledger */}
      <div className="bg-white border border-[#EBEBEB] rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#1A1A1A] uppercase tracking-wider">Payments & Payout Ledger</h3>
        </div>

        {isLoading ? (
          <p className="text-xs text-[#888888] animate-pulse py-8 text-center">Loading transactions ledger...</p>
        ) : transactions.length === 0 ? (
          <p className="text-xs text-[#888888] py-8 text-center">No payment transactions registered in history.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#666666] font-semibold">
                  <th className="px-6 py-4">Transaction Reference</th>
                  <th className="px-6 py-4">Linked Booking</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Settled Cost</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBEB]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FAFAFA]/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {tx.gateway_transaction_id.startsWith('POUT_') ? (
                          <div className="w-6 h-6 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                            <ArrowUpRight size={12} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-green-50 text-[#137333] rounded-full flex items-center justify-center">
                            <ArrowDownLeft size={12} />
                          </div>
                        )}
                        <span className="font-bold text-[#1A1A1A] uppercase">{tx.gateway_transaction_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#666666] font-medium">
                      {tx.bookings?.booking_reference || 'Capital Withdrawal'}
                    </td>
                    <td className="px-6 py-4 text-[#666666] font-medium uppercase">
                      {tx.method.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${
                        tx.gateway_transaction_id.startsWith('POUT_') ? 'text-amber-600' : 'text-[#137333]'
                      }`}>
                        {tx.gateway_transaction_id.startsWith('POUT_') ? '-' : '+'} ₹{Number(tx.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#888888]">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(tx)}
                        className="p-1.5 text-[#2563EB] hover:text-blue-700 hover:bg-[#FAFAFA] rounded-lg transition cursor-pointer"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Withdrawal Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-[#EBEBEB] rounded-2xl w-[400px] shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                Withdraw Settled Capital
              </h3>
              <button onClick={() => setIsPayoutModalOpen(false)} className="text-[#666666] hover:text-[#1A1A1A] p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4 text-xs font-semibold text-[#666666]">
              <div className="space-y-1">
                <label>Withdrawal Amount (INR)</label>
                <input
                  type="number"
                  min={100}
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter withdrawal amount"
                  className="w-full bg-[#FAFAFA] border border-[#EBEBEB] px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#2563EB]"
                />
                <span className="text-[10px] text-[#888888] font-medium block pt-1">Max available: ₹{balance.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#EBEBEB]">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="bg-[#FAFAFA] border border-[#EBEBEB] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
