# DispatchBoard — reference solution

Reference implementation of the DispatchBoard test task (internal — this is what "good" looks like; also models the README the candidate is asked to write).

## Setup

```bash
npm install
npm run dev        # http://localhost:5173 (or 5174 if configured)
```

`npm run type-check`, `npm run lint`, `npm run test` all pass.

Credentials: `dispatcher / dispatcher123`, `driver / driver123`.

## Structure

```
src/
├── api/          transport: axios instance + interceptors, endpoint wrappers
├── domain/       pure business rules (rate calc, load state machine) + tests
├── features/
│   ├── auth/     session store, login page, route guard
│   ├── loads/    board, filters (URL-synced), details with polling
│   └── booking/  book/advance mutations, optimistic flow, conflict dialog
├── lib/          query keys, error helpers, formatting, debounce
├── components/   app shell, feedback states
├── mocks/        the mock backend (unchanged from the starter)
└── shared/       wire types
```

## Decision notes (ADRs)

**1. Query keys are a hierarchy, invalidation targets prefixes.**
`['loads']` → `['loads','list',params]` / `['loads','detail',id]` (see `src/lib/queryKeys.ts`). Mutations invalidate the whole `['loads']` prefix in `onSettled` — after a booking (success *or* failure) the server is the only source of truth, and both the list and the open details refetch. Params objects are part of the list key, so every filter combination caches independently and `keepPreviousData` gives flicker-free pagination.

**2. The URL is the single source of truth for the board view.**
Filters, search, and page live in search params (`useLoadFilters`), so reload/share/back-forward restore the exact view for free. The search input keeps keystroke-local state and pushes its debounced value into the URL with `replace: true` (no history flooding); an effect adopts external URL changes (back button) into the input. Any filter change resets `page`.

**3. Token refresh is single-flight, at the axios layer.**
With a 45-second access token, the list query, the details poll and `auth/me` all fail together. The response interceptor (`src/api/axiosClient.ts`) keeps one module-level `refreshPromise`: the first 401 starts the refresh, concurrent 401s await the same promise and replay with the new token. A `_retried` flag caps every request at one retry (no loops); the refresh call uses bare axios so a 401 from the refresh endpoint can't re-enter the interceptor; refresh failure clears the session and the route guard redirects. TanStack Query never sees the 401s — refresh is a transport concern.

**4. 409 is a UX event, not just an error.**
The server ships the fresh load with the conflict. `useBookingFlow` routes it into a dialog that diffs old vs new rate/payout and lets the user re-confirm against the fresh version — booking silently at new terms, or silently refetching and dropping the click, would betray the user's intent. If the fresh load is no longer AVAILABLE, the dialog says who took it and offers only a way out.

**5. Business rules live in `src/domain/`, framework-free.**
Rate calculation and the status state machine are pure functions with unit tests on the boundaries (fee tiers at exactly $1,500/$3,000, surcharge strictly above 3.75, half-up rounding, illegal transitions). Components call them; they import nothing from React. Rule changes are a domain-file diff plus a test update, not a component hunt.

**6. Session lives in a tiny external store over localStorage.**
`useSyncExternalStore` gives React components the session; the axios interceptor reads the same module directly. Trade-off (accepted for the exercise): localStorage is XSS-readable and token rotation can race between two tabs — a real app would keep the refresh token in an httpOnly cookie.

## Known limitations

- Optimistic booking patches list/detail caches by mapping items — fine at this scale; a normalized entity cache would be the next step if more mutations appear.
- No component/integration tests — the testing requirement targets domain logic; Playwright over the MSW backend would be the natural extension.
- The mock's in-memory data resets on full page reload (regenerated from a fixed seed) — booked state is not durable by design.
