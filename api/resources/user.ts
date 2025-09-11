import { send, readJson } from '../utils';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { userRepo } from '../repositories/userRepo';

export function registerUser(router: Router): void {
  router.add('GET', '/users/me', withAuth('user', async (req, res) => {
    const userId = req.user?.id as string;
    const repo = userRepo();
    const user = await repo.findById(userId);
    if (!user) return send(res, 404, { error: 'User not found' });
    return send(res, 200, user);
  }));

  router.add('PATCH', '/users/me', withAuth('user', async (req, res) => {
    const userId = req.user?.id as string;
    const body = await readJson<{ default_income?: number }>(req);
    const repo = userRepo();
    const patch: { default_income?: number } = {};
    if (body.default_income != null) {
      patch.default_income = Math.max(0, Number(body.default_income) || 0);
    }
    if (Object.keys(patch).length === 0) {
      return send(res, 400, { error: 'No fields to update' });
    }
    const updated = await repo.updateUser(userId, patch);
    return send(res, 200, updated);
  }));
}
