import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetStore } from '../../application/budget.store';
import { AuthService } from '../../infrastructure/auth.service';
import { UiService } from '../../infrastructure/ui.service';
import { NotificationService } from '../../infrastructure/notification.service';
import { ErrorService } from '../../infrastructure/error.service';
import { ApiService } from '../../infrastructure/api.service';

@Component({
  selector: 'app-config-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule],
  templateUrl: './config-page.component.html',
})
export class ConfigPageComponent {
  readonly store = inject(BudgetStore);
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  readonly notify = inject(NotificationService);
  readonly errors = inject(ErrorService);
  readonly api = inject(ApiService);
  // Component focuses solely on self profile editing (dumb UI)

  // Logged-in user profile editing (prefilled when authenticated)
  meName: string | null = null;
  meEmail: string | null = null;
  meIncome: number | null = null;

  meParticipant() {
    const email = String((this.auth.user() as any)?.email || '').toLowerCase();
    if (!email) return null as any;
    return this.store.participants().find(p => (p as any).email && (p as any).email.toLowerCase() === email) || null;
  }
  meNameValue() {
    const me = this.meParticipant();
    const u = this.auth.user() as any;
    const fallback = (u?.email ? String(u.email).split('@')[0] : '') || '';
    return this.meName ?? (me?.name ?? fallback);
  }
  meEmailValue() {
    const me = this.meParticipant();
    const u = this.auth.user() as any;
    return this.meEmail ?? (me?.email ?? (u?.email || ''));
  }
  meIncomeValue() { return this.meIncome ?? (this.meParticipant()?.income ?? 0); }
  onMeNameInput(v: any) { this.meName = String(v); }
  onMeEmailInput(v: any) { this.meEmail = String(v); }
  onMeIncomeInput(v: any) { this.meIncome = this.toNumber(v); }
  isMeDirty() {
    const me = this.meParticipant();
    // If profile doesn't exist yet, allow saving to create it
    if (!me) return true;
    const n = this.meName ?? me.name;
    const e = this.meEmail ?? (me as any).email ?? '';
    const i = this.meIncome ?? me.income;
    return (n !== me.name) || (e !== ((me as any).email ?? '')) || (i !== me.income);
  }
  async saveMe() {
    const me = this.meParticipant();
    const patch: any = {};
    if (me) {
      if (this.meName != null && this.meName !== me.name) patch.name = this.meName;
      if (this.meEmail != null && this.meEmail !== ((me as any).email ?? '')) patch.email = this.meEmail;
      if (this.meIncome != null && this.meIncome !== me.income) patch.income = this.meIncome;
      if (Object.keys(patch).length === 0) { this.notify.info('No changes to save'); return; }
    } else {
      // Creating first profile entry — send provided fields only
      if (this.meName != null) patch.name = this.meName;
      if (this.meEmail != null) patch.email = this.meEmail;
      if (this.meIncome != null) patch.income = this.meIncome;
    }
    this.ui.showLoading();
    try {
      // Use self endpoint to allow non-admin users to update their profile
      await this.api.updateSelfParticipant(patch);
      await this.store.refreshFromApi(true);
      this.notify.success('Profile updated');
      this.meName = this.meEmail = null; this.meIncome = null;
    } catch (e) {
      this.errors.handle(e, { userMessage: 'Failed to update profile', showToast: true, context: 'saveMe' });
    } finally { this.ui.hideLoading(); }
  }

  toNumber(value: any): number { return typeof value === 'number' ? value : parseFloat(value) || 0; }
}
