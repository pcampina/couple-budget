import { Component, ViewEncapsulation, inject, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { BudgetStore } from '@application/budget.store';
import { ApiService } from '@app/infrastructure/api.service';
import { AuthService } from '@app/infrastructure/auth.service';
import { UiService } from '../../../infrastructure/ui.service';
import { NotificationService } from '../../../infrastructure/notification.service';
import { ErrorService } from '../../../infrastructure/error.service';
import { GroupService } from '@app/infrastructure/group.service';
import { slugify } from '../../../shared/utils';
import { GroupsHeaderComponent } from '../../groups/components/groups-header/groups-header.component';
import { Expense } from '@app/domain/models';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, CurrencyPipe, DecimalPipe, GroupsHeaderComponent],
  templateUrl: './expenses-page.component.html'
})
export class ExpensesPageComponent {
  readonly store = inject(BudgetStore);
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  readonly notify = inject(NotificationService);
  readonly errors = inject(ErrorService);
  readonly groupService = inject(GroupService);
  private readonly api = inject(ApiService);

  readonly usingApi = typeof window !== 'undefined' && (((window as any).__USE_API__ === true) || String((window as any).__USE_API__).toLowerCase() === 'true');
  readonly canMutateExpenses = computed(() => !this.auth.isConfigured() || this.auth.isAuthenticated());

  newName = '';
  newTotal: number | null = null;
  newType: string = '';

  types = signal<{ code: string; name: string }[]>([]);
  readonly typeMap = computed(() => {
    const map: Record<string, string> = {};
    for (const t of this.types()) map[t.code] = t.name;
    return map;
  });

  private draftExpenses = signal<Map<string, Partial<Expense>>>(new Map());

  constructor() {
    // Load transaction types
    if (this.usingApi) {
      this.api.listTransactionTypes().then(list => { this.types.set(list); this.newType = list.find(t => /expense/i.test(t.name))?.code || list[0]?.code || ''; }).catch(() => this.types.set([
        { code: 'expense', name: 'Expense' },
        { code: 'income', name: 'Income' },
        { code: 'transfer', name: 'Transfer' },
      ]));
    } else {
      const defaults = [
        { code: 'expense', name: 'Expense' },
        { code: 'income', name: 'Income' },
        { code: 'transfer', name: 'Transfer' },
      ];
      this.types.set(defaults);
      this.newType = defaults[0].code;
    }
    // Watch route param :groupId to scope the store
    try {
      const route = inject(ActivatedRoute);
      route.paramMap.subscribe(async m => {
        const slug = m.get('groupSlug');
        await this.groupService.loadGroups();
        if (slug) {
            const group = this.groupService.groups().find(g => slugify(g.name) === slug);
            this.store.setGroupId(group?.id || null);
            if (this.usingApi && group) {
                await this.store.refreshFromApi(true);
            }
        } else {
            this.store.setGroupId(null);
        }
      });
    } catch {}
  }

  isValid(v: any) {
    // Garante que o valor do input seja convertido para número antes de validar
    const num = typeof v === 'number' ? v : (v === '' ? NaN : parseFloat(v));
    return isFinite(num) && num >= 0;
  }
  toNumber(value: any): number { return typeof value === 'number' ? value : parseFloat(value) || 0; }

  txTypeLabel(e: { type?: string; type_code?: string }): string {
    const codeOrName = String((e?.type_code ?? e?.type ?? '') || '');
    const name = this.typeMap()[codeOrName];
    if (name) return name;
    // If it doesn't look like a UUID, treat it as a human label
    if (codeOrName && !/^[0-9a-fA-F-]{36}$/.test(codeOrName)) return codeOrName.charAt(0).toUpperCase() + codeOrName.slice(1);
    // Fallback to the first known type name or 'Expense'
    return this.types()[0]?.name || 'Expense';
  }

  gridTemplateColumns(): string {
    const participantCols = Array(this.store.participants().length).fill('1.2fr').join(' ');
    return `2fr 1fr 1.2fr 0.8fr ${participantCols} 88px`;
  }

  // dirty helpers
  onExpenseInput<K extends keyof Expense>(id: string, field: K, value: Expense[K]) {
    this.draftExpenses.update(drafts => {
      const newDrafts = new Map(drafts);
      const draft = newDrafts.get(id) || {};
      draft[field] = value;
      newDrafts.set(id, draft);
      return newDrafts;
    });
  }

  getDraftValue<K extends keyof Expense>(id: string, field: K, currentValue: Expense[K]): Expense[K] {
    return this.draftExpenses().get(id)?.[field] ?? currentValue;
  }

  isExpenseDirty(id: string): boolean {
    return this.draftExpenses().has(id);
  }

  async saveExpense(id: string) {
    const patch = this.draftExpenses().get(id);
    if (!patch) {
      this.notify.info('No changes to save');
      return;
    }
    this.ui.showLoading();
    try {
      await this.store.updateExpense(id, patch);
      this.notify.success('Expense saved');
      this.draftExpenses.update(drafts => {
        const newDrafts = new Map(drafts);
        newDrafts.delete(id);
        return newDrafts;
      });
    }
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to save expense', showToast: true, context: 'saveExpense' }); }
    finally { this.ui.hideLoading(); }
  }

  async addFromForm() {
    if (!this.newName || !this.isValid(this.newTotal)) return;
    this.ui.showLoading();
    try {
      await this.store.addExpense(this.newName, this.newTotal!, this.newType);
      this.notify.success('Expense added');
    } catch (e) { this.errors.handle(e, { userMessage: 'Failed to add expense', showToast: true, context: 'addExpense' }); }
    finally { this.ui.hideLoading(); this.newName = ''; this.newTotal = null; }
  }

  async removeExpenseAction(id: string) {
    this.ui.showLoading();
    try { await this.store.removeExpense(id); this.notify.success('Expense removed'); }
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to remove expense', showToast: true, context: 'removeExpense' }); }
    finally { this.ui.hideLoading(); }
  }

  async togglePaid(id: string, paid: boolean) {
    this.ui.showLoading();
    try { await this.store.updateExpense(id, { paid }); this.notify.success('Updated'); }
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to update', showToast: true, context: 'togglePaid' }); }
    finally { this.ui.hideLoading(); }
  }
}