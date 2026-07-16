import { useCallback, useState } from 'react';
import { getApiErrorMessage, getConflictLoad } from '../../lib/apiError';
import type { Load } from '../../shared/apiTypes';
import { useBookLoad } from './useBookLoad';

interface Conflict {
  stale: Load;
  fresh: Load;
}

/**
 * UI orchestration around the booking mutation: routes a 409 into the
 * conflict dialog (re-confirm against the fresh version) and everything
 * else into a dismissible error message.
 *
 * `book` is referentially stable — it is passed to memoized cards.
 */
export const useBookingFlow = () => {
  const bookMutation = useBookLoad();
  const { mutate } = bookMutation;
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [error, setError] = useState<string | null>(null);

  const book = useCallback(
    (load: Load) => {
      setError(null);
      mutate(
        { id: load.id, version: load.version },
        {
          onSuccess: () => setConflict(null),
          onError: (err) => {
            const fresh = getConflictLoad(err);
            if (fresh) {
              setConflict({ stale: load, fresh });
            } else {
              // Close the conflict dialog (if any) so the error is visible;
              // the page shows the refetched load and the user can retry.
              setConflict(null);
              setError(getApiErrorMessage(err));
            }
          },
        },
      );
    },
    [mutate],
  );

  const confirmConflict = useCallback((fresh: Load) => book(fresh), [book]);
  const dismissConflict = useCallback(() => setConflict(null), []);
  const dismissError = useCallback(() => setError(null), []);

  return {
    book,
    conflict,
    confirmConflict,
    dismissConflict,
    error,
    dismissError,
    isPending: bookMutation.isPending,
  };
};
