/**
 * GigShield — API Service Layer
 * All API calls go through these typed functions.
 */

import { apiClient, mlClient } from './client';

// ─── Types ─────────────────────────────────────────────────
export interface SendOtpPayload  { phone: string }
export interface VerifyOtpPayload{ phone: string; otp: string }
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn:   number;
  user: { id: string; name: string; phone: string; role: string; hasProfile: boolean };
}

export interface PolicyCreatePayload {
  tier:          string;
  zone:          string;
  platform:      string;
  avg_hours:     number;
  tenure_months: number;
  upi_id:        string;
}

export interface PremiumPrediction {
  base_premium:    number;
  final_premium:   number;
  risk_score:      number;
  multiplier:      number;
  coverage_hours:  number;
  safe_bonus:      number;
  off_season_bonus:number;
  tenure_bonus:    number;
  features:        Record<string, { value: number; weight: number; label: string }>;
  explanation:     string;
}

// ─── Auth ──────────────────────────────────────────────────
export const authApi = {
  sendOtp:      (data: SendOtpPayload)   => apiClient.post('/auth/otp/send',   data),
  verifyOtp:    (data: VerifyOtpPayload) => apiClient.post<AuthResponse>('/auth/otp/verify', data),
  refreshToken: (token: string)          => apiClient.post('/auth/token/refresh', { refreshToken: token }),
  logout:       ()                       => apiClient.post('/auth/logout'),
  getMe:        ()                       => apiClient.get('/auth/me'),
};

// ─── Workers ───────────────────────────────────────────────
export const workerApi = {
  createProfile: (data: any)   => apiClient.post('/workers/profile',     data),
  getProfile:    ()            => apiClient.get('/workers/profile'),
  updateProfile: (data: any)   => apiClient.patch('/workers/profile',    data),
  logGpsPing:    (data: any)   => apiClient.post('/workers/gps',         data),
};

// ─── Policies ──────────────────────────────────────────────
export const policyApi = {
  create:    (data: PolicyCreatePayload) => apiClient.post('/policies',       data),
  list:      (params?: any)              => apiClient.get('/policies',         { params }),
  getById:   (id: string)                => apiClient.get(`/policies/${id}`),
  renew:     (id: string)                => apiClient.post(`/policies/${id}/renew`),
  cancel:    (id: string)                => apiClient.delete(`/policies/${id}`),
};

// ─── Claims ────────────────────────────────────────────────
export const claimApi = {
  list:      (params?: any)  => apiClient.get('/claims',          { params }),
  getById:   (id: string)    => apiClient.get(`/claims/${id}`),
  review:    (id: string, data: { decision: string; adjusterNotes?: string }) =>
                                apiClient.patch(`/claims/${id}/review`, data),
};

// ─── Triggers ──────────────────────────────────────────────
export const triggerApi = {
  getLiveStatus: (zone?: string) => apiClient.get('/triggers/live', { params: { zone } }),
  getHistory:    (params?: any)  => apiClient.get('/triggers/history', { params }),
};

// ─── Admin ─────────────────────────────────────────────────
export const adminApi = {
  getStats:       ()           => apiClient.get('/admin/stats'),
  getZoneHeatmap: ()           => apiClient.get('/admin/heatmap'),
  getForecast:    ()           => apiClient.get('/admin/forecast'),
  getLossRatio:   (params?: any)=> apiClient.get('/admin/loss-ratio', { params }),
};

// ─── ML Service ────────────────────────────────────────────
export const mlApi = {
  predictPremium: (data: {
    zone: string; tier: string; avg_hours: number;
    tenure_months: number; is_monsoon: boolean;
  }) => mlClient.post<PremiumPrediction>('/premium/predict', data),

  getZoneProfiles: () => mlClient.get('/premium/zones'),

  scoreRisk: (data: {
    zone: string; trigger_type: string; value: number; threshold: number;
  }) => mlClient.post('/risk/score', data),
};
