import { apiClient } from './apiClient';

export class BookingsApi {
  static async getAvailableJobs() {
    // Queries jobs matching driver status
    const response = await apiClient.get('/booking/available');
    return response.data;
  }

  static async acceptJob(bookingId: string) {
    const response = await apiClient.post(`/booking/${bookingId}/accept`);
    return response.data;
  }

  static async rejectJob(bookingId: string) {
    const response = await apiClient.post(`/booking/${bookingId}/reject`);
    return response.data;
  }

  static async submitEpod(bookingId: string, signatureBase64: string) {
    const response = await apiClient.post(`/booking/${bookingId}/epod`, {
      signature: signatureBase64,
    });
    return response.data;
  }

  static async updateLocation(
    latitude: number,
    longitude: number,
    heading?: number,
    speed?: number,
  ) {
    // Sends GPS tracking coordinates to tracking endpoint
    const response = await apiClient.put('/drivers/location', {
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
    });
    return response.data;
  }

  static async createBooking(data: {
    shipperId: string;
    pickupAddress: string;
    destAddress: string;
    waypoints?: string[];
    distanceKm: number;
    weightTons: number;
    truckCategory: string;
    loadType: string;
    price: number;
  }) {
    const response = await apiClient.post('/booking', data);
    return response.data;
  }

  static async getBookingDetails(bookingId: string) {
    const response = await apiClient.get(`/booking/${bookingId}`);
    return response.data;
  }

  static async predictPricing(data: {
    pickup: string;
    destination: string;
    waypoints?: string[];
    distanceKm: number;
    weightTons: number;
    truckCategory: string;
    weather: string;
    fuelPrice: number;
    demandLevel: string;
  }) {
    const response = await apiClient.post('/ai-pricing/predict', data);
    return response.data;
  }
}
