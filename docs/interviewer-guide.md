# Interviewer Guide — DispatchBoard (INTERNAL, do not share with candidates)

Two-stage test. **Part 1** is the take-home ([candidate-task.md](candidate-task.md)) — assume AI wrote a large share of it; that is fine and expected. **Part 2** is a ~60-minute live session on _their_ submission. Part 2 is where the real signal is: can they explain, extend, and debug the code they submitted when requirements change in real time?

A reference implementation lives in `solution/` — use it to calibrate what "good" looks like and to demo expected behavior. File paths below refer to it. **It is not on `main`** (so it never reaches a candidate who forks/clones this repo) — run `git checkout solution` to get it.

## Why two stages, not one

In 2026, no single take-home assignment can be trusted as proof of a candidate's own skill, and no assignment can be designed to be un-solvable by AI — coding assistants are simply too capable, and a hostile mock backend only raises the bar for the AI, it doesn't rule it out. We therefore don't try to detect or block AI usage in Part 1; we assume it happened. Instead we treat Part 1 purely as a **prerequisite artifact**: it produces a nontrivial, opinionated codebase (auth flow, cache logic, domain rules, a UI) that becomes the *subject matter* of Part 2. The take-home cannot, by itself, validate the candidate's knowledge and competence — only the live, adversarial follow-up on their own code can do that, because that's the part AI can't sit in for on the candidate's behalf in real time. The two stages together are what let us score with confidence; neither one alone would.

## Before the live session (15 min of prep)

1. Run their app. Log in as `dispatcher`, leave the tab idle for ~50 s, then click anything. **If the app logs out or breaks, the refresh flow is broken** — that alone tells you Part 1 was not self-reviewed.
2. Open a load's details, wait for the rival-dispatcher simulation to change something (or book the same load from a second tab), then try to book. Watch what their `409` UX does. Deterministic shortcut: **LD-1000 always conflicts on the first booking attempt** (its rate changes underneath you — see `conflictOnceIds` in `src/mocks/config.ts`).
3. Book loads until you hit the random `503`. Does the optimistic update roll back? Is there an error the user can act on?
4. Skim: where does the rate calculation live? Are there real tests? Any `useEffect`+axios fetching despite the TanStack Query requirement?
5. Note 2–3 places in their code you don't understand or find suspicious — those are your first live questions.

---

## Part 2 — Live extension tasks

Pick **2–3 tasks** based on where their submission looks weakest. Each task: requirement + "do not break" + question bank.

### Task 1 — Saved filter presets (state architecture)

**Requirement:** Add "Save current filters as a named preset" and a preset switcher on `/loads`. Selecting a preset applies its filters. Presets survive reload.

**Do not break:** URL-synced filters, shareable links, pagination, back/forward navigation.

**What we evaluate**

1. _Where does state live?_ Their filters are (should be) in the URL. Presets need persistent storage. Now there are two sources of truth.
   - Where do presets live — localStorage, context, server-shaped cache?
   - When a preset is applied, who wins — URL or preset store? What is the single source of truth at render time?
   - What happens to `page` when a preset is applied? Why?
2. _Serialization discipline._
   - How do you serialize filters? What happens when a future filter field is added — do old presets break?
   - Preset applied → user tweaks one filter → is the preset "active"? How do you decide?
3. _Navigation semantics._
   - Should applying a preset push or replace history? Defend it.
   - Back button after applying 3 presets — what does the user expect?

### Task 2 — Booking concurrency deep-dive (cache mental model)

No new code at first — a guided walkthrough of their booking mutation, then a live extension.

**Walkthrough questions:**

- Walk me through the mutation line by line: what happens in `onMutate` / `onError` / `onSettled` (or their equivalent)?
- Where is the pre-mutation snapshot stored? What _exactly_ is restored on rollback — list cache, details cache, both?
- The book endpoint fails with `503` 15% of the time. Show me the rollback path. Now show me what the _user_ sees.
- On `409`, the server returns the fresh load. Where does it go — into the cache? Only into the dialog? Why?

**Live extension:** "Two tabs are open, both as dispatcher. Book the same load in both tabs at nearly the same time. Design what each tab shows." Then: "The details page is open while the list's optimistic update marks the load booked, but the request fails. What does the details page show during those 2 seconds?"

**What we evaluate**

1. Optimistic update vs server truth — who wins after `onSettled` invalidation, and can there be a flash of stale state?
2. Do list and details caches share an entity or duplicate it? How do they keep them in sync — `setQueryData` on both, invalidation, or a normalized helper?
3. Is the conflict UX preserving user intent (re-confirm with diff) or silently refetching?

### Task 3 — Refresh stampede (interceptor understanding)

Their refresh already works for the single-request case (Part 1 forces it). Live, make it hostile.

**Setup:** In `src/mocks/config.ts`, drop `accessTokenTtlMs` to `10_000`. Now the list query, the details poll, and `auth/me` all hit `401` together, repeatedly.

**Requirement:** exactly **one** refresh call per expiry, all failed requests replayed after it, logout on refresh failure, no loops.

**Question bank:**

1. Interceptor walkthrough — line by line. What happens on the _first_ `401`? On the _second_ `401` that arrives while refresh is in flight?
2. Where is the "refresh in progress" state — a module-level promise, a queue, a flag? Why does it survive concurrent callers?
3. How is a request marked "already retried"? What happens if the retried request gets `401` again?
4. `POST /api/auth/refresh` itself returns `401` — trace the code path. Any chance it triggers another refresh?
5. The user clicks Logout while a refresh is in flight and 3 requests are queued. What happens to the queue?
6. The refresh rotates the refresh token. Two tabs share localStorage — tab A refreshes, tab B still holds the old refresh token. What breaks, and is it acceptable?

### Task 4 — Performance on 500 loads (measurement vs cargo cult)

**Setup:** open `http://localhost:5173/?dataset=large` (500 loads). Set list page size to 100 via their UI or a quick param tweak. Turn on React DevTools → "Highlight updates".

**Requirement:** typing in the search box and the 10-second details-poll tick must not re-render every row.

**Question bank:**

1. Before touching code: _predict_ which components re-render when you type one character. Then measure. Were you right?
2. Which prop is unstable — a callback, an inline object, the array identity from the query? Prove it.
3. `React.memo` on the row — did it help? Why / why not? What has to be true about props for memo to work?
4. `useCallback` on the row's `onBook` vs moving the handler down vs passing just the `id` — trade-offs?
5. When is memo itself a cost? Would you virtualize instead? At what point?
6. The 10 s poll returns an identical payload — does TanStack Query re-render subscribers? What is `structuralSharing` doing for you?

---

## Probing tactics (any task)

Use these to separate "understands" from "can narrate what AI wrote":

- **Delete-and-predict:** pick a line (the `_retry` flag, the `onMutate` snapshot, a query-key segment), delete it, and ask them to predict the exact failure _before_ running. Then run.
- **"Why is this file here?"** — point at any file and ask why it lives in that layer and what would have to change for it to move.
- **Write one test:** ask for a single new unit test for their own rate function, edge of their choice. Watch whether they pick a meaningful edge (tier boundary) or a trivial one.
- **Mid-explanation pivot:** while they explain approach A, say "requirement changed" (e.g. presets are now per-user on the server). Do they re-plan calmly or defend the now-wrong approach?
- **Budget cut:** "You have 2 fewer hours for Part 1 — what do you cut and what do you never cut?" Strong candidates cut UI polish, never cut rollback/refresh correctness.
- **AI attribution (ask openly, no judgment):** "Which parts did AI write? Which of those did you rewrite, and why?" Honest, specific answers are a _positive_ signal; "I wrote everything myself" followed by failing the delete-and-predict test is the worst outcome.

## Evaluation rubric

**Part 1 — 30%** (score each 1–4)

| Criterion                | 1                                       | 4                                                          |
| ------------------------ | --------------------------------------- | ---------------------------------------------------------- |
| Features & unhappy paths | happy path only; refresh/409/503 broken | all flows incl. conflict UX and rollback work              |
| Architecture & layering  | logic in components, ad-hoc fetching    | clean transport/domain/feature layers, coherent query keys |
| Code quality             | `any`, dead code, one squash commit     | strict TS, clean history, honest README                    |
| Domain tests             | none / assert nothing                   | boundaries, rounding, transitions covered                  |

**Part 2 — 70%** (score each 1–4)

| Criterion             | 1                                    | 4                                                  |
| --------------------- | ------------------------------------ | -------------------------------------------------- |
| Explains own code     | can't trace own interceptor/mutation | line-by-line, including failure paths              |
| Extends incrementally | rewrites from scratch / freezes      | small safe steps, keeps constraints intact         |
| Edge-case reasoning   | happy-path thinking                  | proactively raises races, boundaries, ambiguity    |
| Trade-off literacy    | buzzwords                            | concrete costs/benefits, asks clarifying questions |

**Red flags (any one is serious):**

- Cannot explain their own interceptor or mutation callbacks
- App logs out / breaks after 45–90 s of idle use (refresh broken and never manually tested)
- `409` handled by silent refetch — user's confirmation intent is lost
- Rate calculation embedded in a component; tests absent or tautological
- `useEffect` + axios fetching alongside the required TanStack Query
- Search without debounce; optimistic update without rollback
- Delete-and-predict: predicts wrong and can't reason about the actual failure

**Strong signals:**

- Single-flight refresh with replay queue and retry guard, explained fluently
- Hierarchical query keys + deliberate invalidation (can say _why_ each key segment exists)
- Conflict dialog that diffs old vs fresh load and preserves user intent
- Pure domain module; tests hit tier/threshold boundaries and rounding
- Reaches for profiler/network tab before changing code; asks about ambiguous spec points
- Candid about AI-generated parts and what they rewrote

## Why this test works

- Part 1 is AI-friendly — realistic for 2026 hiring; we don't fight it, we build on it.
- The mock backend is hostile (45 s tokens, live rivals, flaky booking), so untested AI output **visibly fails within a minute** of manual use. Merely submitting a working app already proves the candidate exercised and understood the failure modes.
- Every Part 2 task maps to a production concern (state architecture, cache consistency, auth races, render performance, spec-to-code) and starts from _their_ code, where AI can't answer for them.
