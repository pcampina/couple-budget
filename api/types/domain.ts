export enum Role {
  Admin = 'admin',
  User = 'user',
}

export type MinimalRole = Role.User | Role.Admin;

export enum TransactionTypeCode {
  Expense = 'expense',
  Income = 'income',
  Transfer = 'transfer',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  default_income: number;
}

export interface Budget {
  id: string;
  name: string;
  owner_user_id: string;
}

export interface Participant {
  id: string;
  budget_id: string;
  user_id?: string | null;
  income: number;
  name?: string | null;
  email?: string | null;
}

export interface Expense {
  id: string;
  budget_id: string;
  name: string;
  total: number;
  owner_user_id: string;
  type_code?: TransactionTypeCode | string;
  created_at?: string;
  paid?: boolean;
}

export interface Activity {
  id: string;
  user_id: string;
  budget_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload: unknown;
  created_at: string;
}

export interface Invite {
  id: string;
  budget_id: string;
  inviter_user_id: string;
  email: string;
  token: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
  created_at: string;
}

export interface TransactionType {
  code: TransactionTypeCode | string;
  name: string;
}
