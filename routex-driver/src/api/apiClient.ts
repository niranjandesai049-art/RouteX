import axios from 'axios';
import Config from 'react-native-config';
import { store } from '../redux/store';
import { setCredentials, clearCredentials } from '../redux/slices/authSlice';
import { SecureStorage } from '../services/secureStorage';

// Read API URL from environment config
const BASE_URL = Config.API_BASE_URL || 'http://10.0.2.2:3000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject Access Token to request headers
apiClient.interceptors.request.use(
  async config => {
    const token = store.getState().auth.token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Capture expired tokens and automatically request token refreshes
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const state = store.getState().auth;

      if (state.refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken: state.refreshToken,
          });

          const { token, refreshToken } = response.data;

          // Save credentials in Redux
          store.dispatch(
            setCredentials({
              token,
              refreshToken,
              driverId: state.driverId || '',
              name: state.driverName || '',
            }),
          );

          // Save credentials in Secure Storage
          await SecureStorage.saveTokens(token, refreshToken);

          // Retry the original query
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          // Token refresh failed, clear credentials
          store.dispatch(clearCredentials());
          await SecureStorage.clearTokens();
          return Promise.reject(refreshErr);
        }
      }
    }

    return Promise.reject(error);
  },
);
