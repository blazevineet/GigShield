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
    // Correctly pulls from tab-specific sessionStorage via Zustand
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

    // 1. If it's not a 401, or it's a 401 on the refresh attempt itself, BAIL OUT
    if (error.response?.status !== 401 || original._retry || original.url?.includes('/auth/refresh')) {
      return Promise.reject(formatError(error));
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient.request(original); // Use .request for safety
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

      // 2. Perform the refresh call using a clean axios instance to avoid interceptor loops
      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      
      // Handle various payload structures
      const payload = res.data.data || res.data; 
      const newAccess = payload.accessToken || payload.access_token;
      const newRefresh = payload.refreshToken || payload.refresh_token;

      if (!newAccess) throw new Error('Refresh failed');

      // 3. Update the specific tab's session
      setTokens(newAccess, newRefresh || refreshToken);
      processQueue(null, newAccess);

      original.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient.request(original);

    } catch (refreshErr) {
      processQueue(refreshErr, null);
      // If refresh fails, this tab specifically is logged out
      useAuthStore.getState().logout();
      return Promise.reject(formatError(refreshErr as AxiosError));
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Error formatter ───────────────────────────────────────
function formatError(error: any): Error {
  const data = error.response?.data as any;
  const msg  = data?.error || data?.message || error.message || 'An unexpected error occurred';
  const err  = new Error(msg) as Error & { statusCode?: number; errors?: unknown[] };
  err.statusCode = error.response?.status;
  err.errors     = data?.errors;
  return err;
}

// ─── ML Service client ─────────────────────────────────────
export const mlClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_ML_URL || 'http://localhost:8000',
  timeout: 30_000, // Boosted to 30s for deadline safety (ML can be slow)
});

mlClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    console.error('🧠 ML Service Error:', error.response?.data || error.message);
    return Promise.reject(formatError(error));
  }
);