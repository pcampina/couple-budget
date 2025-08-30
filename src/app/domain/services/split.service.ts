import { AllocationByParticipant, Participant } from '@domain/models';

export function splitByIncome(total: number, participants: Pick<Participant, 'id' | 'income'>[]): AllocationByParticipant {
  const incomeSum = participants.reduce((acc, p) => acc + (p.income || 0), 0);
  if (!isFinite(total) || total <= 0 || incomeSum <= 0) {
    return participants.reduce<AllocationByParticipant>((map, p) => {
      map[p.id] = 0;
      return map;
    }, {} as AllocationByParticipant);
  }
  return participants.reduce<AllocationByParticipant>((map, p) => {
    map[p.id] = (p.income / incomeSum) * total;
    return map;
  }, {} as AllocationByParticipant);
}
