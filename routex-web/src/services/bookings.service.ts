import { api } from '../lib/api';

export interface BookingResponse {
  id: string;
  booking_reference: string;
  shipper_id: string;
  driver_id?: string;
  truck_id?: string;
  cargo_description: string;
  estimated_weight_kg: string | number;
  pickup_address: any;
  delivery_address: any;
  quoted_price: string | number;
  currency: string;
  status: string;
  actual_pickup?: string;
  actual_delivery?: string;
  created_at: string;
  booking_stops?: any[];
}

export interface CreateBookingDto {
  shipperId: string;
  pickupAddress: string;
  destAddress: string;
  distanceKm: number;
  weightTons: number;
  truckCategory: string;
  loadType: string;
  price: number;
}

export const bookingsService = {
  async create(dto: CreateBookingDto): Promise<BookingResponse> {
    const response = await api.post<BookingResponse>('/bookings', dto);
    return response.data;
  },

  async findAll(shipperId?: string): Promise<BookingResponse[]> {
    const url = shipperId ? `/bookings?shipperId=${encodeURIComponent(shipperId)}` : '/bookings';
    const response = await api.get<any>(url);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.bookings)) return data.bookings;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  async findOne(id: string): Promise<BookingResponse> {
    const response = await api.get<BookingResponse>(`/bookings/${id}`);
    return response.data;
  },

  async assignDriver(id: string, driverId: string): Promise<BookingResponse> {
    const response = await api.put<BookingResponse>(`/bookings/${id}/assign`, { driverId });
    return response.data;
  },

  async acceptBooking(id: string): Promise<BookingResponse> {
    const response = await api.post<BookingResponse>(`/bookings/${id}/accept`);
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<BookingResponse> {
    const response = await api.put<BookingResponse>(`/bookings/${id}/status`, { status });
    return response.data;
  },

  async submitEpod(id: string, signature: string): Promise<BookingResponse> {
    const response = await api.post<BookingResponse>(`/bookings/${id}/epod`, { signature });
    return response.data;
  },
};
