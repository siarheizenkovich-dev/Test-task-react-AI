# DispatchBoard — React Hiring Test Package

A two-stage React test task (take-home + live extension) built around a freight load board. Designed for 2026 hiring reality: the take-home is AI-friendly by design, but the embedded mock backend is deliberately hostile (45-second access tokens, simulated rival dispatchers causing `409` conflicts, a flaky booking endpoint), so untested AI output visibly fails within a minute of manual use. The live session then digs into the candidate's own code.

## What's inside

| Path | Audience | Contents |
|---|---|---|
| [docs/candidate-task.md](docs/candidate-task.md) | **Send to candidate** | Part 1 take-home: requirements, business rules, full mock API contract |
| [docs/interviewer-guide.md](docs/interviewer-guide.md) | **Internal only** | Part 2 live tasks with question banks, probing tactics, rubric, red flags / strong signals |
| [starter/](starter/) | **Send to candidate** | Clean skeleton: Vite + React 18 + TS strict + Router + axios + TanStack Query + Vitest, MSW mock backend fully wired, no feature code |
| `solution/` (on the **`solution` branch**, internal only) | **Internal only** | Working reference implementation of every Part 1 requirement — kept out of `main` so it never reaches a candidate; run `git checkout solution` to access it |

## How to run the process

1. Send the candidate `docs/candidate-task.md` and the `starter/` folder (or push it to a private repo they fork). Ask for it back within a week.
2. Before the live session, spend 15 minutes on their submission following the checklist at the top of the interviewer guide.
3. In the ~60-minute live session, pick 2–3 of the five extension tasks — choose the ones targeting the weakest parts of their submission.
4. Score with the rubric: Part 1 = 30%, Part 2 = 70%.

## Quick start

```bash
cd starter
npm install
npm run dev          # http://localhost:5173
npm run type-check
npm run test
```

To run the reference solution, check out the `solution` branch first (`git checkout solution`), then `cd solution` and repeat the commands above.

Test credentials: `dispatcher / dispatcher123`, `driver / driver123`.
Interviewer knobs (token TTL, flakiness, rival-dispatcher interval, dataset size) live in `src/mocks/config.ts` of each app. `http://localhost:5173/?dataset=large` serves 500 loads.
