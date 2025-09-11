import { send } from '../utils';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';

export function registerActivities(router: Router): void {
  router.add('GET', '/activities', withAuth('user', async (req, res) => {
    const userId = (req.user?.id as string) || 'anon';
    const page = Math.max(1, Number(new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, Number(new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).searchParams.get('limit') || '20')));
    const repo = budgetRepo();
    const { items, total } = await repo.listActivities(userId, page, limit);
    return send(res, 200, { items, total, page, pageSize: limit });
  }));
}
