import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
vi.mock('@angular/router', () => ({
  ActivatedRoute: class { paramMap = { subscribe: vi.fn() } },
}));

import { GroupPageComponent } from './group-page.component';

describe('GroupPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads members and computes percent shares', async () => {
    const groupService = {
      loadGroupData: vi.fn().mockResolvedValue(true),
      members: vi.fn(() => [
        { id: 'p1', name: 'Alice', email: 'a@x.com', accepted: true },
        { id: 'p2', name: 'Bob', email: 'b@x.com', accepted: false },
      ]),
      isOwner: vi.fn(() => true),
      lastInvites: vi.fn(() => []),
      pendingInvites: vi.fn(() => []),
      inviteEmails: vi.fn(() => '')
    };
    const store = {
      participantShares: vi.fn(() => [{ id: 'p1', name: 'Alice', share: 0.6 }, { id: 'p2', name: 'Bob', share: 0.4 }]),
    };
    const route = { paramMap: { subscribe: (fn: any) => fn({ get: () => 'group-1' }) } };
    (globalThis as any).__setInjectQueue([store, groupService, route]);

    const comp = new GroupPageComponent();
    await vi.runAllTimersAsync();

    expect(groupService.loadGroupData).toHaveBeenCalledWith('group-1');
    expect(comp.shareById()['p1']).toBeCloseTo(0.6, 5);
  });
});
