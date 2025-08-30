import { splitByIncome } from '@domain/services/split.service';

describe('splitByIncome (multi-participant)', () => {
  it('splits proportionally among three people', () => {
    const allocations = splitByIncome(1000, [
      { id: 'a', income: 2000 },
      { id: 'b', income: 1000 },
      { id: 'c', income: 1000 },
    ]);
    expect(allocations['a']).toBeCloseTo(500, 2);
    expect(allocations['b']).toBeCloseTo(250, 2);
    expect(allocations['c']).toBeCloseTo(250, 2);
  });

  it('returns 0 for everyone when income sum is 0', () => {
    const r = splitByIncome(1000, [
      { id: 'a', income: 0 },
      { id: 'b', income: 0 },
    ]);
    expect(r).toEqual({ a: 0, b: 0 });
  });

  it('returns 0 when total <= 0', () => {
    const r = splitByIncome(0, [
      { id: 'a', income: 1000 },
      { id: 'b', income: 500 },
    ]);
    expect(r).toEqual({ a: 0, b: 0 });
  });
});
