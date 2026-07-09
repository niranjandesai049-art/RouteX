import { api } from '../lib/api';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  verification_state: string;
  is_active: boolean;
}

export const usersService = {
  async getProfile(id: string): Promise<UserProfile> {
    const response = await api.get<UserProfile>(`/users/${id}`);
    return response.data;
  },

  async verifyKYC(id: string, isVerified: boolean): Promise<UserProfile> {
    const response = await api.put<UserProfile>(`/users/${id}/verify`, { isVerified });
    return response.data;
  },
};
