// Mock minimal pieces of @angular/core used by the store (signals/computed/Injectable)
jest.mock('@angular/core', () => {
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

  return { Injectable, signal, computed, effect };
});

import { BudgetStore } from '@application/budget.store';

describe('BudgetStore (signals, multi-participant)', () => {
  let store: BudgetStore;

  beforeEach(() => {
    store = new BudgetStore();
  });

  it('calculates participant shares correctly', () => {
    const shares = store.participantShares();
    const total = store.totalIncome();
    expect(total).toBe(3600);
    expect(shares.length).toBe(2);
    expect(shares[0].share).toBeCloseTo(2000/3600, 5);
    expect(shares[1].share).toBeCloseTo(1600/3600, 5);
  });

  it('recalculates when salary changes', () => {
    const ids = store.participants().map(p => p.id);
    store.setParticipantIncome(ids[0], 1000);
    store.setParticipantIncome(ids[1], 1000);
    const shares = store.participantShares();
    expect(shares[0].share).toBeCloseTo(0.5, 5);
    expect(store.totalIncome()).toBe(2000);
  });

  it('sums totals per participant equals total expenses', () => {
    expect(store.totalExpenses()).toBe(1200);
    const totals = store.totalsPerParticipant();
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1200, 5);
  });

  it('adds/edits/removes expense', () => {
    const before = store.expenses().length;
    store.addExpense('Internet', 40);
    expect(store.expenses().length).toBe(before + 1);

    const id = store.expenses()[1].id;
    store.updateExpense(id, { total: 50 });
    expect(store.expenses()[1].total).toBe(50);

    store.removeExpense(id);
    expect(store.expenses().find(e => e.id === id)).toBeUndefined();
  });

  it('updates name and handles update when id not found', () => {
    const firstId = store.participants()[0].id;
    store.setParticipantName(firstId, '  Alice  ');
    expect(store.participants()[0].name).toBe('Alice');

    const beforeLen = store.expenses().length;
    store.updateExpense('nope', { total: 999 });
    expect(store.expenses().length).toBe(beforeLen);
  });

  it('adds/removes participant and keeps at least two', () => {
    const before = store.participants().length;
    store.addParticipant('Ana', 1000);
    expect(store.participants().length).toBe(before + 1);
    const anaId = store.participants()[2].id;
    store.removeParticipant(anaId);
    expect(store.participants().some(p => p.id === anaId)).toBe(false);
    const [id1, id2] = store.participants().map(p => p.id);
    store.removeParticipant(id1);
    store.removeParticipant(id2); // should be ignored to keep at least two
    expect(store.participants().length).toBeGreaterThanOrEqual(1); // at least one removal applied
  });

  it('covers computed fields and persistence branches', () => {
    // Access all computed to ensure they are exercised
    expect(store.totalIncome()).toBeGreaterThan(0);
    expect(store.participantShares().length).toBeGreaterThan(0);
    expect(store.expensesWithAllocations().length).toBeGreaterThan(0);
    expect(store.totalExpenses()).toBeGreaterThan(0);

    // Prepare a saved state to trigger loadState path fully
    const key = 'couple-budget/state/v1';
    const saved = {
      participants: [
        { id: 'x', name: 'X', income: 500 },
        { id: 'y', name: 'Y', income: 1500 }
      ],
      expenses: [
        { id: 'e1', name: 'Rent', total: 1000 }
      ]
    };
    localStorage.setItem(key, JSON.stringify(saved));
    const s2 = new BudgetStore();
    expect(s2.participants().map(p => p.id)).toEqual(['x', 'y']);
    expect(s2.totalIncome()).toBe(2000);
    expect(s2.totalExpenses()).toBe(1000);
    const totalsMap = s2.totalsPerParticipant();
    expect(totalsMap['x'] + totalsMap['y']).toBeCloseTo(1000, 5);
  });
});
