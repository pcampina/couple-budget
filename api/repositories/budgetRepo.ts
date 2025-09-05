import { getDb } from '../db';
import { uuid } from '../utils';
import type { Knex } from 'knex';

export interface DbParticipant { id: string; budget_id: string; name: string; income: number }
export interface DbExpense { id: string; budget_id: string; name: string; total: number }

function memory() {
  // Fallback in-memory store for when DB is not configured (tests/dev)
  const state = {
    budgets: new Map<string, { id: string; owner_user_id: string; name: string }>(),
    participants: new Map<string, DbParticipant[]>(),
    expenses: new Map<string, DbExpense[]>(),
  };
  function ensureBudget(userId: string) {
    let b = Array.from(state.budgets.values()).find(b => b.owner_user_id === userId);
    if (!b) {
      b = { id: uuid(), owner_user_id: userId, name: 'Default' };
      state.budgets.set(b.id, b);
      if (!state.participants.has(b.id)) state.participants.set(b.id, []);
      if (!state.expenses.has(b.id)) state.expenses.set(b.id, []);
    }
    return b.id;
  }
  return {
    async getOrCreateDefaultBudgetId(userId: string) { return ensureBudget(userId); },
    async listParticipants(budgetId: string) { return state.participants.get(budgetId) || []; },
    async addParticipant(budgetId: string, name: string, income: number) {
      const arr = state.participants.get(budgetId) || []; state.participants.set(budgetId, arr);
      const p: DbParticipant = { id: uuid(), budget_id: budgetId, name, income };
      arr.push(p); return p;
    },
    async updateParticipant(budgetId: string, id: string, patch: Partial<DbParticipant>) {
      const arr = state.participants.get(budgetId) || []; const i = arr.findIndex(p => p.id === id);
      if (i < 0) return null; arr[i] = { ...arr[i], ...patch }; return arr[i];
    },
    async deleteParticipant(budgetId: string, id: string) { const arr = state.participants.get(budgetId) || []; const n = arr.length; state.participants.set(budgetId, arr.filter(p => p.id !== id)); return n !== (state.participants.get(budgetId) || []).length; },
    async listExpenses(budgetId: string) { return state.expenses.get(budgetId) || []; },
    async addExpense(budgetId: string, name: string, total: number) {
      const arr = state.expenses.get(budgetId) || []; state.expenses.set(budgetId, arr);
      const e: DbExpense = { id: uuid(), budget_id: budgetId, name, total };
      arr.push(e); return e;
    },
    async updateExpense(budgetId: string, id: string, patch: Partial<DbExpense>) {
      const arr = state.expenses.get(budgetId) || []; const i = arr.findIndex(e => e.id === id);
      if (i < 0) return null; arr[i] = { ...arr[i], ...patch }; return arr[i];
    },
    async deleteExpense(budgetId: string, id: string) { const arr = state.expenses.get(budgetId) || []; const n = arr.length; state.expenses.set(budgetId, arr.filter(e => e.id !== id)); return n !== (state.expenses.get(budgetId) || []).length; },
  };
}

const MEM = memory();
export function budgetRepo() {
  const db = getDb();
  if (!db) return MEM;
  return sqlRepo(db);
}

function sqlRepo(db: Knex) {
  return {
    async getOrCreateDefaultBudgetId(userId: string): Promise<string> {
      const existing = await db('budgets').where({ owner_user_id: userId }).first();
      if (existing) return existing.id;
      const [row] = await db('budgets').insert({ owner_user_id: userId, name: 'Default' }).returning('id');
      return row.id as string;
    },
    async listParticipants(budgetId: string): Promise<DbParticipant[]> {
      const rows = await db('participants').select('id', 'budget_id', 'name', db.raw('CAST(income AS FLOAT) as income')).where({ budget_id: budgetId });
      return rows as any;
    },
    async addParticipant(budgetId: string, name: string, income: number): Promise<DbParticipant> {
      const [row] = await db('participants').insert({ budget_id: budgetId, name, income }).returning(['id', 'budget_id', 'name', db.raw('CAST(income AS FLOAT) as income')]);
      return row as any;
    },
    async updateParticipant(budgetId: string, id: string, patch: Partial<DbParticipant>): Promise<DbParticipant | null> {
      const [row] = await db('participants').where({ budget_id: budgetId, id }).update(patch).returning(['id', 'budget_id', 'name', db.raw('CAST(income AS FLOAT) as income')]);
      return (row as any) || null;
    },
    async deleteParticipant(budgetId: string, id: string): Promise<boolean> {
      const n = await db('participants').where({ budget_id: budgetId, id }).del();
      return n > 0;
    },
    async listExpenses(budgetId: string): Promise<DbExpense[]> {
      const rows = await db('expenses').select('id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total')).where({ budget_id: budgetId });
      return rows as any;
    },
    async addExpense(budgetId: string, name: string, total: number): Promise<DbExpense> {
      const [row] = await db('expenses').insert({ budget_id: budgetId, name, total }).returning(['id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total')]);
      return row as any;
    },
    async updateExpense(budgetId: string, id: string, patch: Partial<DbExpense>): Promise<DbExpense | null> {
      const [row] = await db('expenses').where({ budget_id: budgetId, id }).update(patch).returning(['id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total')]);
      return (row as any) || null;
    },
    async deleteExpense(budgetId: string, id: string): Promise<boolean> {
      const n = await db('expenses').where({ budget_id: budgetId, id }).del();
      return n > 0;
    },
  };
}
