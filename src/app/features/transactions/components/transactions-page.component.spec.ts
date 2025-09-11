import { describe, it, expect, vi } from 'vitest';

vi.mock('@angular/core', () => {
  const Injectable = () => (t: any) => t;
  function makeSignal<T>(initial: T) { let v = initial; const fn: any = () => v; fn.set = (n: T)=>{v=n}; fn.update=(u:(x:T)=>T)=>{v=u(v)}; return fn; }
  const signal = makeSignal; const computed = (calc: () => any) => { const fn: any = () => calc(); return fn; };
  let q: any[] = []; const inject = () => q.shift(); (globalThis as any).__setInjectQueue = (arr: any[]) => { q = arr.slice(); };
  const ViewEncapsulation = {} as any; const Component = () => (t:any)=>t;
  return { Injectable, signal, computed, inject, ViewEncapsulation, Component };
});

vi.mock('@angular/common', () => ({ CurrencyPipe: class {}, DecimalPipe: class {}, NgFor: {}, NgIf: {} }));
vi.mock('@angular/forms', () => ({ FormsModule: {} }));
vi.mock('@angular/router', () => ({ ActivatedRoute: class { paramMap = { subscribe(){} } }, Router: class {} }));

import { TransactionsPageComponent } from '@app/features/transactions/components/transactions-page.component';
import { Transaction } from '@app/domain/models';
import { TransactionTypeCode } from '@app/domain/enums';

describe('TransactionsPageComponent', () => {
  it('maps type code to label and handles fallbacks', () => {
    const store = { participants: vi.fn(() => [] ) };
    const api = { listTransactionTypes: vi.fn(() => Promise.resolve([])) };
    const auth = { isConfigured: vi.fn(), isAuthenticated: vi.fn() };
    const ui = {}; const notify = {}; const errors = {}; const groupService = { selectedGroup: vi.fn(), groups: vi.fn(), loadGroups: vi.fn(() => Promise.resolve()) };
    (globalThis as any).__setInjectQueue([store, auth, ui, notify, errors, groupService, api]);
    const comp = new TransactionsPageComponent();
    comp.types.set([{ code: 'uuid-1', name: 'Expense' }, { code: 'uuid-2', name: 'Income' }]);
    expect(comp.txTypeLabel({ id: '1', name: 't1', total: 10, type_code: 'uuid-2' } as Transaction)).toBe('Income');
    expect(comp.txTypeLabel({ id: '2', name: 't2', total: 20, type_code: TransactionTypeCode.Transfer } as Transaction)).toBe('Transfer');
  });
});