import { describe, it, expect, vi } from 'vitest';

vi.mock('@angular/core', () => {
  const Injectable = () => (t: any) => t;
  function makeSignal<T>(initial: T) { let v = initial; const fn: any = () => v; fn.set = (n: T)=>{v=n}; fn.update=(u:(x:T)=>T)=>{v=u(v)}; return fn; }
  const signal = makeSignal; const computed = (calc: () => any) => { const fn: any = () => calc(); return fn; };
  let q: any[] = []; const inject = () => q.shift(); (globalThis as any).__setInjectQueue = (arr: any[]) => { q = arr.slice(); };
  const ViewEncapsulation = {} as any; const Component = () => (t:any)=>t;
  return { Injectable, signal, computed, inject, ViewEncapsulation, Component };
});

vi.mock('@angular/common', () => ({}));
vi.mock('@angular/forms', () => ({ FormsModule: {} }));

import { ConfigPageComponent } from './config-page.component';

describe('ConfigPageComponent', () => {
  it('detects changes to profile (isMeDirty)', () => {
    const auth = { user: () => ({ email: 'me@example.com' }) };
    const store = { participants: () => [{ id: 'p1', name: 'Me', income: 1000, email: 'me@example.com' }] };
    const ui = {}; const notify = {}; const errors = {}; const api = {};
    (globalThis as any).__setInjectQueue([store, auth, ui, notify, errors, api]);
    const comp = new ConfigPageComponent();
    expect(comp.isMeDirty()).toBe(false);
    comp.onMeNameInput('New Name');
    expect(comp.isMeDirty()).toBe(true);
  });
});
