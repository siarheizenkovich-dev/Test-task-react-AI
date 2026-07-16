import { describe, expect, it } from 'vitest';
import type { Load, User } from '../shared/apiTypes';
import { canAdvanceStatus, canBook, getNextStatus, isValidTransition } from './loadStateMachine';

const load = (overrides: Partial<Load>): Load => ({
  id: 'LD-1',
  origin: { city: 'Chicago', state: 'IL' },
  destination: { city: 'Dallas', state: 'TX' },
  pickupDate: '2026-08-01',
  deliveryDate: '2026-08-03',
  equipment: 'DRY_VAN',
  weightLbs: 20000,
  miles: 900,
  deadheadMiles: 40,
  ratePerMile: 2.1,
  fuelIndex: 3.4,
  status: 'AVAILABLE',
  version: 1,
  bookedBy: null,
  assignedDriverId: null,
  broker: { name: 'Test Broker', mcNumber: 'MC-1' },
  updatedAt: '2026-07-15T00:00:00.000Z',
  ...overrides,
});

const dispatcher: User = { id: 'u-d', username: 'dispatcher', name: 'D', role: 'dispatcher' };
const driver: User = { id: 'u-drv', username: 'driver', name: 'V', role: 'driver' };

describe('transitions', () => {
  it('follows AVAILABLE → BOOKED → IN_TRANSIT → DELIVERED one step at a time', () => {
    expect(getNextStatus('AVAILABLE')).toBe('BOOKED');
    expect(getNextStatus('BOOKED')).toBe('IN_TRANSIT');
    expect(getNextStatus('IN_TRANSIT')).toBe('DELIVERED');
    expect(getNextStatus('DELIVERED')).toBeNull();
  });

  it('rejects skips and reversals', () => {
    expect(isValidTransition('AVAILABLE', 'IN_TRANSIT')).toBe(false);
    expect(isValidTransition('BOOKED', 'DELIVERED')).toBe(false);
    expect(isValidTransition('DELIVERED', 'AVAILABLE')).toBe(false);
    expect(isValidTransition('IN_TRANSIT', 'BOOKED')).toBe(false);
  });
});

describe('canBook', () => {
  it('allows a dispatcher on an AVAILABLE load only', () => {
    expect(canBook(load({}), dispatcher)).toBe(true);
    expect(canBook(load({ status: 'BOOKED' }), dispatcher)).toBe(false);
    expect(canBook(load({}), driver)).toBe(false);
  });
});

describe('canAdvanceStatus', () => {
  it('allows only the assigned driver, and only mid-lifecycle', () => {
    const mine = load({ status: 'BOOKED', assignedDriverId: driver.id });
    expect(canAdvanceStatus(mine, driver)).toBe(true);
    expect(canAdvanceStatus({ ...mine, status: 'IN_TRANSIT' }, driver)).toBe(true);
    expect(canAdvanceStatus({ ...mine, status: 'DELIVERED' }, driver)).toBe(false);
    expect(canAdvanceStatus({ ...mine, assignedDriverId: 'someone-else' }, driver)).toBe(false);
    expect(canAdvanceStatus(mine, dispatcher)).toBe(false);
  });
});
