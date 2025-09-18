import { send } from '../utils.js';
import type { Router } from '../router.js';

export function registerHealth(router: Router): void {
  router.add('GET', '/health', async (_req, res) => send(res, 200, { status: 'ok' }));
}
