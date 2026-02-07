'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [refreshKey, setRefreshKey] = useState(0);

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const search = params?.search || '';
  const status = params?.status || '';

  const fetchClients = useCallback(async () => {
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
      setClients(data.clients || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setClients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, refreshKey]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const mutate = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return { clients, total, loading, error, mutate };
}
