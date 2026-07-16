import { useSyncExternalStore } from 'react';
import { getSession, subscribeSession, type Session } from './session';

export const useSession = (): Session | null =>
  useSyncExternalStore(subscribeSession, getSession);
