import { api } from '../lib/api';

export interface FleetTruckResponse {
  id: string;
  plate_number: string;
  model_name: string;
  brand: string;
  type: string;
  payload_capacity_kg: number;
  status: string;
  is_verified: boolean;
  drivers?: any;
}

export const fleetService = {
  async getTrucks(): Promise<FleetTruckResponse[]> {
    const response = await api.get<FleetTruckResponse[]>('/fleet/trucks');
    return response.data;
  },

  async assignDriver(vehicleId: string, driverProfileId: string): Promise<any> {
    const response = await api.post('/fleet/assign-driver', { vehicleId, driverProfileId });
    return response.data;
  },
};
