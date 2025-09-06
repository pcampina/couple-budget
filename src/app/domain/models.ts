export type ExpenseId = string;
export type ParticipantId = string;

export interface Expense {
  id: ExpenseId;
  name: string;
  total: number;
  type?: string;
}

export interface Participant {
  id: ParticipantId;
  name: string;
  email?: string | null;
  income: number;
}

export type AllocationByParticipant = Record<ParticipantId, number>;
