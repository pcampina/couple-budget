import { send } from '../utils';
import type { Router } from '../router';

export function registerHealth(router: Router): void {
  router.add('GET', '/health', async (_req, res) => send(res, 200, { status: 'ok' }));
}
