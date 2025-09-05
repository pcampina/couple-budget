import { send, readJson } from '../utils';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';

export function registerParticipants(router: Router): void {
  router.add('GET', '/participants', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const rows = await repo.listParticipants(budgetId);
    return send(res, 200, rows);
  }) as any);

  router.add('POST', '/participants', withAuth('admin', async (req, res) => {
    type Body = { name?: string; income?: number };
    const userId = ((req as any).user?.id as string) || 'anon';
    const body = await readJson<Body>(req);
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const name = String((body.name || '').toString().trim()) || `Person`;
    const income = Math.max(0, Number(body.income) || 0);
    const p = await repo.addParticipant(budgetId, name, income);
    return send(res, 201, p);
  }) as any);

  router.add('PATCH', '/participants/:id', withAuth('admin', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const body = await readJson<{ name?: string; income?: number }>(req);
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const updated = await repo.updateParticipant(budgetId, params.id, {
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.income != null ? { income: Math.max(0, Number(body.income) || 0) } : {}),
    });
    if (!updated) return send(res, 404, { error: 'Not found' });
    return send(res, 200, updated);
  }) as any);

  router.add('DELETE', '/participants/:id', withAuth('admin', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    await repo.deleteParticipant(budgetId, params.id);
    return send(res, 204);
  }) as any);
}
