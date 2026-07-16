import { useEffect, useRef, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../../components/Feedback';
import { getApiErrorMessage } from '../../lib/apiError';
import { type LoadListParams } from '../../lib/queryKeys';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useSession } from '../auth/useSession';
import { ConflictDialog } from '../booking/ConflictDialog';
import { useBookingFlow } from '../booking/useBookingFlow';
import { LoadCard } from './LoadCard';
import { LoadFilters } from './LoadFilters';
import { useLoadFilters } from './useLoadFilters';
import { useLoadsQuery } from './useLoadsQuery';

const PAGE_SIZE = 10;

export const LoadsPage = () => {
  const session = useSession();
  const { filters, patchFilters } = useLoadFilters();

  // The search input is local (keystroke-fast); its debounced value is
  // pushed into the URL, which is the real filter source of truth.
  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(searchInput);
  const lastAppliedQ = useRef(filters.q);

  useEffect(() => {
    if (debouncedSearch !== lastAppliedQ.current) {
      lastAppliedQ.current = debouncedSearch;
      patchFilters({ q: debouncedSearch }, { replace: true });
    }
  }, [debouncedSearch, patchFilters]);

  // URL changed underneath us (back/forward navigation) → adopt it.
  useEffect(() => {
    if (filters.q !== lastAppliedQ.current) {
      lastAppliedQ.current = filters.q;
      setSearchInput(filters.q);
    }
  }, [filters.q]);

  const isDriver = session?.user.role === 'driver';
  const params: LoadListParams = {
    page: filters.page,
    limit: PAGE_SIZE,
    status: filters.status || undefined,
    originState: filters.originState || undefined,
    equipment: filters.equipment || undefined,
    q: filters.q || undefined,
    assigned: isDriver ? 'me' : undefined,
  };

  const loadsQuery = useLoadsQuery(params);
  const booking = useBookingFlow();

  const data = loadsQuery.data;

  return (
    <main className="page">
      <div className="page-head">
        <h1>{isDriver ? 'My loads' : 'Load board'}</h1>
        {loadsQuery.isFetching && !loadsQuery.isPending && (
          <span className="hint">Updating…</span>
        )}
      </div>

      <LoadFilters
        filters={filters}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onFilterChange={patchFilters}
      />

      {booking.error && (
        <div className="banner error">
          <span>Booking failed: {booking.error}</span>
          <button onClick={booking.dismissError}>Dismiss</button>
        </div>
      )}

      {loadsQuery.isPending ? (
        <LoadingState label="Loading loads…" />
      ) : loadsQuery.isError ? (
        <ErrorState
          message={getApiErrorMessage(loadsQuery.error)}
          onRetry={() => loadsQuery.refetch()}
        />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          message={isDriver ? 'No loads assigned to you yet.' : 'No loads match your filters.'}
        />
      ) : data ? (
        <>
          <div className="load-list">
            {data.items.map((load) => (
              <LoadCard
                key={load.id}
                load={load}
                canBook={!isDriver}
                onBook={booking.book}
                isBooking={booking.isPending}
              />
            ))}
          </div>
          <footer className="pagination">
            <button
              disabled={data.page <= 1}
              onClick={() => patchFilters({ page: data.page - 1 })}
            >
              ← Prev
            </button>
            <span>
              Page {data.page} of {data.totalPages} · {data.total} loads
            </span>
            <button
              disabled={data.page >= data.totalPages}
              onClick={() => patchFilters({ page: data.page + 1 })}
            >
              Next →
            </button>
          </footer>
        </>
      ) : null}

      {booking.conflict && (
        <ConflictDialog
          staleLoad={booking.conflict.stale}
          freshLoad={booking.conflict.fresh}
          isPending={booking.isPending}
          onConfirm={booking.confirmConflict}
          onCancel={booking.dismissConflict}
        />
      )}
    </main>
  );
};
