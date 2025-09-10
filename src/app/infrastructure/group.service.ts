import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BudgetStore } from '@application/budget.store';
import { ApiService } from '@app/infrastructure/api.service';
import { NotificationService } from '@app/infrastructure/notification.service';
import { ErrorService } from '@app/infrastructure/error.service';
import { AuthService } from './auth.service';
import { slugify } from '../shared/utils';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly errors = inject(ErrorService);
  private readonly store = inject(BudgetStore);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly groups = signal<{ id: string; name: string; role: 'owner' | 'member'; shared?: boolean }[]>([]);
  readonly selectedGroup = computed(() => this.groups().find(g => g.id === (this.store.groupId() || '')) || null);
  readonly isOwner = computed(() => this.selectedGroup()?.role === 'owner');

  readonly groupNameInput = signal<string>('');
  readonly inviteEmails = signal<string>('');
  readonly lastInvites = signal<{ email: string; token: string }[]>([]);
  readonly invites = signal<{ id: string; email: string; token?: string; created_at: string; accepted_at?: string | null }[]>([]);
  readonly pendingInvites = computed(() => (this.invites() || []).filter(i => !i.accepted_at));
  readonly members = signal<{ id: string; name: string; email: string | null; accepted: boolean }[]>([]);

  async loadGroupData(groupSlug: string | null): Promise<boolean> {
    try {
      await this.loadGroups();
      const group = groupSlug ? this.groups().find(x => slugify(x.name) === groupSlug) : null;
      const groupId = group?.id || null;
      this.store.setGroupId(groupId);

      if (groupId) {
        await this.store.refreshFromApi(true);
        await this.loadMembers();
        await this.loadInvites();
      }
      return true;
    } catch (e: any) {
      if (e && (e.status === 403 || e.statusCode === 403)) {
        return false;
      }
      this.errors.handle(e, { userMessage: 'Failed to load group', showToast: true, context: 'group.load' });
      return false;
    }
  }

  async loadGroups() {
    try {
      const list = await this.api.listGroups();
      this.groups.set(list);
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to load groups', showToast: true, context: 'groups.list' });
    }
  }

  async selectGroup(id: string | null) {
    this.store.setGroupId(id);
    try {
      if (id) {
        const g = this.groups().find(x => x.id === id);
        const slug = g ? slugify(g.name) : id;
        await this.router.navigate(['/transactions', slug]);
      } else {
        await this.router.navigate(['/transactions']);
      }
    } catch {}
    if (this.store.groupId()) {
        await this.store.refreshFromApi(true);
        await this.loadMembers();
        await this.loadInvites();
    }
  }

  async createGroup() {
    const n = this.groupNameInput().trim();
    if (!n) return;
    try {
      await this.api.createGroup(n);
      this.groupNameInput.set('');
      await this.loadGroups();
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to create group', showToast: true, context: 'groups.create' });
    }
  }

  navigateToGroupSettings(id: string) {
    const g = this.groups().find(x => x.id === id);
    const slug = g ? slugify(g.name) : id;
    try {
      this.router.navigate(['/group', slug]);
    } catch {}
  }

  async deleteGroup() {
    const g = this.selectedGroup();
    if (!g || !this.isOwner()) return;
    try {
      await this.api.deleteGroup(g.id);
      this.notify.success('Group deleted');
      await this.loadGroups();
      await this.selectGroup(null);
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to delete group', showToast: true, context: 'groups.delete' });
    }
  }

  async loadInvites() {
    const gid = this.store.groupId();
    if (!gid) {
      this.invites.set([]);
      return;
    }
    try {
      const list = this.isOwner() ? await this.api.listInvites(gid) : await this.api.listMyInvites(gid);
      this.invites.set(list);
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to load invites', showToast: true, context: 'groups.invites' });
    }
  }

  async sendInvites() {
    const gid = this.store.groupId();
    if (!gid || !this.isOwner()) {
        this.notify.error('Only the owner can invite');
        return;
    }
    const raw = this.inviteEmails().trim();
    if (!raw) return;
    const emails = raw.split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
    try {
      const invites = await this.api.sendInvites(gid, emails);
      this.lastInvites.set(invites.map(i => ({ email: i.email, token: i.token })));
      this.notify.success(`Invites sent to ${invites.length} email(s)`);
      this.inviteEmails.set('');
      await this.loadInvites();
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to send invites', showToast: true, context: 'group.invite' });
    }
  }

  async revokeInvite(inviteId: string) {
    const gid = this.store.groupId();
    if (!gid || !this.isOwner()) return;
    try {
      await this.api.revokeInvite(gid, inviteId);
      this.notify.success('Invite revoked');
      await this.loadInvites();
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to revoke invite', showToast: true, context: 'group.revoke' });
    }
  }

  async resendInvite(inviteId: string) {
    const gid = this.store.groupId();
    if (!gid || !this.isOwner()) return;
    try {
      await this.api.resendInvite(gid, inviteId);
      this.notify.success('Invite resent');
      await this.loadInvites();
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to resend invite', showToast: true, context: 'group.resend' });
    }
  }

  async acceptInvite(inviteId: string) {
    const gid = this.store.groupId();
    if (!gid) return;
    try {
      await this.api.acceptInviteById(gid, inviteId);
      this.notify.success('Invite accepted');
      await this.store.refreshFromApi(true);
      await this.loadGroupData(this.selectedGroup()?.name || null);
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to accept invite', showToast: true, context: 'group.acceptId' });
    }
  }

  async acceptInviteByToken(token: string) {
    if (!token) return;
    try {
      await this.api.acceptInvite(token);
      this.notify.success('Invite accepted');
      await this.store.refreshFromApi(true);
      // We don't know which group this was for, so we can't easily refresh the page.
      // The user will have to navigate to the group manually.
      // Or we could try to find the group from the user's new groups list.
      await this.loadGroups();
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to accept invite', showToast: true, context: 'group.accept' });
    }
  }

  async rejectInvite(inviteId: string) {
    const gid = this.store.groupId();
    if (!gid) return;
    try {
      await this.api.rejectInviteById(gid, inviteId);
      this.notify.success('Invite rejected');
      await this.loadInvites();
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to reject invite', showToast: true, context: 'group.reject' });
    }
  }

  async loadMembers() {
    const gid = this.store.groupId();
    if (!gid) {
      this.members.set([]);
      return;
    }
    try {
      const list = await this.api.listGroupMembers(gid);
      this.members.set(list);
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to load members', showToast: true, context: 'groups.members' });
    }
  }

  async removeMember(participantId: string) {
    const gid = this.store.groupId();
    if (!gid || !this.isOwner()) return;
    try {
      await this.api.removeGroupMember(gid, participantId);
      this.notify.success('Member removed');
      await this.loadMembers();
      await this.store.refreshFromApi(true);
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to remove member', showToast: true, context: 'groups.removeMember' });
    }
  }

  async leaveGroup() {
    const g = this.selectedGroup();
    if (!g || this.isOwner()) return;
    try {
      await this.api.leaveGroup(g.id);
      this.notify.success('You left the group');
      await this.loadGroups();
      await this.selectGroup(null);
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to leave group', showToast: true, context: 'groups.leave' });
    }
  }
}
