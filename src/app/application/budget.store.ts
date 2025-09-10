import { Injectable, computed, signal } from '@angular/core';
import { Expense, Participant, ParticipantId, AllocationByParticipant } from '../domain/models';
import { splitByIncome } from '../domain/services/split.service';
import { ApiService } from '../infrastructure/api.service';


@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly _groupId = signal<string | null>(null);
  readonly groupId = computed(() => this._groupId());
  private readonly _participants = signal<Participant[]>([]);
  readonly participants = computed(() => this._participants());
  readonly participantCount = computed(() => this._participants().length);

  readonly totalIncome = computed(() => this._participants().reduce((acc, p) => acc + (p.income || 0), 0));
  readonly participantShares = computed(() => {
    const total = this.totalIncome();
    return this._participants().map(p => ({ id: p.id, name: p.name, share: total > 0 ? p.income / total : 0 }));
  });

  private readonly _expenses = signal<Expense[]>([]);
  // When using API, prefer server-computed allocations and totals
  private readonly _apiExpensesWithAllocations = signal<(Expense & { allocations: AllocationByParticipant })[]>([]);
  private readonly _apiTotalsPerParticipant = signal<Record<string, number>>({});
  readonly expenses = computed(() => this._expenses());

  readonly expensesWithAllocations = computed(() => {
    if (this.useApi) return this._apiExpensesWithAllocations();
    return this._expenses().map(e => {
      const allocations = splitByIncome(e.total, this._participants());
      return { ...e, allocations } as Expense & { allocations: AllocationByParticipant };
    });
  });

  readonly totalExpenses = computed(() => this._expenses().reduce((acc, e) => acc + (e.total || 0), 0));
  readonly totalsPerParticipant = computed(() => {
    if (this.useApi) return this._apiTotalsPerParticipant();
    const totals: AllocationByParticipant = Object.fromEntries(this._participants().map(p => [p.id, 0]));
    for (const e of this.expensesWithAllocations()) {
      for (const pid of Object.keys(e.allocations)) {
        totals[pid] = (totals[pid] || 0) + e.allocations[pid];
      }
    }
    return totals;
  });

  private readonly useApi = typeof window !== 'undefined' && ((window as any).__USE_API__ === true || String((window as any).__USE_API__).toLowerCase() === 'true');

  async refreshFromApi(force = false) {
    // Attempt to hydrate from API when available. In early boot where __USE_API__
    // might be missing, callers can pass force=true to bypass the useApi gate.
    try {
      if (!this.api) return;
      if (!this.useApi && !force) return;
      const stats = await this.api.getStats(this._groupId() || undefined);
      this._participants.set(stats.participants.map(p => ({ id: p.id, name: p.name, email: (p as any).email ?? null, income: p.income })));
      this._expenses.set(stats.expenses.map(e => ({ id: e.id, name: e.name, total: e.total, type: (e as any).type_code || 'expense', paid: (e as any).paid ?? false })));
      this._apiExpensesWithAllocations.set((stats.expensesWithAllocations || []).map(e => ({ id: e.id, name: e.name, total: e.total, type: (e as any).type_code || 'expense', paid: (e as any).paid ?? false, allocations: (e as any).allocations || {} })) as any);
      this._apiTotalsPerParticipant.set(stats.totalsPerParticipant || {} as any);
    } catch {}
  }

  async setParticipantIncome(id: ParticipantId, income: number): Promise<void> {
    if (this.api && this.useApi) {
      await this.api.updateParticipant(id, { income: Math.max(0, income || 0) }, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._participants.update(list => list.map(p => p.id === id ? { ...p, income: Math.max(0, income || 0) } : p));
  }

  async setParticipantName(id: ParticipantId, name: string): Promise<void> {
    if (this.api && this.useApi) {
      await this.api.updateParticipant(id, { name: name.trim() }, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._participants.update(list => list.map(p => p.id === id ? { ...p, name: name.trim() } : p));
  }

  async addParticipant(name = `Person ${this._participants().length + 1}`, income = 0, email?: string): Promise<void> {
    if (this.api && this.useApi) {
      await this.api.addParticipant(name.trim(), Math.max(0, income || 0), email?.trim(), this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    const p: Participant = { id: (crypto as any).randomUUID(), name: name.trim(), income: Math.max(0, income || 0) };
    this._participants.update(list => [...list, p]);
  }

  async removeParticipant(id: ParticipantId): Promise<void> {
    if (this.api && this.useApi) {
      await this.api.deleteParticipant(id, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._participants.update(list => list.length <= 2 ? list : list.filter(p => p.id !== id));
  }

  async addExpense(name: string, total: number, type: string = 'expense'): Promise<void> {
    if (this.api && this.useApi) {
      await this.api.addExpense(name.trim(), Math.max(0, total || 0), type, this._groupId() || undefined);
      await this.refreshFromApi(true);
      return;
    }
    // Client-only mode: require at least one participant
    if ((this._participants()?.length || 0) === 0) {
      throw new Error('Add at least one participant before creating expenses');
    }
    const e: Expense = { id: (crypto as any).randomUUID(), name: name.trim(), total: Math.max(0, total || 0), type };
    this._expenses.update(list => [...list, e]);
  }

  async updateExpense(id: string, patch: Partial<Expense>): Promise<void> {
    if (this.api && this.useApi) {
      await this.api.updateExpense(id, patch as any, this._groupId() || undefined);
      await this.refreshFromApi();
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

  async removeExpense(id: string): Promise<void> {
    if (this.api && this.useApi) {
      await this.api.deleteExpense(id, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._expenses.update(list => list.filter(e => e.id !== id));
  }

  // Initialize (no localStorage persistence)
  constructor(private api?: ApiService) {
    if (this.api && this.useApi) {
      try {
        const gid = typeof localStorage !== 'undefined' ? localStorage.getItem('groupId') : null;
        if (gid) this._groupId.set(gid);
      } catch {}
      this.refreshFromApi();
    }
  }

  setGroupId(id: string | null) {
    this._groupId.set(id);
    try { if (typeof localStorage !== 'undefined') {
      if (id) localStorage.setItem('groupId', id); else localStorage.removeItem('groupId');
    } } catch {}
  }

  clear() {
    this._groupId.set(null);
    this._participants.set([]);
    this._expenses.set([]);
    this._apiExpensesWithAllocations.set([]);
    this._apiTotalsPerParticipant.set({});
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('groupId');
      }
    } catch {}
  }
}
