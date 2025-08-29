export function splitByIncome(total: number, s1: number, s2: number) {
  const sum = s1 + s2;
  if (!isFinite(total) || total <= 0 || sum <= 0) {
    return { p1: 0, p2: 0 };
  }
  const p1 = (s1 / sum) * total;
  const p2 = (s2 / sum) * total;
  return { p1, p2 };
}
