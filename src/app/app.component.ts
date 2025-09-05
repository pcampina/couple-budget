import { Component, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetStore } from './application/budget.store';
import { AuthService } from './infrastructure/auth.service';
import { UiService } from './infrastructure/ui.service';

@Component({
  selector: 'app-main',
  imports: [FormsModule, CurrencyPipe, DecimalPipe],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly store = inject(BudgetStore);
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  readonly usingApi = typeof window !== 'undefined' && (window as any).__USE_API__ === true;
  readonly isAdmin = computed(() => this.auth.role() === 'admin');

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
    if (Object.keys(patch).length === 0) { this.ui.toast('No changes to save', 'info'); return; }
    this.ui.showLoading();
    try { await this.store.updateExpense(id, patch); this.ui.toast('Expense saved', 'success'); }
    catch { this.ui.toast('Failed to save expense', 'error'); }
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
    if (this.usingApi && !this.isAdmin()) return;
    const current = this.store.participants().find(p => p.id === id)?.name ?? '';
    if (String(value ?? '').trim() === current) { this.ui.toast('No changes to save', 'info'); return; }
    this.ui.showLoading();
    try { await this.store.setParticipantName(id, String(value)); this.ui.toast('Name updated', 'success'); }
    catch { this.ui.toast('Failed to update name', 'error'); }
    finally { this.ui.hideLoading(); }
  }

  async onIncomeCommit(id: string, value: any) {
    if (this.usingApi && !this.isAdmin()) return;
    const current = this.store.participants().find(p => p.id === id)?.income ?? 0;
    const next = this.toNumber(value);
    if (next === current) { this.ui.toast('No changes to save', 'info'); return; }
    this.ui.showLoading();
    try { await this.store.setParticipantIncome(id, next); this.ui.toast('Income updated', 'success'); }
    catch { this.ui.toast('Failed to update income', 'error'); }
    finally { this.ui.hideLoading(); }
  }

  async onExpenseNameCommit(id: string, value: any) {
    if (this.usingApi && !this.isAdmin()) return;
    const current = this.store.expenses().find(e => e.id === id)?.name ?? '';
    if (String(value ?? '').trim() === current) { this.ui.toast('No changes to save', 'info'); return; }
    this.ui.showLoading();
    try { await this.store.updateExpense(id, { name: String(value) }); this.ui.toast('Expense updated', 'success'); }
    catch { this.ui.toast('Failed to update expense', 'error'); }
    finally { this.ui.hideLoading(); }
  }

  async onExpenseTotalCommit(id: string, value: any) {
    if (this.usingApi && !this.isAdmin()) return;
    const current = this.store.expenses().find(e => e.id === id)?.total ?? 0;
    const next = this.toNumber(value);
    if (next === current) { this.ui.toast('No changes to save', 'info'); return; }
    this.ui.showLoading();
    try { await this.store.updateExpense(id, { total: next }); this.ui.toast('Expense updated', 'success'); }
    catch { this.ui.toast('Failed to update expense', 'error'); }
    finally { this.ui.hideLoading(); }
  }

  async addPerson() {
    if (this.usingApi && !this.isAdmin()) return;
    this.ui.showLoading();
    try { await this.store.addParticipant(); this.ui.toast('Person added', 'success'); }
    catch { this.ui.toast('Failed to add person', 'error'); }
    finally { this.ui.hideLoading(); }
  }

  async removePerson(id: string) {
    if (this.usingApi && !this.isAdmin()) return;
    this.ui.showLoading();
    try { await this.store.removeParticipant(id); this.ui.toast('Person removed', 'success'); }
    catch { this.ui.toast('Failed to remove person', 'error'); }
    finally { this.ui.hideLoading(); }
  }

  async removeExpenseAction(id: string) {
    if (this.usingApi && !this.isAdmin()) return;
    this.ui.showLoading();
    try { await this.store.removeExpense(id); this.ui.toast('Expense removed', 'success'); }
    catch { this.ui.toast('Failed to remove expense', 'error'); }
    finally { this.ui.hideLoading(); }
  }

  async login() {
    try {
      await this.auth.signInWithPassword(this.email, this.password);
      this.email = '';
      this.password = '';
    } catch (e) {
      console.error('Login failed', e);
    }
  }

  async logout() {
    await this.auth.signOut();
  }
}
