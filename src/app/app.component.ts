import { Component, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetStore } from './application/budget.store';
import { AuthService } from './infrastructure/auth.service';
import { UiService } from './infrastructure/ui.service';
import { NotificationService } from './infrastructure/notification.service';

@Component({
  selector: 'app-main',
  imports: [FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly store = inject(BudgetStore);
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  readonly notify = inject(NotificationService);
  readonly usingApi = typeof window !== 'undefined' && (((window as any).__USE_API__ === true) || String((window as any).__USE_API__).toLowerCase() === 'true');
  readonly isAdmin = computed(() => this.auth.role() === 'admin');
  // Mutations for participants guarded by admin; expenses by authenticated user
  readonly canMutate = computed(() => !this.auth.isConfigured() || this.isAdmin());
  readonly canMutateExpenses = computed(() => !this.auth.isConfigured() || this.auth.isAuthenticated());

  newName = '';
  newTotal: number | null = null;
  email = '';
  password = '';

  // theme: 'light' | 'dark'
  theme = signal<'light' | 'dark'>('light');

  // Pending edits for explicit save and dirty UI
  private pendingNames = new Map<string, string>();
  private pendingIncomes = new Map<string, number>();
  private pendingExpenseNames = new Map<string, string>();
  private pendingExpenseTotals = new Map<string, number>();

  nameValue(p: { id: string; name: string }) { return this.pendingNames.get(p.id) ?? p.name; }
  onNameInput(id: string, v: any) { this.pendingNames.set(id, String(v)); }
  isNameDirty(p: { id: string; name: string }) { return this.pendingNames.has(p.id) && this.pendingNames.get(p.id) !== p.name; }
  async saveName(id: string) { await this.onNameCommit(id, this.pendingNames.get(id)); this.pendingNames.delete(id); }

  incomeValue(p: { id: string; income: number }) { return this.pendingIncomes.get(p.id) ?? p.income; }
  onIncomeInput(id: string, v: any) { this.pendingIncomes.set(id, this.toNumber(v)); }
  isIncomeDirty(p: { id: string; income: number }) { return this.pendingIncomes.has(p.id) && this.pendingIncomes.get(p.id) !== p.income; }
  async saveIncome(id: string) { await this.onIncomeCommit(id, this.pendingIncomes.get(id)); this.pendingIncomes.delete(id); }

  expenseNameValue(id: string, current: string) { return this.pendingExpenseNames.get(id) ?? current; }
  onExpenseNameInput(id: string, v: any) { this.pendingExpenseNames.set(id, String(v)); }
  expenseTotalValue(id: string, current: number) { return this.pendingExpenseTotals.get(id) ?? current; }
  onExpenseTotalInput(id: string, v: any) { this.pendingExpenseTotals.set(id, this.toNumber(v)); }
  isExpenseDirty(id: string, currentName: string, currentTotal: number) {
    const nameDirty = this.pendingExpenseNames.has(id) && this.pendingExpenseNames.get(id) !== currentName;
    const totalDirty = this.pendingExpenseTotals.has(id) && this.pendingExpenseTotals.get(id) !== currentTotal;
    return nameDirty || totalDirty;
  }
  async saveExpense(id: string, currentName: string, currentTotal: number) {
    const patch: any = {};
    if (this.pendingExpenseNames.has(id) && this.pendingExpenseNames.get(id) !== currentName) patch.name = this.pendingExpenseNames.get(id);
    if (this.pendingExpenseTotals.has(id) && this.pendingExpenseTotals.get(id) !== currentTotal) patch.total = this.pendingExpenseTotals.get(id);
    if (Object.keys(patch).length === 0) { this.notify.info('No changes to save'); return; }
    this.ui.showLoading();
    try { await this.store.updateExpense(id, patch); this.notify.success('Expense saved'); }
    catch { this.notify.error('Failed to save expense'); }
    finally { this.ui.hideLoading(); this.pendingExpenseNames.delete(id); this.pendingExpenseTotals.delete(id); }
  }

  isValid(v: any) { return typeof v === 'number' && isFinite(v) && v >= 0; }

  toNumber(value: any): number {
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  }

  addFromForm() {
    if (!this.newName || !this.isValid(this.newTotal)) return;
    this.store.addExpense(this.newName, this.newTotal!);
    this.newName = '';
    this.newTotal = null;
  }

  gridTemplateColumns(): string {
    const participantCols = Array(this.store.participants().length).fill('1.2fr').join(' ');
    return `2fr 1.2fr ${participantCols} 88px`;
  }

  constructor() {
    // initialize theme (default: light)
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') as 'light' | 'dark' | null : null;
      const initial = saved === 'dark' || saved === 'light' ? saved : 'light';
      this.setTheme(initial);
    } catch {
      this.setTheme('light');
    }
  }

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  private setTheme(t: 'light' | 'dark') {
    this.theme.set(t);
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
      }
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', t);
    } catch {}
  }

  async onNameCommit(id: string, value: any) {
    if (this.usingApi && !this.canMutate()) return;
    const current = this.store.participants().find(p => p.id === id)?.name ?? '';
    if (String(value ?? '').trim() === current) { this.notify.info('No changes to save'); return; }
    this.ui.showLoading();
    try { await this.store.setParticipantName(id, String(value)); this.notify.success('Name updated'); }
    catch { this.notify.error('Failed to update name'); }
    finally { this.ui.hideLoading(); }
  }

  async onIncomeCommit(id: string, value: any) {
    if (this.usingApi && !this.canMutate()) return;
    const current = this.store.participants().find(p => p.id === id)?.income ?? 0;
    const next = this.toNumber(value);
    if (next === current) { this.notify.info('No changes to save'); return; }
    this.ui.showLoading();
    try { await this.store.setParticipantIncome(id, next); this.notify.success('Income updated'); }
    catch { this.notify.error('Failed to update income'); }
    finally { this.ui.hideLoading(); }
  }

  async onExpenseNameCommit(id: string, value: any) {
    if (this.usingApi && !this.canMutate()) return;
    const current = this.store.expenses().find(e => e.id === id)?.name ?? '';
    if (String(value ?? '').trim() === current) { this.notify.info('No changes to save'); return; }
    this.ui.showLoading();
    try { await this.store.updateExpense(id, { name: String(value) }); this.notify.success('Expense updated'); }
    catch { this.notify.error('Failed to update expense'); }
    finally { this.ui.hideLoading(); }
  }

  async onExpenseTotalCommit(id: string, value: any) {
    if (this.usingApi && !this.canMutate()) return;
    const current = this.store.expenses().find(e => e.id === id)?.total ?? 0;
    const next = this.toNumber(value);
    if (next === current) { this.notify.info('No changes to save'); return; }
    this.ui.showLoading();
    try { await this.store.updateExpense(id, { total: next }); this.notify.success('Expense updated'); }
    catch { this.notify.error('Failed to update expense'); }
    finally { this.ui.hideLoading(); }
  }

  async addPerson() {
    if (this.usingApi && !this.canMutate()) return;
    this.ui.showLoading();
    try { await this.store.addParticipant(); this.notify.success('Person added'); }
    catch { this.notify.error('Failed to add person'); }
    finally { this.ui.hideLoading(); }
  }

  async removePerson(id: string) {
    if (this.usingApi && !this.canMutate()) return;
    this.ui.showLoading();
    try { await this.store.removeParticipant(id); this.notify.success('Person removed'); }
    catch { this.notify.error('Failed to remove person'); }
    finally { this.ui.hideLoading(); }
  }

  async removeExpenseAction(id: string) {
    if (this.usingApi && !this.canMutate()) return;
    this.ui.showLoading();
    try { await this.store.removeExpense(id); this.notify.success('Expense removed'); }
    catch { this.notify.error('Failed to remove expense'); }
    finally { this.ui.hideLoading(); }
  }

  async login() {
    const email = String(this.email || '').trim();
    const password = String(this.password || '');
    if (!email || !password) { this.notify.error('Preencha o email e a palavra‑passe.'); return; }
    this.ui.showLoading();
    try {
      await this.auth.signIn(email, password);
      this.email = '';
      this.password = '';
      this.notify.success('Sessão iniciada.');
    } catch (e: any) {
      this.notify.error(e?.message || 'Não foi possível iniciar sessão.');
    } finally {
      this.ui.hideLoading();
    }
  }

  async logout() {
    await this.auth.signOut();
  }
}
