import { Component, computed, inject } from '@angular/core';
import { BudgetStore } from './application/budget.store';
import { Participant } from './domain/models';
import { AuthService } from './infrastructure/auth.service';
import { NotificationService } from './infrastructure/notification.service';
import { UiService } from './infrastructure/ui.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly store = inject(BudgetStore);
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  private readonly notify = inject(NotificationService);

  readonly participantCount = this.store.participantCount;
  readonly totalIncome = this.store.totalIncome;
  readonly totalTransactions = this.store.totalTransactions;
  readonly participants = this.store.participants;
  readonly transactionsWithAllocations = this.store.transactionsWithAllocations;
  readonly totalsPerParticipant = this.store.totalsPerParticipant;
  readonly participantShares = this.store.participantShares;

  // Is user authenticated and allowed to mutate?
  // Mutations for participants guarded by admin; transactions by authenticated user
  readonly isConfigured = computed(() => this.auth.isConfigured());
  readonly canMutateTransactions = computed(() => !this.auth.isConfigured() || this.auth.isAuthenticated());
  readonly canMutateParticipants = computed(() => !this.auth.isConfigured() || this.auth.isAdmin());

  newName = '';
  newTotal: number | null = null;
  newParticipantName = '';
  newParticipantIncome: number | null = null;

  private pendingTransactionNames = new Map<string, string>();
  private pendingTransactionTotals = new Map<string, number>();
  private pendingParticipantNames = new Map<string, string>();
  private pendingParticipantIncomes = new Map<string, number>();

  constructor() {
    this.auth.load();
    this.store.load(); // Call store.load() after auth.load()
  }

  isValid(v: string | number | null): boolean {
    if (v === null) return false;
    const num = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(num) && num >= 0;
  }
  toNumber(value: string | number | null): number {
    if (value === null) return 0;
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  }

  transactionNameValue(id: string, current: string) { return this.pendingTransactionNames.get(id) ?? current; }
  onTransactionNameInput(id: string, v: EventTarget | null) { this.pendingTransactionNames.set(id, String((v as HTMLInputElement).value)); }
  transactionTotalValue(id: string, current: number) { return this.pendingTransactionTotals.get(id) ?? current; }
  onTransactionTotalInput(id: string, v: EventTarget | null) { this.pendingTransactionTotals.set(id, this.toNumber((v as HTMLInputElement).value)); }
  isTransactionDirty(id: string, currentName: string, currentTotal: number) {
    const nameDirty = this.pendingTransactionNames.has(id) && this.pendingTransactionNames.get(id) !== currentName;
    const totalDirty = this.pendingTransactionTotals.has(id) && this.pendingTransactionTotals.get(id) !== currentTotal;
    return nameDirty || totalDirty;
  }
  async saveTransaction(id: string, currentName: string, currentTotal: number) {
    const patch: { name?: string; total?: number } = {};
    if (this.pendingTransactionNames.has(id) && this.pendingTransactionNames.get(id) !== currentName) patch.name = this.pendingTransactionNames.get(id);
    if (this.pendingTransactionTotals.has(id) && this.pendingTransactionTotals.get(id) !== currentTotal) patch.total = this.pendingTransactionTotals.get(id);
    if (Object.keys(patch).length === 0) return;
    this.ui.showLoading();
    try { await this.store.updateTransaction(id, patch); this.notify.success('Transaction saved'); }
    catch { this.notify.error('Failed to save transaction'); }
    finally { this.ui.hideLoading(); this.pendingTransactionNames.delete(id); this.pendingTransactionTotals.delete(id); }
  }

  participantNameValue(id: string, current: string) { return this.pendingParticipantNames.get(id) ?? current; }
  onParticipantNameInput(id: string, v: EventTarget | null) { this.pendingParticipantNames.set(id, String((v as HTMLInputElement).value)); }
  participantIncomeValue(id: string, current: number) { return this.pendingParticipantIncomes.get(id) ?? current; }
  onParticipantIncomeInput(id: string, v: EventTarget | null) { this.pendingParticipantIncomes.set(id, this.toNumber((v as HTMLInputElement).value)); }
  isParticipantDirty(id: string, currentName: string, currentIncome: number) {
    const nameDirty = this.pendingParticipantNames.has(id) && this.pendingParticipantNames.get(id) !== currentName;
    const incomeDirty = this.pendingParticipantIncomes.has(id) && this.pendingParticipantIncomes.get(id) !== currentIncome;
    return nameDirty || incomeDirty;
  }
  async saveParticipant(p: Participant) {
    const patch: { name?: string; income?: number } = {};
    if (this.pendingParticipantNames.has(p.id) && this.pendingParticipantNames.get(p.id) !== p.name) patch.name = this.pendingParticipantNames.get(p.id);
    if (this.pendingParticipantIncomes.has(p.id) && this.pendingParticipantIncomes.get(p.id) !== p.income) patch.income = this.pendingParticipantIncomes.get(p.id);
    if (Object.keys(patch).length === 0) return;
    this.ui.showLoading();
    try {
      if (patch.name) await this.store.setParticipantName(p.id, patch.name);
      if (patch.income) await this.store.setParticipantIncome(p.id, patch.income);
      this.notify.success('Participant saved');
    }
    catch { this.notify.error('Failed to save participant'); }
    finally { this.ui.hideLoading(); this.pendingParticipantNames.delete(p.id); this.pendingParticipantIncomes.delete(p.id); }
  }

  async addFromForm() {
    if (!this.newName || !this.isValid(this.newTotal)) return;
    this.ui.showLoading();
    try {
      await this.store.addTransaction(this.newName, this.newTotal!);
      this.notify.success('Transaction added');
    } catch (e) {
      this.notify.error((e as Error).message || 'Failed to add transaction');
    }
    finally { this.ui.hideLoading(); this.newName = ''; this.newTotal = null; }
  }

  async addParticipantFromForm() {
    if (!this.newParticipantName || !this.isValid(this.newParticipantIncome)) return;
    this.ui.showLoading();
    try {
      await this.store.addParticipant(this.newParticipantName, this.newParticipantIncome!);
      this.notify.success('Participant added');
    } catch (e) {
      this.notify.error((e as Error).message || 'Failed to add participant');
    }
    finally { this.ui.hideLoading(); this.newParticipantName = ''; this.newParticipantIncome = null; }
  }

  async onTransactionNameCommit(id: string, value: EventTarget | null) {
    if (!this.canMutateTransactions()) return;
    const current = this.store.transactions().find(t => t.id === id)?.name ?? '';
    if (current === String((value as HTMLInputElement).value)) return;
    this.ui.showLoading();
    try { await this.store.updateTransaction(id, { name: String((value as HTMLInputElement).value) }); this.notify.success('Transaction updated'); }
    catch { this.notify.error('Failed to update transaction'); }
    finally { this.ui.hideLoading(); }
  }

  async onTransactionTotalCommit(id: string, value: EventTarget | null) {
    if (!this.canMutateTransactions()) return;
    const current = this.store.transactions().find(t => t.id === id)?.total ?? 0;
    const next = this.toNumber((value as HTMLInputElement).value);
    if (current === next) return;
    this.ui.showLoading();
    try { await this.store.updateTransaction(id, { total: next }); this.notify.success('Transaction updated'); }
    catch { this.notify.error('Failed to update transaction'); }
    finally { this.ui.hideLoading(); }
  }

  async onParticipantNameCommit(id: string, value: EventTarget | null) {
    if (!this.canMutateParticipants()) return;
    const current = this.store.participants().find(p => p.id === id)?.name ?? '';
    if (current === String((value as HTMLInputElement).value)) return;
    this.ui.showLoading();
    try { await this.store.setParticipantName(id, String((value as HTMLInputElement).value)); this.notify.success('Participant updated'); }
    catch { this.notify.error('Failed to update participant'); }
    finally { this.ui.hideLoading(); }
  }

  async onParticipantIncomeCommit(id: string, value: EventTarget | null) {
    if (!this.canMutateParticipants()) return;
    const current = this.store.participants().find(p => p.id === id)?.income ?? 0;
    const next = this.toNumber((value as HTMLInputElement).value);
    if (current === next) return;
    this.ui.showLoading();
    try { await this.store.setParticipantIncome(id, next); this.notify.success('Participant updated'); }
    catch { this.notify.error('Failed to update participant'); }
    finally { this.ui.hideLoading(); }
  }

  async removeTransactionAction(id: string) {
    if (!this.canMutateTransactions()) return;
    this.ui.showLoading();
    try { await this.store.removeTransaction(id); this.notify.success('Transaction removed'); }
    catch { this.notify.error('Failed to remove transaction'); }
    finally { this.ui.hideLoading(); }
  }

  async removeParticipantAction(id: string) {
    if (!this.canMutateParticipants()) return;
    this.ui.showLoading();
    try { await this.store.removeParticipant(id); this.notify.success('Participant removed'); }
    catch { this.notify.error('Failed to remove participant'); }
    finally { this.ui.hideLoading(); }
  }
}