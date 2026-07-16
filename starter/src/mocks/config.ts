/**
 * Interviewer knobs. Candidates: you may read this file, but do not "fix"
 * the backend behavior — the short token TTL, conflicts and flakiness are
 * part of the exercise.
 */
export const mockConfig = {
  /** Access token lifetime. Yes, 45 seconds — refresh handling is required. */
  accessTokenTtlMs: 45_000,
  refreshTokenTtlMs: 8 * 60 * 60 * 1000,

  /** Artificial latency applied to every endpoint. */
  latencyMs: { min: 300, max: 900 },

  /** POST /api/loads/:id/book randomly fails with 503 at this rate. */
  bookFailureRate: 0.15,

  /**
   * A simulated rival dispatcher periodically books loads, releases them,
   * or renegotiates rates (bumping `version`) — the source of natural 409s.
   */
  rivalDispatcher: { enabled: true, intervalMs: 15_000 },

  /**
   * These loads 409 on the first booking attempt (rate changes underneath
   * you), then succeed with the fresh version. Handy for live demos.
   */
  conflictOnceIds: ['LD-1000'],

  dataset: {
    defaultCount: 60,
    largeCount: 500,
    seed: 'dispatch-2026',
  },
};
