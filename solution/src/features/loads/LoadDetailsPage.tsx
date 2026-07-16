import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/Feedback';
import { canAdvanceStatus, canBook, getNextStatus } from '../../domain/loadStateMachine';
import { getApiErrorMessage, getConflictLoad } from '../../lib/apiError';
import { formatDate, formatMoney, formatStatus } from '../../lib/format';
import type { Load } from '../../shared/apiTypes';
import { useSession } from '../auth/useSession';
import { ConflictDialog } from '../booking/ConflictDialog';
import { useAdvanceStatus } from '../booking/useAdvanceStatus';
import { useBookingFlow } from '../booking/useBookingFlow';
import { RateBreakdown } from './RateBreakdown';
import { useLoadQuery } from './useLoadsQuery';

const ADVANCE_LABEL: Partial<Record<Load['status'], string>> = {
  BOOKED: 'Start transit',
  IN_TRANSIT: 'Mark delivered',
};

export const LoadDetailsPage = () => {
  const { id = '' } = useParams();
  const location = useLocation();
  const session = useSession();

  const loadQuery = useLoadQuery(id);
  const booking = useBookingFlow();
  const advance = useAdvanceStatus();
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  // Set by LoadCard so Back restores the exact board view (filters + page).
  const fromSearch = (location.state as { fromSearch?: string } | null)?.fromSearch ?? '';
  const backLink = (
    <Link to={`/loads${fromSearch}`} className="back-link">
      ← Back to board
    </Link>
  );

  if (loadQuery.isPending) {
    return (
      <main className="page">
        {backLink}
        <LoadingState label="Loading load…" />
      </main>
    );
  }

  if (loadQuery.isError) {
    return (
      <main className="page">
        {backLink}
        <ErrorState
          message={getApiErrorMessage(loadQuery.error)}
          onRetry={() => loadQuery.refetch()}
        />
      </main>
    );
  }

  const load = loadQuery.data;
  const user = session?.user;

  const handleAdvance = () => {
    const next = getNextStatus(load.status);
    if (!next) return;
    setAdvanceError(null);
    advance.mutate(
      { id: load.id, status: next, version: load.version },
      {
        onError: (error) => {
          setAdvanceError(
            getConflictLoad(error)
              ? 'The load changed while you were looking at it — values refreshed, try again.'
              : getApiErrorMessage(error),
          );
        },
      },
    );
  };

  return (
    <main className="page">
      {backLink}

      <div className="page-head">
        <h1>
          {load.origin.city}, {load.origin.state} → {load.destination.city},{' '}
          {load.destination.state}
        </h1>
        <span className={`badge ${load.status}`}>{formatStatus(load.status)}</span>
        {loadQuery.isFetching && <span className="hint">Updating…</span>}
      </div>

      <section className="card detail-grid">
        <div>
          <dt>Load</dt>
          <dd>{load.id}</dd>
        </div>
        <div>
          <dt>Pickup</dt>
          <dd>{formatDate(load.pickupDate)}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{formatDate(load.deliveryDate)}</dd>
        </div>
        <div>
          <dt>Equipment</dt>
          <dd>{formatStatus(load.equipment)}</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>{load.weightLbs.toLocaleString()} lbs</dd>
        </div>
        <div>
          <dt>Loaded miles</dt>
          <dd>{load.miles.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Deadhead</dt>
          <dd>{load.deadheadMiles.toLocaleString()} mi</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>{formatMoney(load.ratePerMile)}/mi</dd>
        </div>
        <div>
          <dt>Fuel index</dt>
          <dd>{load.fuelIndex}</dd>
        </div>
        <div>
          <dt>Broker</dt>
          <dd>
            {load.broker.name} ({load.broker.mcNumber})
          </dd>
        </div>
        {load.bookedBy && (
          <div>
            <dt>Booked by</dt>
            <dd>{load.bookedBy}</dd>
          </div>
        )}
      </section>

      <RateBreakdown load={load} />

      {user && canBook(load, user) && (
        <section className="card actions">
          {booking.error && (
            <div className="banner error">
              <span>Booking failed: {booking.error}</span>
              <button onClick={booking.dismissError}>Dismiss</button>
            </div>
          )}
          <button
            className="primary"
            onClick={() => booking.book(load)}
            disabled={booking.isPending}
          >
            {booking.isPending ? 'Booking…' : `Book for ${formatMoney(load.ratePerMile)}/mi`}
          </button>
        </section>
      )}

      {user && canAdvanceStatus(load, user) && (
        <section className="card actions">
          {advanceError && <p className="error">{advanceError}</p>}
          <button className="primary" onClick={handleAdvance} disabled={advance.isPending}>
            {advance.isPending ? 'Updating…' : ADVANCE_LABEL[load.status]}
          </button>
        </section>
      )}

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
