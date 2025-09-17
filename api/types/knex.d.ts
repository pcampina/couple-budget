import type { Knex } from 'knex';

// Global table typings for Knex
declare module 'knex/types/tables' {
  interface Tables {
    budgets: {
      id: string;
      name: string;
      owner_user_id: string;
      created_at: string;
      updated_at: string;
    };
    users: {
      id: string;
      email: string;
      name: string;
      password_salt: string;
      password_hash: string;
      role: string; // 'user' | 'admin' etc
      created_at: string;
      default_income: number;
    };
    participants: {
      id: string;
      budget_id: string;
      user_id: string | null;
      income: number;
      // historical columns kept optional for compatibility
      name?: string | null;
      email?: string | null;
    };
    transactions: {
      id: string;
      budget_id: string;
      name: string;
      total: number;
      owner_user_id: string;
      type_code: string | null;
      created_at: string;
      paid: boolean;
    };
    transaction_types: {
      code: string; // UUID after migration 013
      name: string;
    };
    activity_log: {
      id: string;
      user_id: string;
      budget_id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      payload: unknown;
      created_at: string;
    };
    budget_members: {
      id: string;
      budget_id: string;
      user_id: string;
      role: string;
      created_at: string;
    };
    budget_invites: {
      id: string;
      budget_id: string;
      inviter_user_id: string;
      email: string;
      token: string;
      accepted_at: string | null;
      accepted_user_id: string | null;
      created_at: string;
    };
    participant_income_history: {
      id: string;
      participant_id: string;
      income: number;
      effective_from: string;
    };
  }
}

