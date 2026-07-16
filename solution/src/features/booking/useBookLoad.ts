import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookLoad } from '../../api/loadsApi';
import { loadKeys } from '../../lib/queryKeys';
import type { Load, Paginated } from '../../shared/apiTypes';
import { getSession } from '../auth/session';

interface BookVariables {
  id: string;
  version: number;
}

interface BookContext {
  previousLists: Array<[readonly unknown[], Paginated<Load> | undefined]>;
  previousDetail: Load | undefined;
}

const asBooked = (load: Load, bookedBy: string): Load => ({
  ...load,
  status: 'BOOKED',
  bookedBy,
});

/**
 * Optimistic booking:
 *  - onMutate snapshots every list variant + the detail entry, then patches
 *    them all so the card flips to BOOKED instantly
 *  - onError restores the snapshots (the 503-flaky endpoint makes this a
 *    frequently-taken path, not decoration)
 *  - onSettled invalidates the whole `loads` subtree — the server is the
 *    source of truth after any outcome, success or failure (esp. 409)
 */
export const useBookLoad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, version }: BookVariables) => bookLoad(id, version),

    onMutate: async ({ id }): Promise<BookContext> => {
      // Stop in-flight refetches from overwriting the optimistic patch.
      await queryClient.cancelQueries({ queryKey: loadKeys.all });

      const previousLists = queryClient.getQueriesData<Paginated<Load>>({
        queryKey: loadKeys.lists(),
      });
      const previousDetail = queryClient.getQueryData<Load>(loadKeys.detail(id));

      const me = getSession()?.user.username ?? 'me';
      queryClient.setQueriesData<Paginated<Load>>({ queryKey: loadKeys.lists() }, (data) =>
        data
          ? {
              ...data,
              items: data.items.map((load) => (load.id === id ? asBooked(load, me) : load)),
            }
          : data,
      );
      if (previousDetail) {
        queryClient.setQueryData(loadKeys.detail(id), asBooked(previousDetail, me));
      }

      return { previousLists: [...previousLists], previousDetail };
    },

    onError: (_error, { id }, context) => {
      if (!context) return;
      for (const [key, data] of context.previousLists) {
        queryClient.setQueryData(key, data);
      }
      if (context.previousDetail) {
        queryClient.setQueryData(loadKeys.detail(id), context.previousDetail);
      }
    },

    onSuccess: (load) => {
      // Seed the detail cache with the confirmed entity right away.
      queryClient.setQueryData(loadKeys.detail(load.id), load);
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: loadKeys.all }),
  });
};
