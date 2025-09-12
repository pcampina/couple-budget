import { Injectable, computed, signal, inject } from '@angular/core';
import {
  Transaction,
  Participant,
  ParticipantId,
  AllocationByParticipant,
  TransactionId,
} from '../domain/models';
import { TransactionTypeCode } from '../domain/enums';
import { splitByIncome } from '../domain/services/split.service';
import { ApiService, ApiTransaction } from '../infrastructure/api.service';

@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly api = inject(ApiService);

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

  private readonly _transactions = signal<Transaction[]>([]);
  // When using API, prefer server-computed allocations and totals
  private readonly _apiTransactionsWithAllocations = signal<(Transaction & { allocations: AllocationByParticipant })[]>([]);
  private readonly _apiTotalsPerParticipant = signal<Record<string, number>>({});
  readonly transactions = computed(() => this._transactions());

  readonly transactionsWithAllocations = computed(() => {
    if (this.useApi) return this._apiTransactionsWithAllocations();
    return this._transactions().map(t => {
      const allocations = splitByIncome(t.total, this._participants());
      return { ...t, allocations };
    });
  });

  readonly totalTransactions = computed(() => this._transactions().reduce((acc, e) => acc + (e.total || 0), 0));
  readonly totalsPerParticipant = computed(() => {
    if (this.useApi) return this._apiTotalsPerParticipant();
    const totals: AllocationByParticipant = Object.fromEntries(this._participants().map(p => [p.id, 0]));
    for (const t of this.transactionsWithAllocations()) {
      for (const pid of Object.keys(t.allocations)) {
        totals[pid] = (totals[pid] || 0) + t.allocations[pid];
      }
    }
    return totals;
  });

  private readonly useApi = typeof window !== 'undefined' && ((window as any).__USE_API__ === true || String((window as any).__USE_API__).toLowerCase() === 'true');

  async refreshFromApi(force = false) {
    try {
      if (!this.useApi && !force) return;
      const stats = await this.api.getStats(this._groupId() || undefined);
      this._participants.set(stats.participants.map(p => ({ id: p.id, name: p.name, email: p.email ?? null, income: p.income })));
      this._transactions.set(stats.transactions.map((t: ApiTransaction) => ({ id: t.id, name: t.name, total: t.total, type_code: t.type_code as TransactionTypeCode || TransactionTypeCode.Expense, paid: t.paid ?? false })));
      this._apiTransactionsWithAllocations.set((stats.transactionsWithAllocations || []).map((t: any) => ({ id: t.id, name: t.name, total: t.total, type_code: t.type_code as TransactionTypeCode || TransactionTypeCode.Expense, paid: t.paid ?? false, allocations: t.allocations || {} })));
      this._apiTotalsPerParticipant.set(stats.totalsPerParticipant || {});
    } catch (e) {
      console.error('Failed to refresh from API', e);
    }
  }

  async setParticipantIncome(id: ParticipantId, income: number): Promise<void> {
    if (this.useApi) {
      await this.api.updateParticipant(id, { income: Math.max(0, income || 0) }, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._participants.update(list => list.map(p => p.id === id ? { ...p, income: Math.max(0, income || 0) } : p));
  }

  async setParticipantName(id: ParticipantId, name: string): Promise<void> {
    if (this.useApi) {
      await this.api.updateParticipant(id, { name: name.trim() }, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._participants.update(list => list.map(p => p.id === id ? { ...p, name: name.trim() } : p));
  }

  async addParticipant(name = `Person ${this._participants().length + 1}`, income = 0, email?: string): Promise<void> {
    if (this.useApi) {
      await this.api.addParticipant(name.trim(), Math.max(0, income || 0), email?.trim(), this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    const p: Participant = { id: crypto.randomUUID(), name: name.trim(), income: Math.max(0, income || 0), email };
    this._participants.update(list => [...list, p]);
  }

  async removeParticipant(id: ParticipantId): Promise<void> {
    if (this.useApi) {
      await this.api.deleteParticipant(id, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._participants.update(list => list.length <= 2 ? list : list.filter(p => p.id !== id));
  }

  async addTransaction(name: string, total: number, type: TransactionTypeCode = TransactionTypeCode.Expense): Promise<void> {
    if (this.useApi) {
      await this.api.addTransaction(name.trim(), Math.max(0, total || 0), type, this._groupId() || undefined);
      await this.refreshFromApi(true);
      return;
    }
    if ((this._participants()?.length || 0) === 0) {
      throw new Error('Add at least one participant before creating transactions');
    }
    const t: Transaction = { id: crypto.randomUUID(), name: name.trim(), total: Math.max(0, total || 0), type_code: type };
    this._transactions.update(list => [...list, t]);
  }

  async updateTransaction(id: TransactionId, patch: Partial<Transaction>): Promise<void> {
    if (this.useApi) {
      await this.api.updateTransaction(id, patch, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._transactions.update(list => {
      const i = list.findIndex(t => t.id === id);
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

  async removeTransaction(id: TransactionId): Promise<void> {
    if (this.useApi) {
      await this.api.deleteTransaction(id, this._groupId() || undefined);
      await this.refreshFromApi();
      return;
    }
    this._transactions.update(list => list.filter(t => t.id !== id));
  }

  constructor() {
    // No direct API calls in constructor to avoid circular dependencies
  }

  async load() {
    if (this.useApi) {
      try {
        const gid = typeof localStorage !== 'undefined' ? localStorage.getItem('groupId') : null;
        if (gid) this._groupId.set(gid);
      } catch {}
      await this.refreshFromApi();
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
    this._transactions.set([]);
    this._apiTransactionsWithAllocations.set([]);
    this._apiTotalsPerParticipant.set({});
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('groupId');
      }
    } catch {}
  }
}