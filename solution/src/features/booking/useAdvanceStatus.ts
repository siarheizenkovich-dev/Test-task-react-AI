import { useMutation, useQueryClient } from '@tanstack/react-query';
import { advanceLoadStatus } from '../../api/loadsApi';
import { loadKeys } from '../../lib/queryKeys';
import type { LoadStatus } from '../../shared/apiTypes';

interface AdvanceVariables {
  id: string;
  status: LoadStatus;
  version: number;
}

/** Driver-side status transition. Plain (non-optimistic) mutation. */
export const useAdvanceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, version }: AdvanceVariables) =>
      advanceLoadStatus(id, status, version),
    onSuccess: (load) => {
      queryClient.setQueryData(loadKeys.detail(load.id), load);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: loadKeys.all }),
  });
};
