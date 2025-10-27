// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localRequest } from '../test-utils.js';

function fakeToken(sub: string, roles: string[] = ['user']): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = Buffer.from(JSON.stringify({ sub, app_metadata: { roles } })).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${payload}.sig`;
}

describe('activities shared access', () => {
  let handler: any;
  let repo: any;

  const ownerId = 'owner-user';
  const memberId = 'member-user';

  beforeEach(async () => {
    vi.resetModules();
    process.env['NO_LISTEN'] = '1';
    delete process.env['AUTH_JWT_SECRET'];
    const appMod = await import('../app.js');
    handler = appMod.createApp();
    const repoMod = await import('../repositories/budgetRepo.js');
    repo = repoMod.budgetRepo();
  });

  async function request(method: string, path: string, token: string) {
    const headers = { authorization: `Bearer ${token}` };
    return localRequest(handler as any, method, path, undefined, headers);
  }

  it('allows owners and members to see full activity feed for shared groups', async () => {
    const budget = await repo.createBudget(ownerId, 'Shared Group');
    const budgetId: string = budget.id;
    if (repo.addMember) await repo.addMember(budgetId, memberId);

    await repo.logActivity(ownerId, budgetId, 'add-transaction', 'transaction', 'tx-owner', { total: 100 });
    await repo.logActivity(memberId, budgetId, 'update-transaction', 'transaction', 'tx-member', { total: 120 });

    const ownerToken = fakeToken(ownerId);
    const memberToken = fakeToken(memberId);

    const ownerResp = await request('GET', '/activities', ownerToken);
    expect(ownerResp.status).toBe(200);
    expect(ownerResp.json?.items?.length).toBe(2);

    const memberResp = await request('GET', '/activities', memberToken);
    expect(memberResp.status).toBe(200);
    const memberItems = memberResp.json?.items ?? [];
    expect(memberItems.length).toBe(2);
    const actions = memberItems.map((a: { action: string }) => a.action).sort();
    expect(actions).toEqual(['add-transaction', 'update-transaction']);
  });
});
