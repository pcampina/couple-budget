import { Injectable, computed, signal } from '@angular/core';
import { Expense } from '../domain/models';
import { splitByIncome } from '../domain/services/split.service';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

@Injectable({ providedIn: 'root' })
export class BudgetStore {
  readonly salary1 = signal<number>(2000);
  readonly salary2 = signal<number>(1600);

  readonly totalIncome = computed(() => this.salary1() + this.salary2());
  readonly p1Share = computed(() => (this.totalIncome() > 0 ? this.salary1() / this.totalIncome() : 0));
  readonly p2Share = computed(() => (this.totalIncome() > 0 ? this.salary2() / this.totalIncome() : 0));

  private readonly _expenses = signal<Expense[]>([
    { id: uid(), name: 'Aluguel', total: 1200 }
  ]);
  readonly expenses = computed(() => this._expenses());

  readonly expensesWithSplits = computed(() =>
    this._expenses().map(e => {
      const { p1, p2 } = splitByIncome(e.total, this.salary1(), this.salary2());
      return { ...e, p1, p2 };
    })
  );

  readonly totalExpenses = computed(() => this._expenses().reduce((acc, e) => acc + (e.total || 0), 0));
  readonly totalP1 = computed(() => this.expensesWithSplits().reduce((a, e) => a + e.p1, 0));
  readonly totalP2 = computed(() => this.expensesWithSplits().reduce((a, e) => a + e.p2, 0));

  setSalary1(v: number) { this.salary1.set(Math.max(0, v || 0)); }
  setSalary2(v: number) { this.salary2.set(Math.max(0, v || 0)); }

  addExpense(name: string, total: number) {
    const e: Expense = { id: uid(), name: name.trim(), total: Math.max(0, total || 0) };
    this._expenses.update(list => [...list, e]);
  }

  updateExpense(id: string, patch: Partial<Expense>) {
    this._expenses.update(list => {
      const i = list.findIndex(e => e.id === id);
      if (i >= 0) {
        // Create a new array with the updated expense
        return [
          ...list.slice(0, i),
          { ...list[i], ...patch },
          ...list.slice(i + 1)
        ];
      }
      return list;
    });
  }

  removeExpense(id: string) {
    this._expenses.update(list => list.filter(e => e.id !== id));
  }
}
