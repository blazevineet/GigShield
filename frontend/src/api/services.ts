/**
 * GigShield — API Service Layer
 * Updated for Tab Isolation and Profile Syncing.
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
    zone?: string; // Added for zone-based logic
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
  // Standardized both naming conventions to prevent UI "undefined" bugs
  aiConfidence?: number;
  isAnomaly?: boolean;
  severity?: number;
  mlMetadata?: { 
    is_anomaly: boolean; 
    confidence: number; 
    severity: number 
  }; 
  firedAt: string;
  createdAt: string;
}

// ─── Auth ──────────────────────────────────────────────────
export const authApi = {
  sendOtp:      (data: SendOtpPayload)   => apiClient.post('/auth/otp/send',   data),
  verifyOtp:    (data: VerifyOtpPayload) => apiClient.post<AuthResponse>('/auth/otp/verify', data),
  refreshToken: (token: string)           => apiClient.post('/auth/refresh', { refreshToken: token }),
  logout:        ()                       => apiClient.post('/auth/logout'),
  getMe:         ()                       => apiClient.get<{ data: AuthResponse['user'] }>('/auth/me'),
};

// ─── Workers ───────────────────────────────────────────────
export const workerApi = {
  // Returns updated user info so we can update the Store
  createProfile: (data: any) => apiClient.post('/workers/profile', data), 
  updateProfile: (data: any) => apiClient.post('/workers/profile', data), 
  
  getProfile:    ()          => apiClient.get('/workers/profile'),
  pingGps:       (data: { lat: number; lon: number; accuracy?: number; speed?: number }) => 
    apiClient.post('/workers/gps', data),
};

// ─── Policies ──────────────────────────────────────────────
export const policyApi = {
  create:    (data: any)      => apiClient.post('/policies',       data),
  list:      (params?: any)   => apiClient.get<{ data: any[] }>('/policies', { params }),
  getById:   (id: string)     => apiClient.get(`/policies/${id}`),
};

// ─── Claims ────────────────────────────────────────────────
export const claimApi = {
  list:      (params?: any)  => apiClient.get<{ data: Claim[] }>('/claims', { params }),
  getById:   (id: string)    => apiClient.get(`/claims/${id}`),
  create:    (data: { 
    policyId: string; 
    triggerType: string; 
    triggerValue: number; 
    threshold: number;
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
};

// ─── ML Service ────────────────────────────────────────────
export const mlApi = {
  predictPremium: (data: any) => mlClient.post<PremiumPrediction>('/premium/predict', data),
  scoreRisk: (data: {
    zone: string; trigger_type: string; value: number; threshold: number;
  }) => mlClient.post('/risk/score', data),
};