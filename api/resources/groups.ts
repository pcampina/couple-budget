import { send, readJson } from '../utils';
import type { Router } from '../router';
import { withAuth } from '../auth';
import { budgetRepo } from '../repositories/budgetRepo';
import { userRepo } from '../repositories/userRepo';
import { sendMail } from '../mailer';
import { inviteTemplate } from '../mail/templates';

export function registerGroups(router: Router): void {
  // List groups current user can access (owner or member)
  router.add('GET', '/groups', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const items = await (repo as any).listUserBudgets?.(userId) || [];
    // Augment with shared flag when possible: shared if has members or pending invites
    for (const it of items as any[]) {
      try {
        const n = (repo as any).countMembers ? await (repo as any).countMembers(it.id) : 0;
        let inviteCount = 0;
        if ((repo as any).listInvites) {
          const list = await (repo as any).listInvites(it.id);
          inviteCount = (list || []).length;
        }
        it.shared = Number(n || 0) > 0 || inviteCount > 0;
      } catch { it.shared = false; }
    }
    return send(res, 200, items);
  }) as any);

  // Remove a member (owner only) by participant id; also removes participant entry
  router.add('DELETE', '/groups/:id/members/:participantId', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const isOwner = await (repo as any).isOwner?.(params.id, userId);
    if (!isOwner) return send(res, 403, { error: 'Only the owner can remove members' });
    // Find participant details
    const participants = await (repo as any).listParticipants?.(params.id) || [];
    const p = (participants as any[]).find((x: any) => x.id === params.participantId);
    if (!p) return send(res, 404, { error: 'Participant not found' });
    // Do not allow removing the owner via this endpoint
    if (p.user_id && String(p.user_id) === String(userId)) {
      return send(res, 400, { error: 'Owner cannot remove themselves. Delete the group instead.' });
    }
    // Remove membership if there is a linked user
    if (p.user_id && (repo as any).removeMember) {
      try { await (repo as any).removeMember(params.id, p.user_id); } catch {}
    }
    // Also remove participant entry for cleanliness
    if ((repo as any).deleteParticipant) {
      try { await (repo as any).deleteParticipant(params.id, params.participantId); } catch {}
    }
    return send(res, 204);
  }) as any);

  // Current user leaves the group (non-owner)
  router.add('POST', '/groups/:id/leave', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    // Owner cannot leave; suggest deleting group
    const isOwner = await (repo as any).isOwner?.(params.id, userId);
    if (isOwner) return send(res, 400, { error: 'Owner cannot leave the group; delete it instead.' });
    // Remove membership
    if ((repo as any).removeMember) {
      try { await (repo as any).removeMember(params.id, userId); } catch {}
    }
    // Remove own participant record if exists
    try {
      const participants = await (repo as any).listParticipants?.(params.id) || [];
      const p = (participants as any[]).find((x: any) => String(x.user_id || '') === String(userId));
      if (p && (repo as any).deleteParticipant) await (repo as any).deleteParticipant(params.id, p.id);
    } catch {}
    return send(res, 204);
  }) as any);

  // Create a new group
  router.add('POST', '/groups', withAuth('user', async (req, res) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const body = await readJson<{ name?: string }>(req).catch(() => ({} as any));
    const name = String(body?.name || '').trim() || 'Group';
    
    const users = userRepo();
    const user = await users.findById(userId);
    console.log('User found:', user);
    const income = user?.default_income || 0;
    console.log('Income to be set:', income);
    const userName = user?.name || 'Owner';
    const userEmail = user?.email || '';

    const repo = budgetRepo();
    const b = await (repo as any).createBudget?.(userId, name);
    if (!b) return send(res, 501, { error: 'Groups not supported' });

    // Add the creator as a participant
    if ((repo as any).addParticipant) {
      console.log('Adding participant with income:', income);
      await (repo as any).addParticipant(b.id, userName, income, userEmail);
    }

    return send(res, 201, b);
  }) as any);

  // Create invites for a group (owner only)
  router.add('POST', '/groups/:id/invites', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const isOwner = await (repo as any).isOwner?.(params.id, userId);
    if (!isOwner) return send(res, 403, { error: 'Only the owner can invite members' });
    const body = await readJson<{ emails?: string[] }>(req).catch(() => ({ emails: [] }));
    const emails = Array.from(new Set((body.emails || []).map(e => String(e).trim().toLowerCase()).filter(Boolean)));
    if (emails.length === 0) return send(res, 400, { error: 'Provide at least one email' });
    const invites = await (repo as any).createInvites?.(params.id, userId, emails) || [];
    // Email invites (best effort) using Mailhog
    const appUrl = process.env.PUBLIC_APP_URL || `http://${req.headers.host || 'localhost:4200'}`;
    // Fetch group name (optional, best effort)
    let groupName = 'Group';
    try {
      const groups = await (repo as any).listUserBudgets?.(userId);
      const g = (groups || []).find((x: any) => x.id === params.id);
      if (g?.name) groupName = g.name;
    } catch {}
    let inviterEmail = '';
    try { inviterEmail = String(((await userRepo().findById(userId)) as any)?.email || ''); } catch {}
    for (const i of invites as any[]) {
      const link = `${appUrl.replace(/\/$/, '')}/invite/${i.token}`;
      const { subject, text, html } = inviteTemplate({ inviterEmail, groupName, link });
      try { await sendMail({ to: i.email, subject, text, html }); } catch {}
    }
    // Return tokens to allow the client to build links
    return send(res, 201, invites.map((i: any) => ({ id: i.id, email: i.email, token: i.token, created_at: i.created_at })));
  }) as any);

  // List invites for a group (owner only)
  router.add('GET', '/groups/:id/invites', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const isOwner = await (repo as any).isOwner?.(params.id, userId);
    if (!isOwner) return send(res, 403, { error: 'Only the owner can view invites' });
    const list = await (repo as any).listInvites?.(params.id) || [];
    return send(res, 200, list);
  }) as any);

  // List invites for current user on this group (recipient view)
  router.add('GET', '/groups/:id/my-invites', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const users = userRepo(); const repo = budgetRepo();
    const self = await users.findById(userId);
    const email = String(self?.email || '').toLowerCase();
    if (!email) return send(res, 200, []);
    const list = await (repo as any).listInvites?.(params.id) || [];
    const mine = list.filter((i: any) => (String(i.email || '').toLowerCase() === email));
    return send(res, 200, mine.map((i: any) => ({ id: i.id, email: i.email, created_at: i.created_at, accepted_at: i.accepted_at })));
  }) as any);

  // Accept invite by inviteId (recipient); no token required
  router.add('POST', '/groups/:id/invites/:inviteId/accept', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const users = userRepo(); const repo = budgetRepo();
    const inv = (repo as any).findInviteById ? await (repo as any).findInviteById(params.inviteId) : null;
    if (!inv || inv.budget_id !== params.id) return send(res, 404, { error: 'Invite not found' });
    const self = await users.findById(userId);
    const email = String(self?.email || '').toLowerCase();
    if (!email || email !== String(inv.email || '').toLowerCase()) return send(res, 403, { error: 'Forbidden' });
    if (inv.accepted_at) return send(res, 400, { error: 'Already accepted' });
    // Mark accepted and add membership + ensure participant
    await (repo as any).markInviteAccepted?.(inv.token, userId);
    if ((repo as any).addMember) await (repo as any).addMember(params.id, userId);
    try {
      const name = (email.split('@')[0] || 'You');
      const income = self?.default_income || 0;
      await (repo as any).addParticipant?.(params.id, name, income, email);
    } catch {}
    return send(res, 200, { budget_id: params.id, status: 'accepted' });
  }) as any);

  // Reject invite by inviteId (recipient)
  router.add('POST', '/groups/:id/invites/:inviteId/reject', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const users = userRepo(); const repo = budgetRepo();
    const inv = (repo as any).findInviteById ? await (repo as any).findInviteById(params.inviteId) : null;
    if (!inv || inv.budget_id !== params.id) return send(res, 404, { error: 'Invite not found' });
    const self = await users.findById(userId);
    const email = String(self?.email || '').toLowerCase();
    if (!email || email !== String(inv.email || '').toLowerCase()) return send(res, 403, { error: 'Forbidden' });
    if ((repo as any).revokeInvite) await (repo as any).revokeInvite(params.inviteId);
    return send(res, 200, { status: 'rejected' });
  }) as any);

  // Accept an invite by token; logged-in user's email must match invited email
  router.add('POST', '/invites/accept', withAuth('user', async (req, res) => {
    const users = userRepo();
    const repo = budgetRepo();
    const userId = ((req as any).user?.id as string) || 'anon';
    const body = await readJson<{ token?: string }>(req).catch(() => ({} as any));
    const token = String(body?.token || '').trim();
    if (!token) return send(res, 400, { error: 'Missing token' });
    const find = (repo as any).findInviteByToken ? await (repo as any).findInviteByToken(token) : null;
    const invite = find || ((await (repo as any).listInvites?.('') || []).find((i: any) => i.token === token));
    if (!invite) return send(res, 404, { error: 'Invite not found' });
    if (invite.accepted_at) return send(res, 400, { error: 'Invite already accepted' });
    // Verify email ownership
    const self = await users.findById(userId);
    const selfEmail = String(self?.email || '').toLowerCase();
    if (!selfEmail || selfEmail !== String(invite.email || '').toLowerCase()) {
      return send(res, 403, { error: 'You are not the owner of this invite email' });
    }
    // Mark accepted and add membership
    const mark = await (repo as any).markInviteAccepted?.(token, userId);
    const budgetId = mark?.budget_id || invite.budget_id;
    if ((repo as any).addMember) await (repo as any).addMember(budgetId, userId);
    // Ensure participant exists in this budget for the accepting user
    try {
      const self2 = await users.findById(userId);
      const email2 = String(self2?.email || '').toLowerCase();
      if (email2) {
        const existingInBudget = (repo as any).findParticipantByEmailInBudget ? await (repo as any).findParticipantByEmailInBudget(budgetId, email2) : null;
        if (!existingInBudget) {
          const name = (email2.split('@')[0] || 'You');
          const income = self2?.default_income || 0;
          await (repo as any).addParticipant?.(budgetId, name, income, email2);
        }
      }
    } catch {}
    return send(res, 200, { budget_id: budgetId, status: 'accepted' });
  }) as any);

  // Rename group (owner only)
  router.add('PATCH', '/groups/:id', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const body = await readJson<{ name?: string }>(req).catch(() => ({} as any));
    const name = String(body?.name || '').trim();
    const repo = budgetRepo();
    const isOwner = await (repo as any).isOwner?.(params.id, userId);
    if (!isOwner) return send(res, 403, { error: 'Only the owner can rename the group' });
    // Update in memory or SQL
    if ((repo as any).createBudget && !(repo as any).updateBudgetName) {
      // Memory path: mutate internal state
      // Not exposed, so no-op for memory; return 200
      return send(res, 200, { id: params.id, name });
    }
    if ((repo as any).updateBudgetName) {
      const out = await (repo as any).updateBudgetName(params.id, name);
      return send(res, 200, out || { id: params.id, name });
    }
    return send(res, 200, { id: params.id, name });
  }) as any);

  // Delete group (owner only)
  router.add('DELETE', '/groups/:id', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const isOwner = await (repo as any).isOwner?.(params.id, userId);
    if (!isOwner) return send(res, 403, { error: 'Only the owner can delete the group' });
    if ((repo as any).deleteBudget) {
      await (repo as any).deleteBudget(params.id);
      return send(res, 204);
    }
    // Memory fallback: mark as inaccessible by removing membership and data
    try {
      if ((repo as any).members) (repo as any).members.delete(params.id);
    } catch {}
    return send(res, 204);
  }) as any);

  // Revoke invite (owner only)
  router.add('DELETE', '/groups/:id/invites/:inviteId', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const isOwner = await (repo as any).isOwner?.(params.id, userId);
    if (!isOwner) return send(res, 403, { error: 'Only the owner can revoke invites' });
    if ((repo as any).revokeInvite) {
      await (repo as any).revokeInvite(params.inviteId);
    } else if ((repo as any).listInvites) {
      const list = await (repo as any).listInvites(params.id);
      const rest = list.filter((i: any) => i.id !== params.inviteId);
      if ((repo as any).setInvitesForBudget) await (repo as any).setInvitesForBudget(params.id, rest);
    }
    return send(res, 204);
  }) as any);

  // Resend invite (owner only) — here we just bump created_at for traceability
  router.add('POST', '/groups/:id/invites/:inviteId/resend', withAuth('user', async (req, res, params) => {
    const userId = ((req as any).user?.id as string) || 'anon';
    const repo = budgetRepo();
    const isOwner = await (repo as any).isOwner?.(params.id, userId);
    if (!isOwner) return send(res, 403, { error: 'Only the owner can resend invites' });
    if ((repo as any).resendInvite) {
      const out = await (repo as any).resendInvite(params.inviteId);
      return send(res, 200, out);
    }
    const list = await (repo as any).listInvites?.(params.id) || [];
    const i = list.find((x: any) => x.id === params.inviteId);
    if (i) i.created_at = new Date().toISOString();
    return send(res, 200, i || {});
  }) as any);
}