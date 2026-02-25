'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import type { Client } from '@/types';

interface UseClientsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface UseClientsReturn {
  clients: Client[];
  total: number;
  loading: boolean;
  error: string | null;
  mutate: () => void;
}

export function useClients(params?: UseClientsParams): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, forceRefresh] = useReducer((x: number) => x + 1, 0);

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const search = params?.search || '';
  const status = params?.status || '';

  useEffect(() => {
    let cancelled = false;

    const fetchClients = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (search) queryParams.set('search', search);
        if (status) queryParams.set('status', status);

        const res = await fetch(`/api/clients?${queryParams}`);

        if (!res.ok) {
          throw new Error('Failed to fetch clients');
        }

        const data = await res.json();
        if (!cancelled) {
          setClients(data.clients || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setClients([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchClients();

    return () => {
      cancelled = true;
    };
  }, [page, limit, search, status, refreshKey]);

  const mutate = useCallback(() => {
    forceRefresh();
  }, []);

  return { clients, total, loading, error, mutate };
}
