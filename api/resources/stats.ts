import { send } from '../utils';
import { splitByIncome } from '../domain/split';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';

async function expensesWithAllocations(budgetId: string) {
  const repo = budgetRepo();
  const expenses = await repo.listExpenses(budgetId);
  const participants = await repo.listParticipants(budgetId);
  return expenses.map(e => ({
    ...e,
    allocations: splitByIncome(e.total, participants),
  }));
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
    const repo = budgetRepo();
    const budgetId = await repo.getOrCreateDefaultBudgetId(userId);
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
