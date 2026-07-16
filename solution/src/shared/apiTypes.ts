/**
 * Wire types for the DispatchBoard mock API.
 * See the task description for the full contract.
 */

export type Role = 'dispatcher' | 'driver';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export type Equipment = 'DRY_VAN' | 'REEFER' | 'FLATBED';

export type LoadStatus = 'AVAILABLE' | 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED';

export interface Place {
  city: string;
  state: string;
}

export interface Load {
  id: string;
  origin: Place;
  destination: Place;
  pickupDate: string;
  deliveryDate: string;
  equipment: Equipment;
  weightLbs: number;
  miles: number;
  deadheadMiles: number;
  ratePerMile: number;
  fuelIndex: number;
  status: LoadStatus;
  version: number;
  bookedBy: string | null;
  assignedDriverId: string | null;
  broker: { name: string; mcNumber: string };
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
  /** Present on 409 VERSION_CONFLICT: the current server-side load. */
  load?: Load;
}
