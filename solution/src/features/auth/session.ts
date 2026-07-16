import type { User } from '../../shared/apiTypes';

/**
 * Session store: a tiny external store over localStorage so that both React
 * (via useSyncExternalStore) and non-React code (the axios interceptor) read
 * and write the same source of truth.
 *
 * Trade-off: localStorage keeps the session across reloads and tabs but is
 * readable by any JS on the page. Fine for this exercise; a real app would
 * prefer httpOnly cookies for the refresh token.
 */

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const STORAGE_KEY = 'dispatchboard.session';

const readStorage = (): Session | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

let current: Session | null = readStorage();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const getSession = (): Session | null => current;

export const setSession = (session: Session): void => {
  current = session;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notify();
};

export const updateTokens = (accessToken: string, refreshToken: string): void => {
  if (!current) return;
  setSession({ ...current, accessToken, refreshToken });
};

export const clearSession = (): void => {
  current = null;
  localStorage.removeItem(STORAGE_KEY);
  notify();
};

export const subscribeSession = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
