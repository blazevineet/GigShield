/**
 * GigShield — API Service Layer (Phase 3 Intelligence Optimized)
 * Consolidated and typed for React Query Hooks.
 */

import { apiClient, mlClient } from './client';

// ─── Types ─────────────────────────────────────────────────
export interface SendOtpPayload  { phone: string }
export interface VerifyOtpPayload { phone: string; otp: string }

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn:   number;
  user: { 
    id: string; 
    name: string; 
    phone: string; 
    role: string; 
    hasProfile: boolean; 
    upiId?: string; 
  };
}

export interface PremiumPrediction {
  base_premium:    number;
  final_premium:   number;
  risk_score:      number;
  multiplier:      number;
  coverage_hours:  number;
  safe_bonus:      number;
  features:        Record<string, { value: number; weight: number; label: string }>;
  explanation:     string;
}

export interface Claim {
  id: string;
  policyId: string;
  triggerType: string;
  triggerValue: number;
  threshold: number;
  payoutAmount: number;
  status: 'PENDING' | 'AUTO_APPROVED' | 'SOFT_HOLD' | 'HARD_HOLD' | 'PAID' | 'REJECTED' | 'SETTLED' | 'MANUAL_REVIEW';
  aiConfidence?: number;
  isAnomaly?: boolean;
  severity?: number;
  alerts?: string[];
  // ─── CRITICAL UPDATE FOR PHASE 3 ───
  // This allows the frontend to read the ML analysis returned by the backend
  mlMetadata?: { 
    is_anomaly: boolean; 
    confidence: number; 
    severity: number 
  }; 
  // ───────────────────────────────────
  firedAt: string;
  createdAt: string;
  settledAt?: string;
  resolvedAt?: string;
  adjusterNotes?: string;
}

// ─── Auth ──────────────────────────────────────────────────
export const authApi = {
  sendOtp:      (data: SendOtpPayload)   => apiClient.post('/auth/otp/send',   data),
  verifyOtp:    (data: VerifyOtpPayload) => apiClient.post<AuthResponse>('/auth/otp/verify', data),
  refreshToken: (token: string)          => apiClient.post('/auth/refresh', { refreshToken: token }),
  logout:        ()                       => apiClient.post('/auth/logout'),
  getMe:         ()                       => apiClient.get('/auth/me'),
};

// ─── Workers ───────────────────────────────────────────────
export const workerApi = {
  createProfile: (data: any)   => apiClient.post('/workers/profile',     data),
  getProfile:    ()            => apiClient.get('/workers/profile'),
  updateProfile: (data: any)   => apiClient.patch('/workers/profile',    data),
  logGpsPing:    (data: { lat: number; lon: number; accuracy?: number; speed?: number }) => 
    apiClient.post('/workers/gps', data),
};

// ─── Policies ──────────────────────────────────────────────
export const policyApi = {
  create:    (data: any)      => apiClient.post('/policies',       data),
  list:      (params?: any)   => apiClient.get('/policies',         { params }),
  getById:   (id: string)     => apiClient.get(`/policies/${id}`),
  renew:     (id: string)     => apiClient.post(`/policies/${id}/renew`),
  cancel:    (id: string)     => apiClient.delete(`/policies/${id}`),
};

// ─── Claims ────────────────────────────────────────────────
export const claimApi = {
  list:      (params?: any)  => apiClient.get('/claims',           { params }),
  getById:   (id: string)    => apiClient.get(`/claims/${id}`),
  create:    (data: { 
    policyId: string; 
    triggerType: string; 
    triggerValue: number; 
    threshold: number;
    // Explicitly typing the metadata payload for the POST request
    mlMetadata?: { is_anomaly: boolean; confidence: number; severity: number };
  }) => apiClient.post('/claims', data), 
  review:    (id: string, data: { decision: 'APPROVED' | 'REJECTED'; adjusterNotes?: string }) =>
                                 apiClient.patch(`/claims/${id}/review`, data),
};

// ─── Triggers ──────────────────────────────────────────────
export const triggerApi = {
  getLiveStatus: (zone?: string) => apiClient.get('/triggers/live', { params: { zone } }),
  getHistory:    (params?: any)  => apiClient.get('/triggers/history', { params }),
};

// ─── Admin ─────────────────────────────────────────────────
export const adminApi = {
  getStats:        ()            => apiClient.get('/admin/stats'),
  getZoneHeatmap:  ()            => apiClient.get('/admin/heatmap'),
  getForecast:     ()            => apiClient.get('/admin/forecast'),
  getLossRatio:    (params?: any)=> apiClient.get('/admin/loss-ratio', { params }),
};

// ─── ML Service ────────────────────────────────────────────
export const mlApi = {
  predictPremium: (data: any) => mlClient.post<PremiumPrediction>('/premium/predict', data),
  scoreRisk: (data: {
    zone: string; trigger_type: string; value: number; threshold: number;
  }) => mlClient.post('/risk/score', data),
};