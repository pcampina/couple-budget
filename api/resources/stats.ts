import { send } from '../utils';
import { splitByIncome } from '../domain/split';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';

async function expensesWithAllocations(budgetId: string) {
  const repo = budgetRepo();
  const expenses = await repo.listExpenses(budgetId);
  const results: any[] = [];
  for (const e of expenses) {
    const participantsAt = await (repo as any).getParticipantsIncomeAt?.(budgetId, (e as any).created_at || new Date().toISOString())
      || await repo.listParticipants(budgetId);
    results.push({
      ...e,
      allocations: splitByIncome((e as any).total || 0, participantsAt as any),
    });
  }
  return results;
}

async function totalsPerParticipant(budgetId: string) {
  const repo = budgetRepo();
  const participants = await repo.listParticipants(budgetId);
  const totals: Record<string, number> = Object.fromEntries(participants.map(p => [p.id, 0]));
  const withAllocs = await expensesWithAllocations(budgetId);
  for (const e of withAllocs) {
    for (const pid of Object.keys(e.allocations)) {
      totals[pid] = (totals[pid] || 0) + e.allocations[pid];
    }
  }
  return totals;
}

export function registerStats(router: Router): void {
  router.add('GET', '/stats', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const userEmail = String((req as any).user?.email || '').toLowerCase();
    const repo = budgetRepo();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const qGroup = url.searchParams.get('group') || url.searchParams.get('groupId');
    const defaultBudgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const budgetId = qGroup || defaultBudgetId;
    if ((repo as any).hasAccess && !(await (repo as any).hasAccess(budgetId, userId))) return send(res, 403, { error: 'Forbidden' });
    const participants = await repo.listParticipants(budgetId);
    const expenses = await repo.listExpenses(budgetId);
    const totalIncome = participants.reduce((acc, p) => acc + (p.income || 0), 0);
    const participantShares = participants.map(p => ({
      id: p.id, name: p.name, share: totalIncome > 0 ? p.income / totalIncome : 0,
    }));
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.total || 0), 0);
    return send(res, 200, {
      participants,
      expenses,
      participantShares,
      expensesWithAllocations: await expensesWithAllocations(budgetId),
      totalIncome,
      totalExpenses,
      totalsPerParticipant: await totalsPerParticipant(budgetId),
    });
  }) as any);
}
