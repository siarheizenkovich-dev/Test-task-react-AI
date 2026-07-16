import { delay, http, HttpResponse } from 'msw';
import type { Load, LoadStatus, User } from '../shared/apiTypes';
import { mockConfig } from './config';
import { DEMO_DRIVER_ID, findLoad, getLoads, touch, USERS, type DbUser } from './db';
import { decodeToken, encodeToken } from './token';

const lag = () => {
  const { min, max } = mockConfig.latencyMs;
  return delay(min + Math.random() * (max - min));
};

const apiError = (status: number, code: string, message: string, extra?: Record<string, unknown>) =>
  HttpResponse.json({ error: { code, message }, ...extra }, { status });

const toPublicUser = (u: DbUser): User => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
});

const issueTokens = (user: DbUser) => ({
  accessToken: encodeToken({
    sub: user.id,
    type: 'access',
    exp: Date.now() + mockConfig.accessTokenTtlMs,
  }),
  refreshToken: encodeToken({
    sub: user.id,
    type: 'refresh',
    exp: Date.now() + mockConfig.refreshTokenTtlMs,
  }),
});

type AuthResult = { ok: true; user: DbUser } | { ok: false; code: string; message: string };

const resolveUser = (request: Request): AuthResult => {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const payload = token ? decodeToken(token) : null;
  if (!payload || payload.type !== 'access') {
    return { ok: false, code: 'UNAUTHORIZED', message: 'Missing or invalid access token' };
  }
  if (payload.exp < Date.now()) {
    return { ok: false, code: 'TOKEN_EXPIRED', message: 'Access token expired' };
  }
  const user = USERS.find((u) => u.id === payload.sub);
  if (!user) {
    return { ok: false, code: 'UNAUTHORIZED', message: 'Unknown user' };
  }
  return { ok: true, user };
};

/** Loads that 409 on the first booking attempt (see mockConfig.conflictOnceIds). */
const pendingConflictOnce = new Set(mockConfig.conflictOnceIds);

const NEXT_STATUS: Partial<Record<LoadStatus, LoadStatus>> = {
  BOOKED: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

const matchesQuery = (load: Load, q: string): boolean => {
  const needle = q.toLowerCase();
  return (
    load.id.toLowerCase().includes(needle) ||
    load.origin.city.toLowerCase().includes(needle) ||
    load.destination.city.toLowerCase().includes(needle)
  );
};

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await lag();
    const body = (await request.json()) as { username?: string; password?: string };
    const user = USERS.find(
      (u) => u.username === body.username && u.password === body.password,
    );
    if (!user) {
      return apiError(401, 'INVALID_CREDENTIALS', 'Wrong username or password');
    }
    return HttpResponse.json({ ...issueTokens(user), user: toPublicUser(user) });
  }),

  http.post('/api/auth/refresh', async ({ request }) => {
    await lag();
    const body = (await request.json()) as { refreshToken?: string };
    const payload = body.refreshToken ? decodeToken(body.refreshToken) : null;
    if (!payload || payload.type !== 'refresh' || payload.exp < Date.now()) {
      return apiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }
    const user = USERS.find((u) => u.id === payload.sub);
    if (!user) {
      return apiError(401, 'INVALID_REFRESH_TOKEN', 'Unknown user');
    }
    return HttpResponse.json(issueTokens(user));
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await lag();
    const auth = resolveUser(request);
    if (!auth.ok) return apiError(401, auth.code, auth.message);
    return HttpResponse.json(toPublicUser(auth.user));
  }),

  http.get('/api/loads', async ({ request }) => {
    await lag();
    const auth = resolveUser(request);
    if (!auth.ok) return apiError(401, auth.code, auth.message);

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '10') || 10));
    const status = url.searchParams.get('status');
    const originState = url.searchParams.get('originState');
    const equipment = url.searchParams.get('equipment');
    const q = url.searchParams.get('q');
    const assigned = url.searchParams.get('assigned');

    let items = getLoads();
    if (assigned === 'me') items = items.filter((l) => l.assignedDriverId === auth.user.id);
    if (status) items = items.filter((l) => l.status === status);
    if (originState) items = items.filter((l) => l.origin.state === originState);
    if (equipment) items = items.filter((l) => l.equipment === equipment);
    if (q) items = items.filter((l) => matchesQuery(l, q));

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pageItems = items.slice((page - 1) * limit, page * limit);

    return HttpResponse.json({ items: pageItems, page, limit, total, totalPages });
  }),

  http.get('/api/loads/:id', async ({ request, params }) => {
    await lag();
    const auth = resolveUser(request);
    if (!auth.ok) return apiError(401, auth.code, auth.message);

    const load = findLoad(params.id as string);
    if (!load) return apiError(404, 'NOT_FOUND', `Load ${String(params.id)} does not exist`);
    return HttpResponse.json(load);
  }),

  http.post('/api/loads/:id/book', async ({ request, params }) => {
    await lag();
    const auth = resolveUser(request);
    if (!auth.ok) return apiError(401, auth.code, auth.message);
    if (auth.user.role !== 'dispatcher') {
      return apiError(403, 'FORBIDDEN', 'Only dispatchers can book loads');
    }

    const load = findLoad(params.id as string);
    if (!load) return apiError(404, 'NOT_FOUND', `Load ${String(params.id)} does not exist`);

    if (Math.random() < mockConfig.bookFailureRate) {
      return apiError(503, 'BOOKING_SERVICE_UNAVAILABLE', 'Booking service hiccup — try again');
    }

    const body = (await request.json()) as { version?: number };

    // Demo hook: this load's rate "changes" right before your booking lands.
    if (pendingConflictOnce.has(load.id) && body.version === load.version) {
      pendingConflictOnce.delete(load.id);
      load.ratePerMile = Math.round(load.ratePerMile * 1.07 * 100) / 100;
      touch(load);
    }

    if (body.version !== load.version) {
      return apiError(409, 'VERSION_CONFLICT', 'Load was modified by someone else', { load });
    }
    if (load.status !== 'AVAILABLE') {
      return apiError(422, 'INVALID_STATUS', `Load is ${load.status}, not AVAILABLE`);
    }

    load.status = 'BOOKED';
    load.bookedBy = auth.user.username;
    load.assignedDriverId = DEMO_DRIVER_ID;
    touch(load);
    return HttpResponse.json(load);
  }),

  http.post('/api/loads/:id/status', async ({ request, params }) => {
    await lag();
    const auth = resolveUser(request);
    if (!auth.ok) return apiError(401, auth.code, auth.message);

    const load = findLoad(params.id as string);
    if (!load) return apiError(404, 'NOT_FOUND', `Load ${String(params.id)} does not exist`);

    if (auth.user.role !== 'driver' || load.assignedDriverId !== auth.user.id) {
      return apiError(403, 'FORBIDDEN', 'Only the assigned driver can advance load status');
    }

    const body = (await request.json()) as { status?: LoadStatus; version?: number };
    if (body.version !== load.version) {
      return apiError(409, 'VERSION_CONFLICT', 'Load was modified by someone else', { load });
    }
    if (!body.status || NEXT_STATUS[load.status] !== body.status) {
      return apiError(
        422,
        'INVALID_TRANSITION',
        `Cannot transition ${load.status} -> ${String(body.status)}`,
      );
    }

    load.status = body.status;
    touch(load);
    return HttpResponse.json(load);
  }),
];
