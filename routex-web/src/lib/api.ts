import axios from 'axios';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
// Normalize base URL to ensure /api suffix is present
const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to attach JWT token and log diagnostics in development
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[RouteX Auth] Sending request to: ${config.baseURL}${config.url}`);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling authorization and diagnostics
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      console.log(`[RouteX Auth] Received ${response.status} from: ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const msg = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join('; ')
        : error.response?.data?.message || error.message || 'Network / Connectivity Error';

      console.error(
        `[RouteX Auth] API Call Error [${error.response?.status || 'NETWORK_ERR'}]: ${msg}`,
        {
          baseURL: API_URL,
          endpoint: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        }
      );
    }

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
