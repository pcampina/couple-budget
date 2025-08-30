export type ExpenseId = string;
export type ParticipantId = string;

export interface Expense {
  id: ExpenseId;
  name: string;
  total: number;
}

export interface Participant {
  id: ParticipantId;
  name: string;
  income: number;
}

export type AllocationByParticipant = Record<ParticipantId, number>;
