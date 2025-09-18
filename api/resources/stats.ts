import { send } from '../utils.js';
import { splitByIncome } from '../domain/split.js';
import type { Router } from '../router.js';
import { withAuth } from '../auth.js';
import { budgetRepo } from '../repositories/budgetRepo.js';
import type { DbTransaction } from '../repositories/budgetRepo.js';

async function transactionsWithAllocations(budgetId: string) {
  const repo = budgetRepo();
  const transactions = await repo.listTransactions(budgetId);
  const results: Array<DbTransaction & { allocations: Record<string, number> }> = [];
  for (const t of transactions) {
    const participantsAt = await repo.getParticipantsIncomeAt?.(budgetId, t.created_at || new Date().toISOString())
      || await repo.listParticipants(budgetId);
    results.push({
      ...t,
      allocations: splitByIncome(t.total || 0, participantsAt),
    });
  }
  return results;
}

async function totalsPerParticipant(budgetId: string) {
  const repo = budgetRepo();
  const participants = await repo.listParticipants(budgetId);
  const totals: Record<string, number> = Object.fromEntries(participants.map(p => [p.id, 0]));
  const withAllocs = await transactionsWithAllocations(budgetId);
  for (const t of withAllocs) {
    for (const pid of Object.keys(t.allocations)) {
      totals[pid] = (totals[pid] || 0) + t.allocations[pid];
    }
  }
  return totals;
}

export function registerStats(router: Router): void {
  router.add('GET', '/stats', withAuth('user', async (req, res) => {
    const userId = (req.user?.id as string) || 'anon';
    const repo = budgetRepo();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const qGroup = url.searchParams.get('group') || url.searchParams.get('groupId');
    const defaultBudgetId = await repo.getOrCreateDefaultBudgetId(userId);
    const budgetId = qGroup || defaultBudgetId;
    if (repo.hasAccess && !(await repo.hasAccess(budgetId, userId))) return send(res, 403, { error: 'Forbidden' });
    const participants = await repo.listParticipants(budgetId);
    const transactions = await repo.listTransactions(budgetId);
    const totalIncome = participants.reduce((acc, p) => acc + (p.income || 0), 0);
    const participantShares = participants.map(p => ({
      id: p.id, name: p.name, share: totalIncome > 0 ? p.income / totalIncome : 0,
    }));
    const totalTransactions = transactions.reduce((acc, t) => acc + (t.total || 0), 0);
    return send(res, 200, {
      participants,
      transactions,
      participantShares,
      transactionsWithAllocations: await transactionsWithAllocations(budgetId),
      totalIncome,
      totalTransactions,
      totalsPerParticipant: await totalsPerParticipant(budgetId),
    });
  }));
}