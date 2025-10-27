// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localRequest } from '../test-utils.js';

describe('shared transactions permissions', () => {
  let handler: any;
  let ownerToken: string;
  let memberToken: string;
  let groupId: string;

  async function request(
    method: string,
    path: string,
    body?: unknown,
    token?: string
  ): Promise<{ status: number; json?: any }> {
    const headers = token ? { authorization: `Bearer ${token}` } : undefined;
    const res = await localRequest(handler, method, path, body, headers);
    return { status: res.status, json: res.json };
  }

  beforeEach(async () => {
    vi.resetModules();
    process.env['NO_LISTEN'] = '1';
    process.env['AUTH_JWT_SECRET'] = 'dev-secret';
    const { createApp } = await import('../app.js');
    handler = createApp();

    const registerOwner = await request('POST', '/auth/register', { email: 'owner@example.com', name: 'Owner', password: 'secret123' });
    expect(registerOwner.status).toBe(201);
    const registerMember = await request('POST', '/auth/register', { email: 'member@example.com', name: 'Member', password: 'secret123' });
    expect(registerMember.status).toBe(201);

    const ownerLogin = await request('POST', '/auth/login', { email: 'owner@example.com', password: 'secret123' });
    expect(ownerLogin.status).toBe(200);
    ownerToken = ownerLogin.json.access_token;

    const memberLogin = await request('POST', '/auth/login', { email: 'member@example.com', password: 'secret123' });
    expect(memberLogin.status).toBe(200);
    memberToken = memberLogin.json.access_token;

    const groupRes = await request('POST', '/groups', { name: 'Shared Budget' }, ownerToken);
    expect(groupRes.status).toBe(201);
    groupId = groupRes.json.id;

    const inviteRes = await request('POST', `/groups/${groupId}/invites`, { emails: ['member@example.com'] }, ownerToken);
    expect(inviteRes.status).toBe(201);
    const inviteId = inviteRes.json?.[0]?.id;
    expect(inviteId).toBeTruthy();

    const acceptRes = await request('POST', `/groups/${groupId}/invites/${inviteId}/accept`, undefined, memberToken);
    expect(acceptRes.status).toBe(200);
  });

  it('allows shared members to edit but restricts deleting to the owner', async () => {
    const created = await request('POST', `/expenses?group=${groupId}`, { name: 'Dinner', total: 100 }, ownerToken);
    expect(created.status).toBe(201);
    const txId = created.json.id;
    expect(txId).toBeTruthy();

    const ownerUpdate = await request('PATCH', `/expenses/${txId}?group=${groupId}`, { total: 120 }, ownerToken);
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.json.total).toBe(120);

    const memberUpdate = await request('PATCH', `/expenses/${txId}?group=${groupId}`, { name: 'Dinner out' }, memberToken);
    expect(memberUpdate.status).toBe(200);
    expect(memberUpdate.json.name).toBe('Dinner out');

    const memberDelete = await request('DELETE', `/expenses/${txId}?group=${groupId}`, undefined, memberToken);
    expect(memberDelete.status).toBe(403);

    const ownerDelete = await request('DELETE', `/expenses/${txId}?group=${groupId}`, undefined, ownerToken);
    expect(ownerDelete.status).toBe(204);
  });
});
