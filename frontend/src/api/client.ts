/**
 * GigShield Frontend — API Client
 * Axios instance with improved token refresh and Phase 3 resilience.
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

// ─── Main API client ───────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, 
});

// ─── Request interceptor: attach access token ──────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err),
);

// ─── Response interceptor: handle 401, refresh token ──────
let isRefreshing   = false;
let failedQueue:   { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  );
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(formatError(error));
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      
      if (!refreshToken) {
        logout();
        return Promise.reject(new Error('Session expired.'));
      }

      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const payload = res.data.data || res.data; 
      const { accessToken: newAccess, refreshToken: newRefresh } = payload;

      if (!newAccess) throw new Error('Refresh failed');

      setTokens(newAccess, newRefresh || refreshToken);
      processQueue(null, newAccess);

      original.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(original);

    } catch (refreshErr) {
      processQueue(refreshErr, null);
      useAuthStore.getState().logout();
      return Promise.reject(formatError(refreshErr as AxiosError));
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Error formatter ───────────────────────────────────────
function formatError(error: AxiosError): Error {
  const data = error.response?.data as any;
  const msg  = data?.error || data?.message || error.message || 'An unexpected error occurred';
  const err  = new Error(msg) as Error & { statusCode?: number; errors?: unknown[] };
  err.statusCode = error.response?.status;
  err.errors     = data?.errors;
  return err;
}

// ─── ML Service client ─────────────────────────────────────
/**
 * Phase 3: ML Client is now more robust to handle timeouts 
 * from the heavy Python computation.
 */
export const mlClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_ML_URL || 'http://localhost:8000',
  timeout: 20_000, // Increased for complex risk scoring
});

// ML Interceptor to catch Python FastAPI errors
mlClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    console.error('🧠 ML Service Error:', error.response?.data || error.message);
    return Promise.reject(formatError(error));
  }
);