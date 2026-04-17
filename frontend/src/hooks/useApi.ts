/**
 * GigShield — Custom React Query Hooks (Final Demo Optimized)
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { policyApi, claimApi, adminApi, mlApi, workerApi, Claim } from '../api/services';
import { useAuthStore } from '../store/authStore'; // Added to sync local state

export const QUERY_KEYS = {
  userProfile: ['user', 'profile'] as const,
  policies:     ['policies']           as const,
  policy:       (id: string)    => ['policies', id] as const,
  claims:       ['claims']           as const,
  claim:        (id: string)    => ['claims', id] as const,
  adminStats:   ['admin', 'stats'] as const,
  heatmap:      ['admin', 'heatmap'] as const,
  forecast:     ['admin', 'forecast'] as const,
};

// --- User & Worker Profile ---

export function useUserProfile(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: QUERY_KEYS.userProfile,
    queryFn: () => workerApi.getProfile().then((r: any) => r.data),
    staleTime: 60_000,
    ...options,
  });
}

/**
 * UPDATED: Added useUpdateProfile
 * This ensures that when onboarding is complete, the app instantly 
 * redirects the user to the Dashboard by updating the AuthStore.
 */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = useAuthStore(state => state.setUser);

  return useMutation({
    mutationFn: (data: any) => workerApi.updateProfile(data).then((r: any) => r.data),
    onSuccess: (data) => {
      // 1. Refresh React Query cache
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
      
      // 2. CRITICAL: Sync the global auth state
      // Assuming your backend returns { user: { ... } } or just the user object
      const updatedUser = data.user || data;
      if (updatedUser) {
        setUser(updatedUser);
      }

      toast.success('Profile verified by AI!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Verification failed');
    }
  });
}

// --- Policies ---

export function usePolicies(params?: any, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: [...QUERY_KEYS.policies, params],
    queryFn: () => policyApi.list(params).then((r: any) => r.data),
    staleTime: 5_000, 
    ...options,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => policyApi.create(data).then((r: any) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.policies });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
      toast.success('Policy activated successfully!', { icon: '🛡️' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create policy');
    },
  });
}

// --- Claims ---

export function useClaims(params?: any, options?: Partial<UseQueryOptions<{ data: Claim[], meta?: any }>>) {
  return useQuery<{ data: Claim[], meta?: any }>({
    queryKey: [...QUERY_KEYS.claims, params],
    queryFn: () => claimApi.list(params).then((r: any) => r.data),
    staleTime: 2_000, 
    refetchInterval: 3000, 
    ...options, 
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { 
      policyId: string; 
      triggerType: string; 
      triggerValue: number; 
      threshold: number;
      mlMetadata?: any 
    }) => claimApi.create(data).then((r: any) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(); 
      toast.success('Instant Payout Processed!', { 
        icon: '💸',
        duration: 4000,
        style: { background: '#10b981', color: '#fff', fontWeight: 'bold' }
      });
    },
    onError: (err: any) => {
      if (err?.response?.status !== 422) {
        console.error('Auto-claim trigger failed:', err);
      }
    }
  });
}

// --- Admin ---

export function useAdminStats(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: QUERY_KEYS.adminStats,
    queryFn: () => adminApi.getStats().then((r: any) => r.data),
    staleTime: 2_000,
    refetchInterval: 3000, 
    ...options,
  });
}

export function useZoneHeatmap(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: QUERY_KEYS.heatmap,
    queryFn: () => adminApi.getZoneHeatmap().then((r: any) => r.data),
    staleTime: 5_000,
    refetchInterval: 5000, 
    ...options,
  });
}

// --- ML Premium Prediction ---

export function usePremiumPrediction(
  params: { zone: string; tier: string; avg_hours: number; tenure_months: number; is_monsoon: boolean },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['premium', params],
    queryFn: () => mlApi.predictPremium(params).then((r: any) => r.data),
    enabled: enabled && !!params.zone,
    staleTime: 10_000,
  });
}