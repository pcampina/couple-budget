import { describe, it, expect, vi } from 'vitest';

vi.mock('@angular/core', () => {
  const Injectable = () => (t: any) => t;
  function makeSignal<T>(initial: T) { let v = initial; const fn: any = () => v; fn.set = (n: T)=>{v=n}; fn.update=(u:(x:T)=>T)=>{v=u(v)}; return fn; }
  const signal = makeSignal; const computed = (calc: () => any) => { const fn: any = () => calc(); return fn; };
  let q: any[] = []; const inject = () => q.shift(); (globalThis as any).__setInjectQueue = (arr: any[]) => { q = arr.slice(); };
  const ViewEncapsulation = {} as any; const Component = () => (t:any)=>t;
  return { Injectable, signal, computed, inject, ViewEncapsulation, Component };
});

vi.mock('@angular/common', () => ({ CurrencyPipe: class {} }));
vi.mock('@angular/forms', () => ({ FormsModule: {} }));

import { ExpensesPageComponent } from './expenses-page.component';

describe('ExpensesPageComponent', () => {
  it('maps type code to label and handles fallbacks', () => {
    const store = { participants: vi.fn(() => [] ) };
    const api = {}; const auth = {}; const ui = {}; const notify = {}; const errors = {};
    (globalThis as any).__setInjectQueue([store, api, auth, ui, notify, errors]);
    const comp = new ExpensesPageComponent();
    comp.types.set([{ code: 'uuid-1', name: 'Expense' }, { code: 'uuid-2', name: 'Income' }]);
    expect(comp.txTypeLabel({ type_code: 'uuid-2' })).toBe('Income');
    expect(comp.txTypeLabel({ type: 'transfer' })).toBe('Transfer');
  });
});
