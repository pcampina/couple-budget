import { Injectable, computed, signal } from '@angular/core';
import { Expense, Participant, ParticipantId, AllocationByParticipant } from '../domain/models';
import { splitByIncome } from '../domain/services/split.service';
import { ApiService } from '../infrastructure/api.service';
import { uuid } from '../shared/uuid';


@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly _participants = signal<Participant[]>([
    { id: uuid(), name: 'John Doe', income: 2000 },
    { id: uuid(), name: 'Jane Doe', income: 1600 },
  ]);
  readonly participants = computed(() => this._participants());
  readonly participantCount = computed(() => this._participants().length);

  readonly totalIncome = computed(() => this._participants().reduce((acc, p) => acc + (p.income || 0), 0));
  readonly participantShares = computed(() => {
    const total = this.totalIncome();
    return this._participants().map(p => ({ id: p.id, name: p.name, share: total > 0 ? p.income / total : 0 }));
  });

  private readonly _expenses = signal<Expense[]>([
    { id: uuid(), name: 'Aluguel', total: 1200 }
  ]);
  readonly expenses = computed(() => this._expenses());

  readonly expensesWithAllocations = computed(() =>
    this._expenses().map(e => {
      const allocations = splitByIncome(e.total, this._participants());
      return { ...e, allocations } as Expense & { allocations: AllocationByParticipant };
    })
  );

  readonly totalExpenses = computed(() => this._expenses().reduce((acc, e) => acc + (e.total || 0), 0));
  readonly totalsPerParticipant = computed(() => {
    const totals: AllocationByParticipant = Object.fromEntries(this._participants().map(p => [p.id, 0]));
    for (const e of this.expensesWithAllocations()) {
      for (const pid of Object.keys(e.allocations)) {
        totals[pid] = (totals[pid] || 0) + e.allocations[pid];
      }
    }
    return totals;
  });

  private readonly useApi = typeof window !== 'undefined' && (window as any).__USE_API__ === true;

  private async refreshFromApi() {
    // no-op if not using API or service not provided
    try {
      if (!this.api || !this.useApi) return;
      const stats = await this.api.getStats();
      this._participants.set(stats.participants.map(p => ({ id: p.id, name: p.name, income: p.income })));
      this._expenses.set(stats.expenses.map(e => ({ id: e.id, name: e.name, total: e.total })));
    } catch {}
  }

  setParticipantIncome(id: ParticipantId, income: number) {
    if (this.api && this.useApi) {
      this.api.updateParticipant(id, { income: Math.max(0, income || 0) })
        .then(() => this.refreshFromApi())
        .catch(() => {});
      return;
    }
    this._participants.update(list => list.map(p => p.id === id ? { ...p, income: Math.max(0, income || 0) } : p));
  }

  setParticipantName(id: ParticipantId, name: string) {
    if (this.api && this.useApi) {
      this.api.updateParticipant(id, { name: name.trim() })
        .then(() => this.refreshFromApi())
        .catch(() => {});
      return;
    }
    this._participants.update(list => list.map(p => p.id === id ? { ...p, name: name.trim() } : p));
  }

  addParticipant(name = `Pessoa ${this._participants().length + 1}`, income = 0) {
    if (this.api && this.useApi) {
      this.api.addParticipant(name.trim(), Math.max(0, income || 0))
        .then(() => this.refreshFromApi())
        .catch(() => {});
      return;
    }
    const p: Participant = { id: uuid(), name: name.trim(), income: Math.max(0, income || 0) };
    this._participants.update(list => [...list, p]);
  }

  removeParticipant(id: ParticipantId) {
    if (this.api && this.useApi) {
      this.api.deleteParticipant(id)
        .then(() => this.refreshFromApi())
        .catch(() => {});
      return;
    }
    this._participants.update(list => list.length <= 2 ? list : list.filter(p => p.id !== id));
  }

  addExpense(name: string, total: number) {
    if (this.api && this.useApi) {
      this.api.addExpense(name.trim(), Math.max(0, total || 0))
        .then(() => this.refreshFromApi())
        .catch(() => {});
      return;
    }
    const e: Expense = { id: uuid(), name: name.trim(), total: Math.max(0, total || 0) };
    this._expenses.update(list => [...list, e]);
  }

  updateExpense(id: string, patch: Partial<Expense>) {
    if (this.api && this.useApi) {
      this.api.updateExpense(id, patch)
        .then(() => this.refreshFromApi())
        .catch(() => {});
      return;
    }
    this._expenses.update(list => {
      const i = list.findIndex(e => e.id === id);
      if (i >= 0) {
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
    if (this.api && this.useApi) {
      this.api.deleteExpense(id)
        .then(() => this.refreshFromApi())
        .catch(() => {});
      return;
    }
    this._expenses.update(list => list.filter(e => e.id !== id));
  }

  // Initialize (no localStorage persistence)
  constructor(private api?: ApiService) {
    if (this.api && this.useApi) {
      this.refreshFromApi();
    }
  }
}
