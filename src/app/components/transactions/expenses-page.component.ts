import { Component, ViewEncapsulation, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { BudgetStore } from '../../application/budget.store';
import { ApiService } from '../../infrastructure/api.service';
import { AuthService } from '../../infrastructure/auth.service';
import { UiService } from '../../infrastructure/ui.service';
import { NotificationService } from '../../infrastructure/notification.service';
import { ErrorService } from '../../infrastructure/error.service';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './expenses-page.component.html'
})
export class ExpensesPageComponent {
  readonly store = inject(BudgetStore);
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  readonly notify = inject(NotificationService);
  readonly errors = inject(ErrorService);

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

  private pendingExpenseNames = new Map<string, string>();
  private pendingExpenseTotals = new Map<string, number>();

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
  }

  isValid(v: any) { return typeof v === 'number' && isFinite(v) && v >= 0; }
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
    return `2fr 1fr 1.2fr ${participantCols} 88px`;
  }

  // dirty helpers
  expenseNameValue(id: string, current: string) { return this.pendingExpenseNames.get(id) ?? current; }
  onExpenseNameInput(id: string, v: any) { this.pendingExpenseNames.set(id, String(v)); }
  expenseTotalValue(id: string, current: number) { return this.pendingExpenseTotals.get(id) ?? current; }
  onExpenseTotalInput(id: string, v: any) { this.pendingExpenseTotals.set(id, this.toNumber(v)); }
  isExpenseDirty(id: string, currentName: string, currentTotal: number) {
    const nameDirty = this.pendingExpenseNames.has(id) && this.pendingExpenseNames.get(id) !== currentName;
    const totalDirty = this.pendingExpenseTotals.has(id) && this.pendingExpenseTotals.get(id) !== currentTotal;
    return nameDirty || totalDirty;
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

  async saveExpense(id: string, currentName: string, currentTotal: number) {
    const patch: any = {};
    if (this.pendingExpenseNames.has(id) && this.pendingExpenseNames.get(id) !== currentName) patch.name = this.pendingExpenseNames.get(id);
    if (this.pendingExpenseTotals.has(id) && this.pendingExpenseTotals.get(id) !== currentTotal) patch.total = this.pendingExpenseTotals.get(id);
    if (Object.keys(patch).length === 0) { this.notify.info('No changes to save'); return; }
    this.ui.showLoading();
    try { await this.store.updateExpense(id, patch); this.notify.success('Expense saved'); }
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to save expense', showToast: true, context: 'saveExpense' }); }
    finally { this.ui.hideLoading(); this.pendingExpenseNames.delete(id); this.pendingExpenseTotals.delete(id); }
  }

  async removeExpenseAction(id: string) {
    this.ui.showLoading();
    try { await this.store.removeExpense(id); this.notify.success('Expense removed'); }
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to remove expense', showToast: true, context: 'removeExpense' }); }
    finally { this.ui.hideLoading(); }
  }
}
