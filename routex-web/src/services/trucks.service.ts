import { api } from '../lib/api';

export interface CreateTruckDto {
  rcNo: string;
  insuranceNo: string;
  category: string;
  capacityTons: number;
}

export interface TruckResponse {
  id: string;
  plate_number: string;
  model_name: string;
  brand: string;
  type: string;
  payload_capacity_kg: number;
  fuel_type: string;
  status: string;
  is_verified: boolean;
}

export const trucksService = {
  async create(dto: CreateTruckDto): Promise<TruckResponse> {
    const response = await api.post<TruckResponse>('/trucks', dto);
    return response.data;
  },

  async findAll(): Promise<TruckResponse[]> {
    const response = await api.get<TruckResponse[]>('/trucks');
    return response.data;
  },

  async findOne(id: string): Promise<TruckResponse> {
    const response = await api.get<TruckResponse>(`/trucks/${id}`);
    return response.data;
  },
};
