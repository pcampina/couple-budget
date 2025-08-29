import { splitByIncome } from '@domain/services/split.service';

describe('splitByIncome', () => {
  it('splits proportionally', () => {
    const { p1, p2 } = splitByIncome(1000, 2000, 1000);
    expect(p1).toBeCloseTo(666.666, 2);
    expect(p2).toBeCloseTo(333.333, 2);
  });

  it('returns 0 when both incomes sum to 0', () => {
    const r = splitByIncome(1000, 0, 0);
    expect(r).toEqual({ p1: 0, p2: 0 });
  });

  it('returns 0 when total <= 0', () => {
    const r = splitByIncome(0, 1000, 500);
    expect(r).toEqual({ p1: 0, p2: 0 });
  });
});
