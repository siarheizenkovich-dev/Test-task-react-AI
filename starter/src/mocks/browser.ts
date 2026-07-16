import { setupWorker } from 'msw/browser';
import { initDb, startRivalDispatcher } from './db';
import { handlers } from './handlers';

initDb();
startRivalDispatcher();

export const worker = setupWorker(...handlers);
