import { send } from '../utils';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';
import { userRepo } from '../repositories/userRepo';

export function registerGroup(router: Router): void {
  router.add('GET', '/group/members', withAuth('user', async (req, res) => {
    const userId = String(((req as any).user?.id as string) || '');
    let userEmail = String((req as any).user?.email || '').toLowerCase();
    const budget = budgetRepo();
    const users = userRepo();
    const budgetId = await budget.getOrCreateDefaultBudgetId(userId);
    if (!userEmail) {
      try {
        const self = await users.findById(userId);
        userEmail = String(self?.email || '').toLowerCase();
      } catch {}
    }
    let participants = await budget.listParticipants(budgetId);
    // Ensure current user is represented as a participant in the budget
    try {
      if (userEmail && !participants.some(p => (p.email || '').toLowerCase() === userEmail)) {
        const name = userEmail.split('@')[0] || 'You';
        await budget.addParticipant(budgetId, name, 0, userEmail);
        participants = await budget.listParticipants(budgetId);
      }
    } catch {}
    const items = await Promise.all(participants.map(async (p) => {
      const email = (p.email || '').toLowerCase();
      const exists = email ? !!(await users.findByEmail(email)) : false;
      return { id: p.id, name: p.name, email: p.email, accepted: exists };
    }));
    return send(res, 200, items);
  }) as any);
}
