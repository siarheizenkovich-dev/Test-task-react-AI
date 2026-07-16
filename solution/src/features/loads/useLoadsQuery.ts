import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchLoad, fetchLoads } from '../../api/loadsApi';
import { loadKeys, type LoadListParams } from '../../lib/queryKeys';

export const useLoadsQuery = (params: LoadListParams) =>
  useQuery({
    queryKey: loadKeys.list(params),
    queryFn: () => fetchLoads(params),
    // Keep the previous page on screen while the next one loads — no
    // full-page spinner on pagination or filter changes.
    placeholderData: keepPreviousData,
  });

export const useLoadQuery = (id: string) =>
  useQuery({
    queryKey: loadKeys.detail(id),
    queryFn: () => fetchLoad(id),
    // The board is live (rival dispatchers!) — keep the open load fresh.
    refetchInterval: 10_000,
  });
