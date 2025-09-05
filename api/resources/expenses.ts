import { send, readJson } from '../utils';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';

export function registerExpenses(router: Router): void {
  router.add('GET', '/expenses', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const rows = await repo.listExpenses(budgetId);
    return send(res, 200, rows);
  }) as any);

  router.add('POST', '/expenses', withAuth('admin', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    type Body = { name?: string; total?: number };
    const body = await readJson<Body>(req);
    const name = String((body.name || '').toString().trim()) || 'Expense';
    const total = Math.max(0, Number(body.total) || 0);
    const e = await repo.addExpense(budgetId, name, total);
    return send(res, 201, e);
  }) as any);

  router.add('PATCH', '/expenses/:id', withAuth('admin', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    type Body = { name?: string; total?: number };
    const body = await readJson<Body>(req);
    const updated = await repo.updateExpense(budgetId, params.id, {
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.total != null ? { total: Math.max(0, Number(body.total) || 0) } : {}),
    });
    if (!updated) return send(res, 404, { error: 'Not found' });
    return send(res, 200, updated);
  }) as any);

  router.add('DELETE', '/expenses/:id', withAuth('admin', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    await repo.deleteExpense(budgetId, params.id);
    return send(res, 204);
  }) as any);
}
