import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function useTenants(jwt?: string) {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      // 'internal' driver is MVP per plan
      return apiFetch<Record<string, unknown>[]>('/{driver}/tenants', 'get', { driver: 'internal', jwt });
    },
  });
}
