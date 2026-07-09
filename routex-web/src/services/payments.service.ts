import { api } from '../lib/api';

export interface PaymentResponse {
  id: string;
  booking_id: string;
  wallet_id?: string;
  amount: string | number;
  currency: string;
  method: string;
  status: string;
  created_at: string;
}

export const paymentsService = {
  async create(bookingId: string, amount: number, paymentMethod: string): Promise<PaymentResponse> {
    const response = await api.post<PaymentResponse>('/payments', { bookingId, amount, paymentMethod });
    return response.data;
  },

  async findOne(bookingId: string): Promise<PaymentResponse> {
    const response = await api.get<PaymentResponse>(`/payments/${bookingId}`);
    return response.data;
  },

  async findAll(): Promise<PaymentResponse[]> {
    const response = await api.get<PaymentResponse[]>('/payments');
    return response.data;
  },
};
