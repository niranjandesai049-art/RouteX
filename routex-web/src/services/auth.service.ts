import { api } from '../lib/api';

export interface UserResponse {
  id: string;
  name: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}

export const authService = {
  async login(phone: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', { phone });
    return response.data;
  },

  async register(name: string, phone: string, role: string, email?: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', { name, phone, role, email });
    return response.data;
  },
};
