import { Component, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetStore } from './application/budget.store';
import { AuthService } from './infrastructure/auth.service';

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
  readonly usingApi = typeof window !== 'undefined' && (window as any).__USE_API__ === true;
  readonly isAdmin = computed(() => this.auth.role() === 'admin');

  newName = '';
  newTotal: number | null = null;
  email = '';
  password = '';

  // theme: 'light' | 'dark'
  theme = signal<'light' | 'dark'>('light');

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
