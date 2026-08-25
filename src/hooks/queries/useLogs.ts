import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient';

export const fetchLogs = async () => {
  const res = await apiFetch('/api/logs');
  if (!res.ok) throw new Error('Failed to fetch logs');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const fetchMetrics = async () => {
  const res = await apiFetch('/api/crowdsec/metrics');
  if (!res.ok) throw new Error('Failed to fetch metrics');
  const data = await res.json();
  return data;
};

export const useLogs = (options?: { refetchInterval?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: ['logs'],
    queryFn: fetchLogs,
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
};

export const useMetrics = (options?: { refetchInterval?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
};
