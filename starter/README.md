# DispatchBoard — starter

Starter skeleton for the DispatchBoard test task. The tooling and the mock backend are wired up; the features are yours to build. See the task description you received for the full requirements and API contract.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run type-check`, `npm run lint`, `npm run test`, `npm run build`.

## What's already here

- Vite + React 18 + TypeScript (strict), React Router, axios, TanStack Query v5, Vitest
- `src/App.tsx` — route shell with placeholders to replace
- `src/shared/apiTypes.ts` — wire types for the API
- `src/mocks/` — the mock backend (MSW, runs in the browser; no server needed)

## The mock backend

All endpoints live under `/api` — see the task description for the contract. Test credentials:

- `dispatcher / dispatcher123`
- `driver / driver123`

Things it does **on purpose** (do not "fix" the mock — handle them in the app):

- Access tokens expire every **45 seconds** → your refresh flow will run constantly
- 300–900 ms latency on every request
- `POST /api/loads/:id/book` fails with `503` ~15% of the time
- A simulated rival dispatcher books loads and changes rates while you work → expect `409 VERSION_CONFLICT`
- In-memory data resets on full page reload (same seed → same loads)

`http://localhost:5173/?dataset=large` serves a 500-load dataset (sticks for the tab session).
