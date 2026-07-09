'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, FileText, Download, Building2 } from 'lucide-react';
import { walletService } from '../../../services/wallet.service';

export default function WalletPage() {
  const { user, showToast } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock transactions since backend doesn't store ledger history yet
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await walletService.getBalance();
      setBalance(res.walletBalance);
      
      // Generate some mock history based on balance
      setTransactions([
        { id: 'TXN-9842', type: 'deposit', amount: res.walletBalance > 0 ? res.walletBalance : 5000, date: new Date().toLocaleDateString(), status: 'success', method: 'UPI / NetBanking' },
        { id: 'TXN-9112', type: 'deduction', amount: 1500, date: new Date(Date.now() - 86400000).toLocaleDateString(), status: 'success', method: 'Shipment #TX-863352' },
      ]);
    } catch (err) {
      showToast('Error loading wallet balance', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate Razorpay Gateway delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await walletService.deposit(parseFloat(depositAmount));
      showToast(`₹${depositAmount} added to wallet successfully!`, 'success');
      setDepositAmount('');
      fetchWallet();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Deposit failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Wallet className="mr-2 text-blue-600" /> Wallet & Billing
        </h2>
        <p className="text-gray-500 text-sm mt-1">Manage your prepaid freight balance, invoices, and payment history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8"></div>
            <div className="relative z-10">
              <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider mb-2">Available Balance</p>
              <h3 className="text-4xl font-extrabold mb-6">₹{balance.toLocaleString()}</h3>
              <div className="flex items-center text-sm text-blue-100">
                <Building2 size={16} className="mr-1" /> RouteX Corporate Account
              </div>
            </div>
          </div>

          {/* Top-up Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <CreditCard className="mr-2 text-gray-400" size={20} /> Add Funds to Wallet
            </h3>
            
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-gray-500 font-bold">₹</span>
                  <input 
                    type="number" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount to add" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-8 pr-4 text-sm focus:border-blue-600 outline-none transition font-bold text-gray-900"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000].map(amt => (
                  <button 
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt.toString())}
                    className="py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <button 
                type="submit" 
                disabled={isProcessing}
                className={`w-full font-bold py-3 rounded-lg text-sm transition shadow-sm flex items-center justify-center mt-2 ${
                  isProcessing
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Processing Payment Gateway...
                  </>
                ) : 'Proceed to Pay Securely'}
              </button>
              <p className="text-[10px] text-center text-gray-400 mt-2">Secured by Razorpay. UPI, NetBanking, and Cards accepted.</p>
            </form>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Transaction History</h3>
              <button className="text-sm text-blue-600 font-semibold hover:text-blue-700 flex items-center">
                <Download size={16} className="mr-1" /> Download Statement
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 text-xs">
                    <th className="p-4">TRANSACTION</th>
                    <th className="p-4">DATE</th>
                    <th className="p-4">METHOD / REFERENCE</th>
                    <th className="p-4 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => (
                    <tr key={txn.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            txn.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {txn.type === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{txn.id}</p>
                            <p className="text-xs text-gray-500 capitalize">{txn.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{txn.date}</td>
                      <td className="p-4 text-gray-600">{txn.method}</td>
                      <td className={`p-4 text-right font-bold ${txn.type === 'deposit' ? 'text-green-600' : 'text-gray-900'}`}>
                        {txn.type === 'deposit' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Generated Invoices & ePODs</h3>
              <p className="text-xs text-gray-500 mt-1">Available for completed trips only.</p>
            </div>
            <div className="p-8 text-center">
              <FileText size={48} className="mx-auto mb-4 text-gray-200" />
              <h4 className="text-gray-900 font-bold mb-1">No pending invoices</h4>
              <p className="text-sm text-gray-500">Complete a trip to generate an invoice and view the electronic Proof of Delivery (ePOD).</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
