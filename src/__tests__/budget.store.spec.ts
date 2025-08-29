import { BudgetStore } from '@application/budget.store';

describe('BudgetStore (signals)', () => {
  let store: BudgetStore;

  beforeEach(() => {
    store = new BudgetStore();
  });

  it('calculates percentages correctly', () => {
    expect(store.p1Share()).toBeCloseTo(2000/3600, 5);
    expect(store.p2Share()).toBeCloseTo(1600/3600, 5);
  });

  it('recalculates when salary changes', () => {
    store.setSalary1(1000);
    store.setSalary2(1000);
    expect(store.p1Share()).toBeCloseTo(0.5, 5);
    expect(store.totalIncome()).toBe(2000);
  });

  it('sums totals per person', () => {
    expect(store.totalExpenses()).toBe(1200);
    expect(store.totalP1() + store.totalP2()).toBeCloseTo(1200, 5);
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
});
