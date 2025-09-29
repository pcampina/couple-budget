// Mock minimal pieces of @angular/core used by the store (signals/computed/Injectable)
vi.mock('@angular/core', () => {
  const Injectable = () => (target: any) => target;

  function makeSignal<T>(initial: T) {
    let value = initial;
    const fn: any = () => value;
    fn.set = (v: T) => { value = v; };
    fn.update = (updater: (v: T) => T) => { value = updater(value); };
    return fn;
  }

  const signal = makeSignal;
  const computed = (calc: () => any) => {
    const fn: any = () => calc();
    return fn;
  };

  const effect = (fn: () => void) => { try { fn(); } catch {} return () => {}; };

  const inject = (token: any) => ({});

  return { Injectable, signal, computed, effect, inject };
});

import { BudgetStore } from '@application/budget.store';

describe('BudgetStore (signals, multi-participant)', () => {
  let store: BudgetStore;

  beforeEach(async () => {
    store = new BudgetStore();
    // Initialize with two participants and one transaction (since store now starts empty)
    await store.addParticipant('John', 2000);
    await store.addParticipant('Jane', 1600);
    await store.addTransaction('Rent', 1200);
  });

  it('calculates participant shares correctly', () => {
    const shares = store.participantShares();
    const total = store.totalIncome();
    expect(total).toBe(3600);
    expect(shares.length).toBe(2);
    expect(shares[0].share).toBeCloseTo(2000/3600, 5);
    expect(shares[1].share).toBeCloseTo(1600/3600, 5);
  });

  it('recalculates when salary changes', async () => {
    const ids = store.participants().map(p => p.id);
    await store.setParticipantIncome(ids[0], 1000);
    await store.setParticipantIncome(ids[1], 1000);
    const shares = store.participantShares();
    expect(shares[0].share).toBeCloseTo(0.5, 5);
    expect(store.totalIncome()).toBe(2000);
  });

  it('sums totals per participant equals total transactions', () => {
    expect(store.totalTransactions()).toBe(1200);
    const totals = store.totalsPerParticipant();
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1200, 5);
  });

  it('adds/edits/removes transaction', async () => {
    const before = store.transactions().length;
    await store.addTransaction('Internet', 40);
    expect(store.transactions().length).toBe(before + 1);

    const id = store.transactions()[1].id;
    await store.updateTransaction(id, { total: 50 });
    expect(store.transactions()[1].total).toBe(50);

    await store.removeTransaction(id);
    expect(store.transactions().find(t => t.id === id)).toBeUndefined();
  });

  it('updates name and handles update when id not found', async () => {
    const firstId = store.participants()[0].id;
    await store.setParticipantName(firstId, '  Alice  ');
    expect(store.participants()[0].name).toBe('Alice');

    const beforeLen = store.transactions().length;
    await store.updateTransaction('nope', { total: 999 });
    expect(store.transactions().length).toBe(beforeLen);
  });

  it('adds/removes participant and keeps at least two', async () => {
    const before = store.participants().length;
    await store.addParticipant('Ana', 1000);
    expect(store.participants().length).toBe(before + 1);
    const anaId = store.participants()[2].id;
    await store.removeParticipant(anaId);
    expect(store.participants().some(p => p.id === anaId)).toBe(false);
    const [id1, id2] = store.participants().map(p => p.id);
    await store.removeParticipant(id1);
    await store.removeParticipant(id2); // should be ignored to keep at least two
    expect(store.participants().length).toBe(2);
  });

  it('covers computed fields (no localStorage persistence)', () => {
    expect(store.totalIncome()).toBeGreaterThan(0);
    expect(store.participantShares().length).toBeGreaterThan(0);
    expect(store.transactionsWithAllocations().length).toBeGreaterThan(0);
    expect(store.totalTransactions()).toBeGreaterThan(0);
  });
});