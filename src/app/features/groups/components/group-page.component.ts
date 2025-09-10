import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { BudgetStore } from '@application/budget.store';
import { GroupService } from '@app/infrastructure/group.service';

@Component({
  selector: 'app-group-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [DecimalPipe],
  templateUrl: './group-page.component.html',
  styleUrls: ['./group-page.component.scss']
})
export class GroupPageComponent {
  private readonly store = inject(BudgetStore);
  readonly groupService = inject(GroupService);

  readonly members = this.groupService.members;
  readonly invites = this.groupService.invites;
  readonly pendingInvites = this.groupService.pendingInvites;
  readonly lastInvites = this.groupService.lastInvites;
  readonly isOwner = this.groupService.isOwner;
  readonly inviteEmails = this.groupService.inviteEmails;

  readonly accessDenied = signal<boolean>(false);
  readonly acceptTokenValue = signal<string>('');

  // Map participant id -> share (0..1) based on current income distribution
  readonly shareById = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    try {
      for (const s of this.store.participantShares()) map[s.id] = s.share || 0;
    } catch {}
    return map;
  });

  constructor() {
    const route = inject(ActivatedRoute);
    route.paramMap.subscribe(async m => {
      const groupSlug = m.get('groupSlug');
      const success = await this.groupService.loadGroupData(groupSlug);
      this.accessDenied.set(!success);
    });
  }

  async sendInvites() {
    await this.groupService.sendInvites();
  }

  async resend(id: string) {
    await this.groupService.resendInvite(id);
  }

  async revoke(id: string) {
    await this.groupService.revokeInvite(id);
  }

  async acceptInvite(id: string) {
    await this.groupService.acceptInvite(id);
  }

  async rejectInvite(id: string) {
    await this.groupService.rejectInvite(id);
  }

  async acceptToken() {
    await this.groupService.acceptInviteByToken(this.acceptTokenValue());
    this.acceptTokenValue.set('');
    this.accessDenied.set(false);
  }
}
