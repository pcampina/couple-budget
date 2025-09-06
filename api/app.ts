import { Router } from './router';
import { registerParticipants } from './resources/participants';
import { registerExpenses } from './resources/expenses';
import { registerTransactionTypes } from './resources/transactionTypes';
import { registerStats } from './resources/stats';
import { registerActivities } from './resources/activities';
import { registerDocs } from './resources/docs';
import { registerAuth } from './resources/auth';
import { registerHealth } from './resources/health';
import { registerGroup } from './resources/group';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function createApp(): (req: IncomingMessage, res: ServerResponse) => void | Promise<void> {
  const router = new Router();
  registerParticipants(router);
  registerExpenses(router);
  registerTransactionTypes(router);
  registerStats(router);
  registerActivities(router);
  registerDocs(router);
  registerHealth(router);
  registerAuth(router);
  registerGroup(router);
  return router.handle.bind(router);
}
