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
import { Transaction, TransactionType } from '@app/domain/models';
import { TransactionTypeCode } from '@app/domain/enums';

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [FormsModule, CurrencyPipe, DecimalPipe, GroupsHeaderComponent],
  templateUrl: './transactions-page.component.html'
})
export class TransactionsPageComponent {
  readonly store = inject(BudgetStore);
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  readonly notify = inject(NotificationService);
  readonly errors = inject(ErrorService);
  readonly groupService = inject(GroupService);
  private readonly api = inject(ApiService);

  readonly usingApi = typeof window !== 'undefined' && (((window as any).__USE_API__ === true) || String((window as any).__USE_API__).toLowerCase() === 'true');
  readonly canMutateTransactions = computed(() => !this.auth.isConfigured() || this.auth.isAuthenticated());

  newName = '';
  newTotal: number | null = null;
  newType: TransactionTypeCode = TransactionTypeCode.Expense;

  types = signal<TransactionType[]>([]);
  readonly typeMap = computed(() => {
    const map: Record<string, string> = {};
    for (const t of this.types()) map[t.code] = t.name;
    return map;
  });

  private draftTransactions = signal<Map<string, Partial<Transaction>>>(new Map());

  constructor() {
    // Load transaction types
    if (this.usingApi) {
      this.api.listTransactionTypes().then(list => {
        this.types.set(list);
        this.newType = list.find(t => /expense/i.test(t.name))?.code as TransactionTypeCode || list[0]?.code as TransactionTypeCode || TransactionTypeCode.Expense;
      }).catch(() => this.types.set([
        { code: TransactionTypeCode.Expense, name: 'Expense' },
        { code: TransactionTypeCode.Income, name: 'Income' },
        { code: TransactionTypeCode.Transfer, name: 'Transfer' },
      ]));
    } else {
      const defaults: TransactionType[] = [
        { code: TransactionTypeCode.Expense, name: 'Expense' },
        { code: TransactionTypeCode.Income, name: 'Income' },
        { code: TransactionTypeCode.Transfer, name: 'Transfer' },
      ];
      this.types.set(defaults);
      this.newType = defaults[0].code as TransactionTypeCode;
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

  isValid(v: string | number | null): boolean {
    if (v === null || v === '') return false;
    const num = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(num) && num >= 0;
  }
  toNumber(value: string | number | null): number {
    if (value === null || value === '') return 0;
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  }

  txTypeLabel(transaction: Transaction): string {
    const codeOrName = transaction.type_code;
    if (!codeOrName) return 'Expense';

    const name = this.typeMap()[codeOrName];
    if (name) return name;
    
    if (codeOrName && !/^[0-9a-fA-F-]{36}$/.test(codeOrName)) return codeOrName.charAt(0).toUpperCase() + codeOrName.slice(1);
    
    return this.types()[0]?.name || 'Expense';
  }

  gridTemplateColumns(): string {
    const participantCols = Array(this.store.participants().length).fill('1.2fr').join(' ');
    return `2fr 1fr 1.2fr 0.8fr ${participantCols} 88px`;
  }

  // dirty helpers
  onTransactionInput<K extends keyof Transaction>(id: string, field: K, value: Transaction[K]) {
    this.draftTransactions.update(drafts => {
      const newDrafts = new Map(drafts);
      const draft = newDrafts.get(id) || {};
      draft[field] = value;
      newDrafts.set(id, draft);
      return newDrafts;
    });
  }

  getDraftValue<K extends keyof Transaction>(id: string, field: K, currentValue: Transaction[K]): Transaction[K] {
    return this.draftTransactions().get(id)?.[field] ?? currentValue;
  }

  isTransactionDirty(id: string): boolean {
    return this.draftTransactions().has(id);
  }

  async saveTransaction(id: string) {
    const patch = this.draftTransactions().get(id);
    if (!patch) {
      this.notify.info('No changes to save');
      return;
    }
    this.ui.showLoading();
    try {
      await this.store.updateTransaction(id, patch);
      this.notify.success('Transaction saved');
      this.draftTransactions.update(drafts => {
        const newDrafts = new Map(drafts);
        newDrafts.delete(id);
        return newDrafts;
      });
    }
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to save transaction', showToast: true, context: 'saveTransaction' }); }
    finally { this.ui.hideLoading(); }
  }

  async addFromForm() {
    if (!this.newName || !this.isValid(this.newTotal)) return;
    this.ui.showLoading();
    try {
      await this.store.addTransaction(this.newName, this.newTotal!, this.newType);
      this.notify.success('Transaction added');
    } catch (e) { this.errors.handle(e, { userMessage: 'Failed to add transaction', showToast: true, context: 'addTransaction' }); }
    finally { this.ui.hideLoading(); this.newName = ''; this.newTotal = null; }
  }

  async removeTransactionAction(id: string) {
    this.ui.showLoading();
    try { await this.store.removeTransaction(id); this.notify.success('Transaction removed'); }
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to remove transaction', showToast: true, context: 'removeTransaction' }); }
    finally { this.ui.hideLoading(); }
  }

  async togglePaid(id: string, paid: boolean) {
    this.ui.showLoading();
    try { await this.store.updateTransaction(id, { paid }); this.notify.success('Updated'); }
    catch (e) { this.errors.handle(e, { userMessage: 'Failed to update', showToast: true, context: 'togglePaid' }); }
    finally { this.ui.hideLoading(); }
  }
}