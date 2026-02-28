'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import { logger } from '@/lib/logger';
import type { Lead } from '@/types';

interface UseLeadsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  propertyType?: string;
  priority?: string;
  minPrice?: string;
  maxPrice?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UseLeadsReturn {
  leads: Lead[];
  total: number;
  loading: boolean;
  error: string | null;
  mutate: () => void;
}

export function useLeads(params?: UseLeadsParams): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, forceRefresh] = useReducer((x: number) => x + 1, 0);

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const search = params?.search || '';
  const status = params?.status || '';
  const propertyType = params?.propertyType || '';
  const priority = params?.priority || '';
  const minPrice = params?.minPrice || '';
  const maxPrice = params?.maxPrice || '';
  const dateFrom = params?.dateFrom || '';
  const dateTo = params?.dateTo || '';

  useEffect(() => {
    let cancelled = false;

    const fetchLeads = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (search) queryParams.set('search', search);
        if (status) queryParams.set('status', status);
        if (propertyType) queryParams.set('propertyType', propertyType);
        if (priority) queryParams.set('priority', priority);
        if (minPrice) queryParams.set('minPrice', minPrice);
        if (maxPrice) queryParams.set('maxPrice', maxPrice);
        if (dateFrom) queryParams.set('dateFrom', dateFrom);
        if (dateTo) queryParams.set('dateTo', dateTo);

        const res = await fetch(`/api/leads?${queryParams}`);

        if (!res.ok) {
          throw new Error('Failed to fetch leads');
        }

        const data = await res.json();
        if (!cancelled) {
          setLeads(data.leads || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          logger.error('useLeads', 'Failed to fetch leads', err);
          setError(err instanceof Error ? err.message : 'An error occurred');
          setLeads([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchLeads();

    return () => {
      cancelled = true;
    };
  }, [page, limit, search, status, propertyType, priority, minPrice, maxPrice, dateFrom, dateTo, refreshKey]);

  const mutate = useCallback(() => {
    forceRefresh();
  }, []);

  return { leads, total, loading, error, mutate };
}
