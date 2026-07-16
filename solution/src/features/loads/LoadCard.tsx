import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { calculateRate } from '../../domain/rate';
import { formatDate, formatMoney, formatStatus } from '../../lib/format';
import type { Load } from '../../shared/apiTypes';

interface Props {
  load: Load;
  canBook: boolean;
  /** Must be referentially stable — this component is memoized. */
  onBook: (load: Load) => void;
  isBooking: boolean;
}

const LoadCardInner = ({ load, canBook, onBook, isBooking }: Props) => {
  const location = useLocation();
  const { carrierTotal } = calculateRate(load);

  return (
    <div className="card load-card">
      <div className="load-card-main">
        <Link
          to={`/loads/${load.id}`}
          state={{ fromSearch: location.search }}
          className="load-title"
        >
          {load.origin.city}, {load.origin.state} → {load.destination.city},{' '}
          {load.destination.state}
        </Link>
        <div className="load-meta">
          <span>{load.id}</span>
          <span>PU {formatDate(load.pickupDate)}</span>
          <span>{formatStatus(load.equipment)}</span>
          <span>{load.weightLbs.toLocaleString()} lbs</span>
          <span>{load.miles.toLocaleString()} mi</span>
          <span>{formatMoney(load.ratePerMile)}/mi</span>
        </div>
      </div>
      <div className="load-card-side">
        <span className={`badge ${load.status}`}>{formatStatus(load.status)}</span>
        <strong>{formatMoney(carrierTotal)}</strong>
        {canBook && load.status === 'AVAILABLE' && (
          <button className="primary" onClick={() => onBook(load)} disabled={isBooking}>
            Book
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Memoized: the details poll and search typing re-render the page; rows
 * whose load didn't change must not re-render. This only works because the
 * page passes stable callbacks (useCallback) and Query keeps unchanged
 * items referentially identical (structural sharing).
 */
export const LoadCard = memo(LoadCardInner);
