import { apiClient } from './apiClient';

export interface DriverProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  experience_years: number;
  status: string;
  vehicle: any | null;
}

export interface AuthResponse {
  token: string;
  accessToken: string;
  refreshToken: string;
  profile: DriverProfile;
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
    isVerified: boolean;
  };
}

export class AuthApi {
  /**
   * Legacy login — kept for backward compatibility.
   * @deprecated Use firebaseSync() for new Firebase Phone Auth flow.
   */
  static async login(email: string, phone: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      phone,
    });
    return response.data;
  }

  /**
   * Exchange a Firebase Phone Auth ID token for a RouteX backend JWT.
   * Called after the driver completes OTP verification in Firebase.
   */
  static async firebaseSync(firebaseIdToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/auth/firebase-sync',
      {},
      {
        headers: {
          Authorization: `Bearer ${firebaseIdToken}`,
        },
      },
    );
    return response.data;
  }

  static async sendBackendOtp(phone: string): Promise<{ success: boolean; message: string; verificationId: string; devOtp?: string }> {
    const response = await apiClient.post('/auth/phone/send-otp', {
      phoneNumber: phone,
      phone,
    });
    return response.data;
  }

  static async verifyBackendOtp(
    phone: string,
    otp: string,
    verificationId?: string,
    role: string = 'driver',
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/phone/verify-otp', {
      phoneNumber: phone,
      phone,
      otp,
      verificationId,
      role,
    });
    return response.data;
  }

  static async getProfile() {
    const response = await apiClient.get('/users/profile');
    return response.data;
  }
}
