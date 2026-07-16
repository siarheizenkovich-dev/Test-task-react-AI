import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearSession, getSession, updateTokens } from '../features/auth/session';
import type { RefreshResponse } from '../shared/apiTypes';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/**
 * Single-flight refresh: with a 45s access token, the list query, the
 * details poll and auth/me all hit 401 in the same tick. The first caller
 * starts the refresh; everyone else awaits the same promise and replays
 * with the new token. `_retried` guarantees a request retries at most once,
 * so a still-failing request can never loop.
 */
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const session = getSession();
  if (!session) throw new Error('No active session to refresh');
  // Bare axios on purpose: a 401 from the refresh endpoint itself must not
  // re-enter this interceptor.
  const { data } = await axios.post<RefreshResponse>('/api/auth/refresh', {
    refreshToken: session.refreshToken,
  });
  updateTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
};

const isAuthEndpoint = (config: InternalAxiosRequestConfig): boolean =>
  config.url?.startsWith('/auth/login') === true ||
  config.url?.startsWith('/auth/refresh') === true;

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;

  const shouldAttemptRefresh =
    config !== undefined &&
    error.response?.status === 401 &&
    !config._retried &&
    !isAuthEndpoint(config) &&
    getSession() !== null;

  if (!shouldAttemptRefresh) throw error;

  config._retried = true;
  try {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const accessToken = await refreshPromise;
    config.headers.Authorization = `Bearer ${accessToken}`;
    return api(config);
  } catch {
    // Refresh failed → the session is dead. Clear it; RequireAuth redirects.
    clearSession();
    throw error;
  }
});
