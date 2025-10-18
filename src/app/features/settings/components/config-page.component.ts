import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetStore } from '@application/budget.store';
import { AuthService } from '@app/infrastructure/auth.service';
import { UiService } from '@app/infrastructure/ui.service';
import { NotificationService } from '@app/infrastructure/notification.service';
import { ErrorService } from '@app/infrastructure/error.service';
import { ApiService } from '@app/infrastructure/api.service';
import { NgpInput } from 'ng-primitives/input';
import { NgpLabel } from 'ng-primitives/form-field';
import { NgpButton } from 'ng-primitives/button';

interface FormState {
  name: string;
  email: string;
  income: number;
}

@Component({
  selector: 'app-config-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgpInput, NgpButton],
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.scss']
})
export class ConfigPageComponent {
  private readonly store = inject(BudgetStore);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly notify = inject(NotificationService);
  private readonly errors = inject(ErrorService);
  private readonly api = inject(ApiService);

  private readonly originalState = signal<FormState | null>(null);
  readonly formState = signal<FormState>({ name: '', email: '', income: 0 });

  readonly isDirty = computed(() => {
    const original = this.originalState();
    if (!original) {
      const current = this.formState();
      return !!current.name || !!current.email || current.income > 0;
    }
    return JSON.stringify(original) !== JSON.stringify(this.formState());
  });

  constructor() {
    this.store.refreshFromApi(true);
    this.initializeFormState();
  }

  private async initializeFormState(): Promise<void> {
    const user = this.auth.user();
    const userEmail = user?.email?.toLowerCase() || '';

    await new Promise(resolve => setTimeout(resolve, 100));

    const participant = this.store.participants().find(p => p.email?.toLowerCase() === userEmail);

    let initialState: FormState;

    if (participant) {
      initialState = {
        name: participant.name,
        email: participant.email || '',
        income: participant.income,
      };
    } else {
      const profile = await this.api.getUsersMe();
      initialState = {
        name: userEmail.split('@')[0] || '',
        email: userEmail,
        income: profile.default_income || 0,
      };
    }

    this.formState.set(initialState);
    this.originalState.set(JSON.parse(JSON.stringify(initialState)));
  }

  async saveProfile(): Promise<void> {
    if (!this.isDirty()) {
      this.notify.info('No changes to save.');
      return;
    }

    this.ui.showLoading();
    try {
      const original = this.originalState();
      const current = this.formState();
      const patch: Partial<FormState> = {};

      if (current.name !== original?.name) patch.name = current.name;
      if (current.email !== original?.email) patch.email = current.email;
      if (current.income !== original?.income) patch.income = current.income;

      const promises = [];
      if (patch.income != null) {
        promises.push(this.api.updateUser({ default_income: patch.income }));
      }

      const groupId = (this.store as any).groupId ? (this.store as any).groupId() : null;
      promises.push(this.api.updateSelfParticipant(patch, groupId));

      await Promise.all(promises);
      await this.store.refreshFromApi(true);

      this.notify.success('Profile updated successfully.');
      this.originalState.set(JSON.parse(JSON.stringify(current)));
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to update profile.', showToast: true, context: 'saveProfile' });
    } finally {
      this.ui.hideLoading();
    }
  }
}
