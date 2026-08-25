import { api } from '../lib/api';

export interface WalletBalanceResponse {
  walletBalance: number;
}

export const walletService = {
  async getBalance(): Promise<WalletBalanceResponse> {
    try {
      const response = await api.get<WalletBalanceResponse>('/wallet/balance');
      return response.data;
    } catch (err: any) {
      console.warn('[RouteX Auth] Wallet balance fallback used:', err.message);
      return { walletBalance: 0 };
    }
  },

  async deposit(amount: number): Promise<WalletBalanceResponse> {
    const response = await api.post<WalletBalanceResponse>('/wallet/deposit', { amount });
    return response.data;
  },

  async withdraw(amount: number): Promise<WalletBalanceResponse> {
    const response = await api.post<WalletBalanceResponse>('/wallet/payout', { amount });
    return response.data;
  },
};
