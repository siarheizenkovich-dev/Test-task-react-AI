import type { Equipment, Load, LoadStatus, Place, Role } from '../shared/apiTypes';
import { mockConfig } from './config';
import { createRng, pick, randInt } from './rng';

export interface DbUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: Role;
}

export const USERS: DbUser[] = [
  {
    id: 'u-disp-1',
    username: 'dispatcher',
    password: 'dispatcher123',
    name: 'Dana Dispatcher',
    role: 'dispatcher',
  },
  {
    id: 'u-driver-1',
    username: 'driver',
    password: 'driver123',
    name: 'Dave Driver',
    role: 'driver',
  },
];

export const DEMO_DRIVER_ID = 'u-driver-1';
const RIVAL_DISPATCHER = 'rival-dispatch';
const RIVAL_DRIVER_ID = 'u-rival-drv';

const CITIES: Place[] = [
  { city: 'Chicago', state: 'IL' },
  { city: 'Dallas', state: 'TX' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Denver', state: 'CO' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Memphis', state: 'TN' },
  { city: 'Columbus', state: 'OH' },
  { city: 'Kansas City', state: 'MO' },
  { city: 'Charlotte', state: 'NC' },
  { city: 'Indianapolis', state: 'IN' },
  { city: 'Louisville', state: 'KY' },
  { city: 'Salt Lake City', state: 'UT' },
  { city: 'Portland', state: 'OR' },
  { city: 'Sacramento', state: 'CA' },
  { city: 'Laredo', state: 'TX' },
  { city: 'Savannah', state: 'GA' },
  { city: 'Omaha', state: 'NE' },
  { city: 'Little Rock', state: 'AR' },
  { city: 'Boise', state: 'ID' },
  { city: 'Albuquerque', state: 'NM' },
];

const EQUIPMENT: Equipment[] = ['DRY_VAN', 'REEFER', 'FLATBED'];

const BROKERS = [
  { name: 'Great Plains Logistics', mcNumber: 'MC-482913' },
  { name: 'BlueLine Freight', mcNumber: 'MC-771204' },
  { name: 'Summit Cargo Group', mcNumber: 'MC-390562' },
  { name: 'RiverBend Transport', mcNumber: 'MC-615877' },
  { name: 'IronHorse Brokerage', mcNumber: 'MC-208341' },
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

const generateLoads = (count: number, seed: string): Load[] => {
  const rng = createRng(seed);
  const now = new Date();
  const loads: Load[] = [];

  for (let i = 0; i < count; i++) {
    const origin = pick(rng, CITIES);
    let destination = pick(rng, CITIES);
    while (destination.city === origin.city) destination = pick(rng, CITIES);

    const pickup = new Date(now.getTime() + randInt(rng, 1, 14) * 86_400_000);
    const delivery = new Date(pickup.getTime() + randInt(rng, 1, 4) * 86_400_000);

    // ~70% available, ~15% booked, ~10% in transit, ~5% delivered
    const statusRoll = rng();
    const status: LoadStatus =
      statusRoll < 0.7
        ? 'AVAILABLE'
        : statusRoll < 0.85
          ? 'BOOKED'
          : statusRoll < 0.95
            ? 'IN_TRANSIT'
            : 'DELIVERED';

    // Some non-available loads belong to the demo driver so the driver
    // account has something to work with out of the box.
    const isDemoDriverLoad = status !== 'AVAILABLE' && rng() < 0.4;

    loads.push({
      id: `LD-${1000 + i}`,
      origin,
      destination,
      pickupDate: isoDate(pickup),
      deliveryDate: isoDate(delivery),
      equipment: pick(rng, EQUIPMENT),
      weightLbs: randInt(rng, 8, 45) * 1000,
      miles: randInt(rng, 120, 2400),
      deadheadMiles: randInt(rng, 0, 150),
      ratePerMile: round2(1.6 + rng() * 1.9),
      fuelIndex: round2(3.2 + rng() * 1.4),
      status,
      version: randInt(rng, 1, 5),
      bookedBy: status === 'AVAILABLE' ? null : RIVAL_DISPATCHER,
      assignedDriverId:
        status === 'AVAILABLE' ? null : isDemoDriverLoad ? DEMO_DRIVER_ID : RIVAL_DRIVER_ID,
      broker: pick(rng, BROKERS),
      updatedAt: now.toISOString(),
    });
  }
  return loads;
};

let loads: Load[] = [];

export const initDb = (): void => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('dataset') === 'large') sessionStorage.setItem('mock-dataset', 'large');
  const large = sessionStorage.getItem('mock-dataset') === 'large';
  const { defaultCount, largeCount, seed } = mockConfig.dataset;
  loads = generateLoads(large ? largeCount : defaultCount, seed);
};

export const getLoads = (): Load[] => loads;

export const findLoad = (id: string): Load | undefined => loads.find((l) => l.id === id);

export const touch = (load: Load): void => {
  load.version += 1;
  load.updatedAt = new Date().toISOString();
};

/**
 * The rival dispatcher: every tick it either renegotiates a rate (version
 * bump — the classic 409 source), books an available load, or releases one
 * of its own bookings back to the board.
 */
export const startRivalDispatcher = (): void => {
  if (!mockConfig.rivalDispatcher.enabled) return;

  setInterval(() => {
    const roll = Math.random();
    if (roll < 0.5) {
      const candidates = loads.filter((l) => l.status === 'AVAILABLE');
      if (candidates.length === 0) return;
      const load = candidates[Math.floor(Math.random() * candidates.length)];
      const direction = Math.random() < 0.5 ? -1 : 1;
      load.ratePerMile = round2(Math.max(1.2, load.ratePerMile * (1 + direction * (0.03 + Math.random() * 0.05))));
      touch(load);
    } else if (roll < 0.8) {
      const candidates = loads.filter((l) => l.status === 'AVAILABLE');
      if (candidates.length === 0) return;
      const load = candidates[Math.floor(Math.random() * candidates.length)];
      load.status = 'BOOKED';
      load.bookedBy = RIVAL_DISPATCHER;
      load.assignedDriverId = RIVAL_DRIVER_ID;
      touch(load);
    } else {
      const candidates = loads.filter(
        (l) => l.status === 'BOOKED' && l.bookedBy === RIVAL_DISPATCHER,
      );
      if (candidates.length === 0) return;
      const load = candidates[Math.floor(Math.random() * candidates.length)];
      load.status = 'AVAILABLE';
      load.bookedBy = null;
      load.assignedDriverId = null;
      touch(load);
    }
  }, mockConfig.rivalDispatcher.intervalMs);
};
