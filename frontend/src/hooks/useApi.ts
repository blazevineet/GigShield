/**
 * GigShield — Custom React Query Hooks (Phase 3 Optimized)
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { policyApi, claimApi, adminApi, mlApi, Claim } from '../api/services';

export const QUERY_KEYS = {
  policies:    ['policies']           as const,
  policy:      (id: string)    => ['policies', id] as const,
  claims:      ['claims']           as const,
  claim:       (id: string)    => ['claims', id] as const,
  adminStats:  ['admin', 'stats'] as const,
  heatmap:     ['admin', 'heatmap'] as const,
  forecast:    ['admin', 'forecast'] as const,
};

// --- Policies ---
// UPDATED: Added 'options' argument to support refetchInterval and other configs
export function usePolicies(params?: any, options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: [...QUERY_KEYS.policies, params],
    queryFn: () => policyApi.list(params).then((r: any) => r.data),
    staleTime: 30_000,
    retry: 2,
    ...options, // Spreads options like refetchInterval: 3000
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => policyApi.create(data).then((r: any) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.policies });
      toast.success('Policy activated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create policy');
    },
  });
}

// --- Claims ---
// UPDATED: Added 'options' argument to support refetchInterval
export function useClaims(params?: any, options?: Partial<UseQueryOptions<{ data: Claim[], meta?: any }>>) {
  return useQuery<{ data: Claim[], meta?: any }>({
    queryKey: [...QUERY_KEYS.claims, params],
    queryFn: () => claimApi.list(params).then((r: any) => r.data),
    staleTime: 10_000,
    // Provide a default but allow 'options' to override it
    refetchInterval: 15_000, 
    ...options, 
  });
}

/**
 * PHASE 3: Automated Claim Creation
 * Levelled Up to support ML simulation data
 */
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
      // Aggressive cache clearing to update Total Recovered immediately
      qc.invalidateQueries({ queryKey: QUERY_KEYS.claims });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.policies });

      toast.success('Instant Payout Processed!', { 
        icon: '💸',
        duration: 4000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: 'bold'
        }
      });
    },
    onError: (err: any) => {
      console.error('Auto-claim trigger failed:', err);
    }
  });
}

export function useReviewClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: 'APPROVED' | 'REJECTED'; notes?: string }) =>
      claimApi.review(id, { decision, adjusterNotes: notes }).then((r: any) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.claims });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
      toast.success(`Claim ${vars.decision.toLowerCase()}`);
    },
  });
}

// --- Admin ---
export function useAdminStats(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: QUERY_KEYS.adminStats,
    queryFn: () => adminApi.getStats().then((r: any) => r.data),
    staleTime: 10_000,
    ...options,
  });
}

export function useZoneHeatmap() {
  return useQuery({
    queryKey: QUERY_KEYS.heatmap,
    queryFn: () => adminApi.getZoneHeatmap().then((r: any) => r.data),
    staleTime: 60_000,
  });
}

// --- ML Premium ---
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