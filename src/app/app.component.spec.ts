// Minimal Angular core mocks for component import
jest.mock('@angular/core', () => {
  const Injectable = () => (t: any) => t;
  function makeSignal<T>(initial: T) {
    let value = initial;
    const fn: any = () => value;
    fn.set = (v: T) => { value = v; };
    fn.update = (updater: (v: T) => T) => { value = updater(value); };
    return fn;
  }
  const signal = makeSignal;
  const computed = (calc: () => any) => { const fn: any = () => calc(); return fn; };
  const effect = (fn: () => void) => { try { fn(); } catch {} return () => {}; };
  return {
    Component: () => (target: any) => target,
    ViewEncapsulation: {},
    inject: () => fakeStore,
    Injectable,
    signal,
    computed,
    effect,
  } as any;
});

// Silence Angular common/forms ESM by mocking modules
jest.mock('@angular/common', () => ({}));
jest.mock('@angular/forms', () => ({}));

import { AppComponent } from '@app/app.component';

// Fake store used by AppComponent via inject()
let fakeStore: any;

describe('AppComponent unit', () => {
  let comp: AppComponent;

  beforeEach(() => {
    fakeStore = {
      addExpense: jest.fn(),
      participants: jest.fn(() => [{ id: 'a' }, { id: 'b' }])
    };
    comp = new AppComponent();
  });

  it('validates numbers correctly', () => {
    expect(comp.isValid(0)).toBe(true);
    expect(comp.isValid(10)).toBe(true);
    expect(comp.isValid(-1)).toBe(false);
    expect(comp.isValid(NaN)).toBe(false);
    expect(comp.isValid('3')).toBe(false);
  });

  it('converts to number robustly', () => {
    expect(comp.toNumber(5)).toBe(5);
    expect(comp.toNumber('12.3')).toBeCloseTo(12.3);
    expect(comp.toNumber('abc')).toBe(0);
  });

  it('adds an expense from form only when valid and resets fields', () => {
    comp.newName = 'Internet';
    comp.newTotal = 40;
    comp.addFromForm();
    expect(fakeStore.addExpense).toHaveBeenCalledWith('Internet', 40);
    expect(comp.newName).toBe('');
    expect(comp.newTotal).toBeNull();

    // Invalid path (no name)
    comp.newName = '';
    comp.newTotal = 10;
    comp.addFromForm();
    expect(fakeStore.addExpense).toHaveBeenCalledTimes(1);
  });

  it('computes grid columns based on participants', () => {
    fakeStore.participants.mockReturnValue([{ id: 'a' }, { id: 'b' }]);
    expect(comp.gridTemplateColumns()).toBe('2fr 1.2fr 1.2fr 1.2fr 88px');

    fakeStore.participants.mockReturnValue([{ id: 'a' }]);
    expect(comp.gridTemplateColumns()).toBe('2fr 1.2fr 1.2fr 88px');
  });
});
