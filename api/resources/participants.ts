import { send, readJson } from '../utils';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';

export function registerParticipants(router: Router): void {
  router.add('GET', '/participants', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const qGroup = url.searchParams.get('group') || url.searchParams.get('groupId');
    const defaultBudgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const budgetId = qGroup || defaultBudgetId;
    if ((repo as any).hasAccess && !(await (repo as any).hasAccess(budgetId, userId))) return send(res, 403, { error: 'Forbidden' });
    const rows = await repo.listParticipants(budgetId);
    return send(res, 200, rows);
  }) as any);

  // Allow a regular user to update their own participant by email association
  // NOTE: Must be registered BEFORE /participants/:id to avoid param route catching it
  router.add('PATCH', '/participants/me', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const email = String((req as any).user?.email || '').toLowerCase();
    const body = await readJson<{ name?: string; email?: string; income?: number }>(req);
    const repo = budgetRepo();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const qGroup = url.searchParams.get('group') || url.searchParams.get('groupId');
    const defaultBudgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const budgetId = qGroup || defaultBudgetId;
    if ((repo as any).hasAccess && !(await (repo as any).hasAccess(budgetId, userId))) return send(res, 403, { error: 'Forbidden' });
    let me = email ? ( (repo as any).findParticipantByEmailInBudget ? await (repo as any).findParticipantByEmailInBudget(budgetId, email) : await (repo as any).findParticipantByEmail?.(email) ) : null;
    if (!me) {
      // Create a participant for the user when not present
      const name = (email.split('@')[0] || 'You');
      me = await repo.addParticipant(budgetId, name, 0, email);
    }
    const patch: any = {};
    if (body.name != null) patch.name = String(body.name).trim();
    if (body.email != null) patch.email = String(body.email).trim().toLowerCase();
    if (body.income != null) patch.income = Math.max(0, Number(body.income) || 0);
    const updated = await repo.updateParticipant(budgetId, me.id, patch);
    try {
      if (patch.income != null) {
        await (repo as any).recordIncomeChange?.(me.id, Math.max(0, Number(patch.income) || 0), new Date().toISOString());
      }
    } catch {}
    return send(res, 200, updated);
  }) as any);

  router.add('POST', '/participants', withAuth('admin', async (req, res) => {
    type Body = { name?: string; email?: string; income?: number };
    const userId = ((req as any).user?.id as string) || 'anon';
    const body = await readJson<Body>(req);
    const repo = budgetRepo();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const qGroup = url.searchParams.get('group') || url.searchParams.get('groupId');
    const defaultBudgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const budgetId = qGroup || defaultBudgetId;
    if ((repo as any).hasAccess && !(await (repo as any).hasAccess(budgetId, userId))) return send(res, 403, { error: 'Forbidden' });
    const name = String((body.name || '').toString().trim()) || `Person`;
    const emailRaw = (body.email || '').toString().trim();
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const income = Math.max(0, Number(body.income) || 0);
    if (email) {
      const existing = (repo as any).findParticipantByEmailInBudget ? await (repo as any).findParticipantByEmailInBudget(budgetId, email) : await (repo as any).findParticipantByEmail?.(email);
      if (existing) return send(res, 409, { error: 'Email already registered' });
    }
    const p = await repo.addParticipant(budgetId, name, income, email || undefined);
    try { await repo.logActivity(userId, budgetId, 'add-participant', 'participant', p.id, { name, email, income }); } catch {}
    return send(res, 201, p);
  }) as any);

  router.add('PATCH', '/participants/:id', withAuth('admin', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const body = await readJson<{ name?: string; email?: string; income?: number }>(req);
    const repo = budgetRepo();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const qGroup = url.searchParams.get('group') || url.searchParams.get('groupId');
    const defaultBudgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const budgetId = qGroup || defaultBudgetId;
    if ((repo as any).hasAccess && !(await (repo as any).hasAccess(budgetId, userId))) return send(res, 403, { error: 'Forbidden' });
    const updated = await repo.updateParticipant(budgetId, params.id, {
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.email != null ? { email: String(body.email).trim().toLowerCase() } : {}),
      ...(body.income != null ? { income: Math.max(0, Number(body.income) || 0) } : {}),
    });
    try {
      if (body.income != null) {
        await (repo as any).recordIncomeChange?.(params.id, Math.max(0, Number(body.income) || 0), new Date().toISOString());
      }
    } catch {}
    if (!updated) return send(res, 404, { error: 'Not found' });
    try { await repo.logActivity(userId, budgetId, 'update-participant', 'participant', params.id, body); } catch {}
    return send(res, 200, updated);
  }) as any);

  router.add('DELETE', '/participants/:id', withAuth('admin', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const qGroup = url.searchParams.get('group') || url.searchParams.get('groupId');
    const defaultBudgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const budgetId = qGroup || defaultBudgetId;
    if ((repo as any).hasAccess && !(await (repo as any).hasAccess(budgetId, userId))) return send(res, 403, { error: 'Forbidden' });
    await repo.deleteParticipant(budgetId, params.id);
    try { await repo.logActivity(userId, budgetId, 'delete-participant', 'participant', params.id, {}); } catch {}
    return send(res, 204);
  }) as any);

  // DELETE remains last
}
