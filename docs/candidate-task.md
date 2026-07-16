# Test Task — DispatchBoard (Freight Load Board)

You are building **DispatchBoard** — an internal tool for a freight brokerage. Dispatchers use it to find available loads (shipments) and book them; drivers use it to track the loads assigned to them and update delivery status.

You receive a **starter repository** with the tooling and a fully working **mock backend** (MSW) already wired in. You implement the frontend features on top of it.

You may use any tools you like, including AI assistants — but be ready to explain and extend every line of your code in a live follow-up session.

## Technology stack (required)

- TypeScript (strict — the starter is already configured, keep it green)
- React 18
- React Router
- Vite (preconfigured)
- axios — single instance, interceptors for auth
- TanStack Query v5 — all server state must go through it (no `useEffect` + `fetch`/`axios` data fetching)
- Vitest — for the domain-logic unit tests (preconfigured)

## Requirements

### 1. Authentication

- Login form (username / password) at `/login`
- Use the mock auth API (contract below). Test credentials:
  - `dispatcher / dispatcher123` — role `dispatcher`
  - `driver / driver123` — role `driver`
- Persist the session (`accessToken`, `refreshToken`) and restore it on page refresh
- All routes except `/login` are auth-only; redirect unauthenticated users to `/login`
- **Token refresh:** the access token expires every **45 seconds** (yes, really — it is part of the exercise). On a `401`, refresh the token via `POST /api/auth/refresh` and retry the failed request transparently. The app has several requests in flight at once (list + polling); make sure concurrent `401`s do not trigger multiple parallel refresh calls or logout loops.
- Logout button; refresh failure (expired/invalid refresh token) must log the user out cleanly.

### 2. Loads board (`/loads`)

- Paginated list of loads (table or cards): id, origin → destination, pickup date, equipment, weight, miles, rate per mile, computed **carrier total** (see business rules), status badge
- Filters: **status**, **origin state**, **equipment type**
- Free-text search input (searches city names and load id) — **debounced**
- **Filters, search, and page must be reflected in the URL** — reloading or sharing the URL restores the exact view
- Loading / error / empty states for every data state the user can hit
- Clicking a load opens its details page

### 3. Load details (`/loads/:id`)

- Show all load fields plus a **rate breakdown** (linehaul, deadhead pay, fuel surcharge, brokerage fee, carrier total — see business rules)
- While the page is open, **poll the load every 10 seconds** so status/rate changes made by others show up without a manual reload
- Back navigation to the list **preserving filters/page**

### 4. Booking flow (business feature)

- A dispatcher can book a load with status `AVAILABLE` (button on details page; on the list too if you like)
- The book request sends the load `version` you are looking at (optimistic locking — contract below)
- **Optimistic UI:** the load shows as booked immediately; on failure the UI rolls back and shows an error the user can act on. Note: the book endpoint **randomly fails with `503` about 15% of the time** — this is intentional.
- **Conflict handling (`409`):** other dispatchers are working the same board (the mock backend simulates them — loads get booked and rates change underneath you). If the server responds `409 VERSION_CONFLICT`, it returns the fresh load. Show the user **what changed** (e.g. the rate) and let them confirm booking the updated load or back out. A silent refetch that drops the user's intent is not acceptable.
- After any outcome, the list cache and the details cache must agree with the server.

### 5. Rate calculation (business feature — pure domain logic)

Implement the carrier payout calculation as a **pure, framework-free module** (no React imports) with **unit tests**. Rules:

1. **Linehaul** = `miles × ratePerMile`
2. **Deadhead pay** = `deadheadMiles × ratePerMile × 0.5` (empty miles are paid at 50%)
3. **Fuel surcharge** = `miles × $0.40`, applied **only when** `fuelIndex > 3.75`. Deadhead miles get no surcharge.
4. **Subtotal** = linehaul + deadhead pay + fuel surcharge
5. **Brokerage fee** is deducted from the subtotal, tiered by subtotal:
   - subtotal < $1,500 → **12%**
   - $1,500 ≤ subtotal < $3,000 → **10%**
   - subtotal ≥ $3,000 → **8%**
6. **Carrier total** = subtotal − brokerage fee
7. **Rounding:** round each component (linehaul, deadhead pay, surcharge, fee) to cents (2 decimals, half-up) before summing; the totals are computed from the rounded components.

Cover the interesting cases in tests (tier boundaries, surcharge threshold, zero deadhead, rounding).

### 6. Roles (business feature)

- `dispatcher`: sees the full board, can book loads
- `driver`: sees **only loads assigned to them** (`GET /api/loads?assigned=me`), cannot book, and can advance the status of their loads: `BOOKED → IN_TRANSIT → DELIVERED` (one step at a time, via `POST /api/loads/:id/status`)
- Gate both the **UI** (don't render actions the user can't perform) and handle the API's `403` gracefully anyway

### 7. Architecture & code quality

- Feature-based folder structure with explicit layers: transport (axios/api), domain (business rules), features (UI + hooks), shared components
- Consistent TanStack Query key design; cache updates/invalidation after mutations
- No `any`, no disabled lints, strict TS stays green
- `README.md` with: setup instructions, and **3–5 short decision notes** (ADR-style, a few sentences each), e.g.: how you structured query keys and why; where the 409 conflict is handled and why there; where domain logic lives; what your session storage trade-offs are; known limitations.

### 8. Deliverables

- Git repository (link) with meaningful commit history — not one squashed commit
- Working app: `npm i && npm run dev`
- `npm run type-check`, `npm run lint`, `npm run test` all pass
- `README.md` as described above

---

## Mock API contract

The mock backend runs in the browser via MSW — no server to install. All endpoints are under `/api`. **In-memory data resets on full page reload** (regenerated from a fixed seed, so ids are stable). Responses have **300–900 ms of artificial latency**.

### Auth

| Endpoint | Body | Success | Errors |
|---|---|---|---|
| `POST /api/auth/login` | `{ username, password }` | `200` `{ accessToken, refreshToken, user }` | `401` `INVALID_CREDENTIALS` |
| `POST /api/auth/refresh` | `{ refreshToken }` | `200` `{ accessToken, refreshToken }` (rotated) | `401` `INVALID_REFRESH_TOKEN` |
| `GET /api/auth/me` | — | `200` `user` | `401` |

- `user`: `{ id, username, name, role: 'dispatcher' | 'driver' }`
- Access token TTL: **45 s**. Refresh token TTL: 8 h.
- Authenticated requests: `Authorization: Bearer <accessToken>`. Expired/missing/invalid token → `401` `{ error: { code: 'TOKEN_EXPIRED' | 'UNAUTHORIZED', message } }`.

### Loads

| Endpoint | Params / body | Success | Errors |
|---|---|---|---|
| `GET /api/loads` | query: `page` (1-based), `limit` (default 10), `status`, `originState`, `equipment`, `q`, `assigned=me` | `200` `{ items, page, limit, total, totalPages }` | `401` |
| `GET /api/loads/:id` | — | `200` `Load` | `401`, `404` |
| `POST /api/loads/:id/book` | `{ version }` | `200` updated `Load` | `401`, `403` (not dispatcher), `409` `VERSION_CONFLICT` (body includes fresh `load`), `422` `INVALID_STATUS` (not AVAILABLE), `503` `BOOKING_SERVICE_UNAVAILABLE` (~15% random) |
| `POST /api/loads/:id/status` | `{ status, version }` | `200` updated `Load` | `401`, `403` (not the assigned driver), `409`, `422` `INVALID_TRANSITION` |

### `Load` shape

```ts
interface Load {
  id: string;                // "LD-1042"
  origin: { city: string; state: string };
  destination: { city: string; state: string };
  pickupDate: string;        // ISO date
  deliveryDate: string;      // ISO date
  equipment: 'DRY_VAN' | 'REEFER' | 'FLATBED';
  weightLbs: number;
  miles: number;             // loaded miles
  deadheadMiles: number;     // empty miles to pickup
  ratePerMile: number;       // USD
  fuelIndex: number;         // national fuel index, e.g. 3.42
  status: 'AVAILABLE' | 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED';
  version: number;           // optimistic-lock version, bumped on every change
  bookedBy: string | null;   // username of booking dispatcher
  assignedDriverId: string | null;
  broker: { name: string; mcNumber: string };
  updatedAt: string;         // ISO datetime
}
```

### Error shape

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "Load was modified" }, "load": { /* fresh load, 409 only */ } }
```

### Simulation notes (things that are *supposed* to happen)

- The board is **live**: a simulated rival dispatcher periodically books loads and brokers adjust rates (bumping `version`). Expect `409`s.
- `POST .../book` randomly fails with `503` ~15% of the time.
- Open the app as `http://localhost:5173/?dataset=large` to get a 500-load dataset (persists for the tab).

---

## What we look at

- The features work as specified, including the unhappy paths (`401` storms, `409`, `503`)
- Architecture: layering, query-key design, where business logic lives
- Code quality: types, naming, dead code, commit history
- Your README decisions — we will discuss them in the live session

**The take-home is followed by a ~60-minute live session where you extend this code with new requirements.** Whatever you submit, make sure *you* understand it deeply — that is what the live session is about.
