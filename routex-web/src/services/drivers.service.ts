import { api } from '../lib/api';

export interface DriverProfileResponse {
  id: string;
  license_number: string;
  license_expiry: string;
  years_of_experience: number;
  status: string;
  verification_state: string;
}

export const driversService = {
  async getProfile(): Promise<DriverProfileResponse> {
    const response = await api.get<DriverProfileResponse>('/drivers/profile');
    return response.data;
  },

  async toggleOnline(): Promise<any> {
    const response = await api.put('/drivers/online');
    return response.data;
  },

  async updateLocation(lat: number, lng: number): Promise<any> {
    const response = await api.put('/drivers/location', { latitude: lat, longitude: lng });
    return response.data;
  },
};
