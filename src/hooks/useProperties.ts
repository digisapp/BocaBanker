'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import type { Property } from '@/types';

interface UsePropertiesParams {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  propertyType?: string;
}

interface UsePropertiesReturn {
  properties: Property[];
  total: number;
  loading: boolean;
  error: string | null;
  mutate: () => void;
}

export function useProperties(params?: UsePropertiesParams): UsePropertiesReturn {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, forceRefresh] = useReducer((x: number) => x + 1, 0);

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const search = params?.search || '';
  const clientId = params?.clientId || '';
  const propertyType = params?.propertyType || '';

  useEffect(() => {
    let cancelled = false;

    const fetchProperties = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (search) queryParams.set('search', search);
        if (clientId) queryParams.set('clientId', clientId);
        if (propertyType) queryParams.set('propertyType', propertyType);

        const res = await fetch(`/api/properties?${queryParams}`);

        if (!res.ok) {
          throw new Error('Failed to fetch properties');
        }

        const data = await res.json();
        if (!cancelled) {
          setProperties(data.properties || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setProperties([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProperties();

    return () => {
      cancelled = true;
    };
  }, [page, limit, search, clientId, propertyType, refreshKey]);

  const mutate = useCallback(() => {
    forceRefresh();
  }, []);

  return { properties, total, loading, error, mutate };
}
