import { Router } from './router';
import { registerParticipants } from './resources/participants';
import { registerExpenses } from './resources/expenses';
import { registerStats } from './resources/stats';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function createApp(): (req: IncomingMessage, res: ServerResponse) => void | Promise<void> {
  const router = new Router();
  registerParticipants(router);
  registerExpenses(router);
  registerStats(router);
  return router.handle.bind(router);
}

