/** Load lifecycle rules — pure domain logic, no framework imports. */

import type { Load, LoadStatus, User } from '../shared/apiTypes';

const NEXT_STATUS: Partial<Record<LoadStatus, LoadStatus>> = {
  AVAILABLE: 'BOOKED',
  BOOKED: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

export const getNextStatus = (status: LoadStatus): LoadStatus | null =>
  NEXT_STATUS[status] ?? null;

export const isValidTransition = (from: LoadStatus, to: LoadStatus): boolean =>
  NEXT_STATUS[from] === to;

/** Dispatchers book loads that are still on the board. */
export const canBook = (load: Load, user: User): boolean =>
  user.role === 'dispatcher' && load.status === 'AVAILABLE';

/** The assigned driver moves a load along: BOOKED → IN_TRANSIT → DELIVERED. */
export const canAdvanceStatus = (load: Load, user: User): boolean =>
  user.role === 'driver' &&
  load.assignedDriverId === user.id &&
  (load.status === 'BOOKED' || load.status === 'IN_TRANSIT');
