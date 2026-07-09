import { apiClient } from './apiClient';

export class WalletApi {
  static async getBalance() {
    const response = await apiClient.get('/wallet/driver/balance');
    return response.data; // { balance, currency, isActive }
  }

  static async getHistory() {
    const response = await apiClient.get('/wallet/driver/history');
    return response.data; // List of transactions
  }

  static async requestSettlement(amount: number, bankDetails: any) {
    const response = await apiClient.post('/wallet/driver/settlement', {
      amount,
      bankDetails,
    });
    return response.data;
  }

  static async requestWithdrawal(
    amount: number,
    payoutMethod: string,
    payoutDetails?: any,
  ) {
    const response = await apiClient.post('/wallet/driver/withdrawal', {
      amount,
      payoutMethod,
      payoutDetails,
    });
    return response.data;
  }
}
