import { send } from '../utils.js';
import type { Router } from '../router.js';
import { withAuth } from '../auth.js';
import { budgetRepo } from '../repositories/budgetRepo.js';

export function registerTransactionTypes(router: Router): void {
  router.add('GET', '/transaction-types', withAuth('user', async (_req, res) => {
    const repo = budgetRepo();
    const rows = await repo.listTransactionTypes?.();
    return send(res, 200, rows || [
      { code: 'expense', name: 'Expense' },
      { code: 'income', name: 'Income' },
      { code: 'transfer', name: 'Transfer' },
    ]);
  }));
}
