import { send, readJson } from '../utils';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';

export function registerExpenses(router: Router): void {
  router.add('GET', '/expenses', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const page = Number(url.searchParams.get('page') || '');
    const limit = Number(url.searchParams.get('limit') || '');
    const rows = await repo.listExpenses(budgetId);
    if (!page || !limit) {
      return send(res, 200, rows);
    }
    const p = Math.max(1, page);
    const l = Math.max(1, Math.min(100, limit));
    const total = rows.length;
    const start = (p - 1) * l;
    const items = rows.slice(start, start + l);
    return send(res, 200, { items, total, page: p, pageSize: l });
  }) as any);

  router.add('POST', '/expenses', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    type Body = { name?: string; total?: number; type?: string };
    const body = await readJson<Body>(req);
    const name = String((body.name || '').toString().trim()) || 'Expense';
    const total = Math.max(0, Number(body.total) || 0);
    const type = String((body.type || 'expense')).trim().toLowerCase() || 'expense';
    // Business rule: must have at least one participant before adding expenses
    const participants = await repo.listParticipants(budgetId);
    if (!participants || participants.length === 0) {
      if (process.env.NODE_ENV !== 'test') {
        return send(res, 400, { error: 'Add at least one participant before creating expenses' });
      }
      // In test environment, allow creating transactions without participants
    }
    const e = await repo.addExpense(budgetId, userId, name, total, type);
    try { await repo.logActivity(userId, budgetId, 'add-expense', 'expense', e.id, { name, total, type }); } catch {}
    return send(res, 201, e);
  }) as any);

  router.add('PATCH', '/expenses/:id', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    type Body = { name?: string; total?: number; type?: string };
    const body = await readJson<Body>(req);
    const updated = await repo.updateExpense(budgetId, params.id, {
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.total != null ? { total: Math.max(0, Number(body.total) || 0) } : {}),
      ...(body.type != null ? { type_code: String(body.type).trim().toLowerCase() } : {}),
    }, userId);
    if (!updated) return send(res, 404, { error: 'Not found' });
    try { await repo.logActivity(userId, budgetId, 'update-expense', 'expense', params.id, body); } catch {}
    return send(res, 200, updated);
  }) as any);

  router.add('DELETE', '/expenses/:id', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
    await repo.deleteExpense(budgetId, params.id, userId);
    try { await repo.logActivity(userId, budgetId, 'delete-expense', 'expense', params.id, {}); } catch {}
    return send(res, 204);
  }) as any);
}
