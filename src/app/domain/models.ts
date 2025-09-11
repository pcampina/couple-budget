import { TransactionTypeCode } from './enums';

export type TransactionId = string;
export type ParticipantId = string;
export type BudgetId = string;

export interface Transaction {
  id: TransactionId;
  name: string;
  total: number;
  type_code?: TransactionTypeCode;
  paid?: boolean;
  owner_user_id?: string;
  budget_id?: BudgetId;
  created_at?: string;
}

export interface TransactionType {
  code: TransactionTypeCode | string;
  name: string;
}

export interface Participant {
  id: ParticipantId;
  name: string;
  email?: string | null;
  income: number;
}

export type AllocationByParticipant = Record<ParticipantId, number>;
