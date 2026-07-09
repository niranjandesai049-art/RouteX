import { api } from '../lib/api';

export interface WalletBalanceResponse {
  walletBalance: number;
}

export const walletService = {
  async getBalance(): Promise<WalletBalanceResponse> {
    const response = await api.get<WalletBalanceResponse>('/wallet/balance');
    return response.data;
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
