import { describe, it, expect, vi } from 'vitest';

// Mock Angular core minimal APIs used
vi.mock('@angular/core', () => {
  const Injectable = () => (t: any) => t;
  function makeSignal<T>(initial: T) { let v = initial; const fn: any = () => v; fn.set = (n: T)=>{v=n}; fn.update=(u:(x:T)=>T)=>{v=u(v)}; return fn; }
  const signal = makeSignal;
  const computed = (calc: () => any) => { const fn: any = () => calc(); return fn; };
  const ViewEncapsulation = {} as any;
  const Component = () => (t: any) => t;
  let q: any[] = [];
  const inject = () => q.shift();
  (globalThis as any).__setInjectQueue = (arr: any[]) => { q = arr.slice(); };
  return { Injectable, signal, computed, ViewEncapsulation, inject, Component };
});

vi.mock('@angular/common', () => ({ DecimalPipe: class {} }));

import { GroupPageComponent } from './group-page.component';

describe('GroupPageComponent', () => {
  it('loads members and computes percent shares', async () => {
    const api = { listGroupMembers: vi.fn().mockResolvedValue([
      { id: 'p1', name: 'Alice', email: 'a@x.com', accepted: true },
      { id: 'p2', name: 'Bob', email: 'b@x.com', accepted: false },
    ]) };
    const auth = {};
    const notify = { success: vi.fn(), error: vi.fn() };
    const errors = { handle: vi.fn() };
    const store = {
      participantShares: vi.fn(() => [{ id: 'p1', share: 0.6 }, { id: 'p2', share: 0.4 }]),
      refreshFromApi: vi.fn(async () => {})
    };
    (globalThis as any).__setInjectQueue([api, auth, notify, errors, store]);

  const comp = new GroupPageComponent();
    // allow async load to finish
    await Promise.resolve();
    await Promise.resolve();
    expect(store.refreshFromApi).toHaveBeenCalled();
    expect(api.listGroupMembers).toHaveBeenCalled();
    expect(comp.members().length).toBe(2);
    expect(comp.shareById()['p1']).toBeCloseTo(0.6, 5);
  });
});
