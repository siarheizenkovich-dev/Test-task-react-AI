/**
 * Stateless mock tokens: base64 payload with an expiry. Not secure, not a
 * real JWT — but it survives page reloads without server state, which is
 * all a mock needs.
 */

export interface TokenPayload {
  sub: string; // user id
  type: 'access' | 'refresh';
  exp: number; // epoch ms
}

const PREFIX = 'mock.';

export const encodeToken = (payload: TokenPayload): string =>
  PREFIX + btoa(JSON.stringify(payload));

export const decodeToken = (token: string): TokenPayload | null => {
  if (!token.startsWith(PREFIX)) return null;
  try {
    const payload = JSON.parse(atob(token.slice(PREFIX.length))) as TokenPayload;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    return payload;
  } catch {
    return null;
  }
};
