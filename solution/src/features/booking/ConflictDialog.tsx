import { calculateRate } from '../../domain/rate';
import { formatMoney, formatStatus } from '../../lib/format';
import type { Load } from '../../shared/apiTypes';

interface Props {
  /** The load as the user saw it when they clicked Book. */
  staleLoad: Load;
  /** The current server-side load, delivered with the 409. */
  freshLoad: Load;
  isPending: boolean;
  onConfirm: (freshLoad: Load) => void;
  onCancel: () => void;
}

/**
 * 409 VERSION_CONFLICT UX: the user's intent ("book this load at $X") must
 * not be silently replaced by new terms. Show what changed and let the user
 * re-confirm against the fresh version — or walk away.
 */
export const ConflictDialog = ({ staleLoad, freshLoad, isPending, onConfirm, onCancel }: Props) => {
  const stillAvailable = freshLoad.status === 'AVAILABLE';
  const oldTotal = calculateRate(staleLoad).carrierTotal;
  const newTotal = calculateRate(freshLoad).carrierTotal;
  const rateChanged = staleLoad.ratePerMile !== freshLoad.ratePerMile;

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Booking conflict">
      <div className="card dialog">
        <h2>This load just changed</h2>
        <p>
          {freshLoad.id} was modified while you were looking at it
          {stillAvailable ? ':' : '.'}
        </p>

        {stillAvailable ? (
          <>
            {rateChanged && (
              <table className="diff-table">
                <tbody>
                  <tr>
                    <td>Rate</td>
                    <td className="old">{formatMoney(staleLoad.ratePerMile)}/mi</td>
                    <td>→</td>
                    <td className="new">{formatMoney(freshLoad.ratePerMile)}/mi</td>
                  </tr>
                  <tr>
                    <td>Your payout</td>
                    <td className="old">{formatMoney(oldTotal)}</td>
                    <td>→</td>
                    <td className="new">{formatMoney(newTotal)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            <div className="dialog-actions">
              <button onClick={onCancel} disabled={isPending}>
                Never mind
              </button>
              <button className="primary" onClick={() => onConfirm(freshLoad)} disabled={isPending}>
                {isPending ? 'Booking…' : `Book at ${formatMoney(freshLoad.ratePerMile)}/mi`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="error">
              It is now {formatStatus(freshLoad.status)}
              {freshLoad.bookedBy ? ` (taken by ${freshLoad.bookedBy})` : ''} and can no longer be
              booked.
            </p>
            <div className="dialog-actions">
              <button onClick={onCancel}>Back to the board</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
