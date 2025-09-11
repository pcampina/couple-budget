import { Router } from './router';
import { registerParticipants } from './resources/participants';
import { registerTransactions } from './resources/transactions';
import { registerTransactionTypes } from './resources/transactionTypes';
import { registerStats } from './resources/stats';
import { registerActivities } from './resources/activities';
import { registerDocs } from './resources/docs';
import { registerAuth } from './resources/auth';
import { registerHealth } from './resources/health';
import { registerGroup } from './resources/group';
import { registerGroups } from './resources/groups';
import { registerUser } from './resources/user';
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
