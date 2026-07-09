import { api } from '../lib/api';

export interface CompanyProfileResponse {
  id: string;
  name: string;
  gstin?: string;
  type?: string;
  owner_id: string;
}

export const companiesService = {
  async getProfile(): Promise<CompanyProfileResponse> {
    const response = await api.get<CompanyProfileResponse>('/companies/profile');
    return response.data;
  },

  async updateProfile(companyName: string, gstNo: string): Promise<CompanyProfileResponse> {
    const response = await api.put<CompanyProfileResponse>('/companies/profile', { companyName, gstNo });
    return response.data;
  },
};
