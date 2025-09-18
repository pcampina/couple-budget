import { DbParticipant } from "../repositories/budgetRepo.js";

export function splitByIncome(total: number, participants: Pick<DbParticipant, 'id' | 'income'>[]): Record<string, number> {
  const incomeSum = participants.reduce((acc, p) => acc + (p.income || 0), 0);
  if (!Number.isFinite(total) || total <= 0 || incomeSum <= 0) {
    return participants.reduce<Record<string, number>>((map, p) => { map[p.id] = 0; return map; }, {});
  }
  return participants.reduce<Record<string, number>>((map, p) => {
    map[p.id] = (p.income / incomeSum) * total;
    return map;
  }, {});
}

