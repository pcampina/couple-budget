import { Injectable, computed, signal } from '@angular/core';
import { Expense, Participant, ParticipantId, AllocationByParticipant } from '../domain/models';
import { splitByIncome } from '../domain/services/split.service';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly _participants = signal<Participant[]>([
    { id: uid(), name: 'Pablo', income: 2000 },
    { id: uid(), name: 'Tamires', income: 1600 },
  ]);
  readonly participants = computed(() => this._participants());
  readonly participantCount = computed(() => this._participants().length);

  readonly totalIncome = computed(() => this._participants().reduce((acc, p) => acc + (p.income || 0), 0));
  readonly participantShares = computed(() => {
    const total = this.totalIncome();
    return this._participants().map(p => ({ id: p.id, name: p.name, share: total > 0 ? p.income / total : 0 }));
  });

  private readonly _expenses = signal<Expense[]>([
    { id: uid(), name: 'Aluguel', total: 1200 }
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

  setParticipantIncome(id: ParticipantId, income: number) {
    this._participants.update(list => list.map(p => p.id === id ? { ...p, income: Math.max(0, income || 0) } : p));
  }

  setParticipantName(id: ParticipantId, name: string) {
    this._participants.update(list => list.map(p => p.id === id ? { ...p, name: name.trim() } : p));
  }

  addParticipant(name = `Pessoa ${this._participants().length + 1}`, income = 0) {
    const p: Participant = { id: uid(), name: name.trim(), income: Math.max(0, income || 0) };
    this._participants.update(list => [...list, p]);
  }

  removeParticipant(id: ParticipantId) {
    this._participants.update(list => list.length <= 2 ? list : list.filter(p => p.id !== id));
  }

  addExpense(name: string, total: number) {
    const e: Expense = { id: uid(), name: name.trim(), total: Math.max(0, total || 0) };
    this._expenses.update(list => [...list, e]);
  }

  updateExpense(id: string, patch: Partial<Expense>) {
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
    this._expenses.update(list => list.filter(e => e.id !== id));
  }

  // constructor intentionally empty (persistence added in a later commit)
  constructor() {}
}
