import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BudgetStore } from '../../application/budget.store';
import { ApiService } from '../../infrastructure/api.service';
import { AuthService } from '../../infrastructure/auth.service';
import { NotificationService } from '../../infrastructure/notification.service';
import { ErrorService } from '../../infrastructure/error.service';

@Component({
  selector: 'app-group-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [DecimalPipe],
  templateUrl: './group-page.component.html',
  styleUrls: ['./group-page.component.scss']
})
export class GroupPageComponent {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly notify = inject(NotificationService);
  readonly errors = inject(ErrorService);
  readonly store = inject(BudgetStore);
  members = signal<{ id: string; name: string; email: string | null; accepted: boolean }[]>([]);

  // Map participant id -> share (0..1) based on current income distribution
  readonly shareById = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    try {
      for (const s of this.store.participantShares()) map[s.id] = s.share || 0;
    } catch {}
    return map;
  });

  constructor() {
    this.load();
  }

  async load() {
    try {
      // Ensure store has the latest participants for share calculation
      await this.store.refreshFromApi(true);
      const list = await this.api.listGroupMembers();
      this.members.set(list);
    } catch (e) { this.errors.handle(e, { userMessage: 'Failed to load group', showToast: true, context: 'group.load' }); }
  }
}
