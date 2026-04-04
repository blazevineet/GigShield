/**
 * GigShield — Custom React Query Hooks
 * Updated for TanStack Query v4/v5 (Object-based syntax)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Check if you use @tanstack/react-query or react-query
import toast from 'react-hot-toast';
import { policyApi, claimApi, adminApi, mlApi } from '../api/services';

// ─── Query Keys ────────────────────────────────────────────
export const QUERY_KEYS = {
  policies:    ['policies']          as const,
  policy:      (id: string)    => ['policies', id] as const,
  claims:      ['claims']          as const,
  claim:       (id: string)    => ['claims', id] as const,
  adminStats:  ['admin', 'stats'] as const,
  heatmap:     ['admin', 'heatmap'] as const,
  forecast:    ['admin', 'forecast'] as const,
};

// ─── Policies ──────────────────────────────────────────────
export function usePolicies(params?: any) {
  return useQuery({
    queryKey: [...QUERY_KEYS.policies, params],
    queryFn: () => policyApi.list(params).then(r => r.data),
    staleTime: 30_000,
    retry: 2,
  });
}

export function usePolicy(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.policy(id),
    queryFn: () => policyApi.getById(id).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => policyApi.create(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.policies });
      toast.success('Policy activated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create policy');
    },
  });
}

// ─── Claims ────────────────────────────────────────────────
export function useClaims(params?: any) {
  return useQuery({
    queryKey: [...QUERY_KEYS.claims, params],
    queryFn: () => claimApi.list(params).then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useClaim(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.claim(id),
    queryFn: () => claimApi.getById(id).then(r => r.data),
    enabled: !!id,
  });
}

export function useReviewClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: string; notes?: string }) =>
      claimApi.review(id, { decision, adjusterNotes: notes }).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.claims });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.claim(vars.id) });
      toast.success(`Claim ${vars.decision.toLowerCase()}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Review failed');
    },
  });
}

// ─── Admin ─────────────────────────────────────────────────
export function useAdminStats() {
  return useQuery({
    queryKey: QUERY_KEYS.adminStats,
    queryFn: () => adminApi.getStats().then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useZoneHeatmap() {
  return useQuery({
    queryKey: QUERY_KEYS.heatmap,
    queryFn: () => adminApi.getZoneHeatmap().then(r => r.data),
    staleTime: 120_000,
  });
}

// ─── ML Premium ────────────────────────────────────────────
export function usePremiumPrediction(
  params: { zone: string; tier: string; avg_hours: number; tenure_months: number; is_monsoon: boolean },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['premium', params],
    queryFn: () => mlApi.predictPremium(params).then(r => r.data),
    enabled,
    staleTime: 10_000,
    retry: 1,
    // Note: In Query v5, onError is moved to the global cache level or useMutation.
    // For v4, keeping it here is fine.
  });
}