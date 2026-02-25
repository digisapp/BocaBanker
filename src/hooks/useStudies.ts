'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import type { CostSegStudy } from '@/types';

interface UseStudiesParams {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  propertyId?: string;
  status?: string;
}

interface UseStudiesReturn {
  studies: CostSegStudy[];
  total: number;
  loading: boolean;
  error: string | null;
  mutate: () => void;
}

export function useStudies(params?: UseStudiesParams): UseStudiesReturn {
  const [studies, setStudies] = useState<CostSegStudy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, forceRefresh] = useReducer((x: number) => x + 1, 0);

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const search = params?.search || '';
  const clientId = params?.clientId || '';
  const propertyId = params?.propertyId || '';
  const status = params?.status || '';

  useEffect(() => {
    let cancelled = false;

    const fetchStudies = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (search) queryParams.set('search', search);
        if (clientId) queryParams.set('clientId', clientId);
        if (propertyId) queryParams.set('propertyId', propertyId);
        if (status) queryParams.set('status', status);

        const res = await fetch(`/api/studies?${queryParams}`);

        if (!res.ok) {
          throw new Error('Failed to fetch studies');
        }

        const data = await res.json();
        if (!cancelled) {
          setStudies(data.studies || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setStudies([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStudies();

    return () => {
      cancelled = true;
    };
  }, [page, limit, search, clientId, propertyId, status, refreshKey]);

  const mutate = useCallback(() => {
    forceRefresh();
  }, []);

  return { studies, total, loading, error, mutate };
}
