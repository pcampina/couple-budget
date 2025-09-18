import { Router } from './router.js';
import { registerParticipants } from './resources/participants.js';
import { registerTransactions } from './resources/transactions.js';
import { registerTransactionTypes } from './resources/transactionTypes.js';
import { registerStats } from './resources/stats.js';
import { registerActivities } from './resources/activities.js';
import { registerDocs } from './resources/docs.js';
import { registerAuth } from './resources/auth.js';
import { registerHealth } from './resources/health.js';
import { registerGroup } from './resources/group.js';
import { registerGroups } from './resources/groups.js';
import { registerUser } from './resources/user.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function createApp(): (req: IncomingMessage, res: ServerResponse) => void | Promise<void> {
  const router = new Router();
  registerParticipants(router);
  registerTransactions(router);
  registerTransactionTypes(router);
  registerStats(router);
  registerActivities(router);
  registerDocs(router);
  registerHealth(router);
  registerAuth(router);
  registerGroup(router);
  registerGroups(router);
  registerUser(router);
  return router.handle.bind(router);
}
