import { send } from '../utils.js';
import type { Router } from '../router.js';
import { withAuth } from '../auth.js';
import { budgetRepo } from '../repositories/budgetRepo.js';
import { userRepo } from '../repositories/userRepo.js';

export function registerGroup(router: Router): void {
  router.add('GET', '/group/members', withAuth('user', async (req, res) => {
    const userId = String((req.user?.id as string) || '');
    let userEmail = String(req.user?.email || '').toLowerCase();
    const budget = budgetRepo();
    const users = userRepo();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const qGroup = url.searchParams.get('group') || url.searchParams.get('groupId');
    const defaultBudgetId = await budget.getOrCreateDefaultBudgetId(userId);
    const requestedBudgetId = qGroup || defaultBudgetId;
    // Authorization: ensure user can access the requested group
    if (budget.hasAccess && !(await budget.hasAccess(requestedBudgetId, userId))) {
      // Allow default owner access fallback
      const isOwner = budget.isOwner ? await budget.isOwner(requestedBudgetId, userId) : false;
      if (!isOwner) return send(res, 403, { error: 'Forbidden' });
    }
    const budgetId = requestedBudgetId;
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
      // If membership table exists, compute accepted from membership; else fallback to user existence
      let accepted = false;
      if (budget.listInvites || budget.hasAccess) {
        // A member is "accepted" if there's a registered user with this email and that user has access to the budget
        const u = email ? await users.findByEmail(email) : null;
        accepted = !!(u && (budget.hasAccess ? await budget.hasAccess(budgetId, u.id) : false));
      } else {
        accepted = email ? !!(await users.findByEmail(email)) : false;
      }
      return { id: p.id, name: p.name, email: p.email, accepted };
    }));
    return send(res, 200, items);
  }));
}
