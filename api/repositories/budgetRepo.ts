import { getDb } from '../db';
import { uuid } from '../utils';
import type { Knex } from 'knex';
import crypto from 'node:crypto';

export interface DbParticipant { id: string; budget_id: string; user_id?: string | null; income: number; name?: string; email?: string | null }
export interface DbExpense { id: string; budget_id: string; name: string; total: number; owner_user_id: string; type_code?: string; created_at?: string }
export interface DbActivity { id: string; user_id: string; budget_id: string; action: string; entity_type: string; entity_id: string; payload: any; created_at: string }

function memory() {
  // Fallback in-memory store for when DB is not configured (tests/dev)
  const state = {
    budgets: new Map<string, { id: string; owner_user_id: string; name: string }>(),
    participants: new Map<string, DbParticipant[]>(),
    expenses: new Map<string, DbExpense[]>(),
    incomeHistory: new Map<string, { income: number; effective_from: string }[]>(),
    activities: new Map<string, DbActivity[]>(), // key: user_id
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
    async addParticipant(budgetId: string, name: string, income: number, email?: string | null) {
      const arr = state.participants.get(budgetId) || []; state.participants.set(budgetId, arr);
      const p: DbParticipant = { id: uuid(), budget_id: budgetId, name, email: email || null, income };
      arr.push(p); return p;
    },
    async updateParticipant(budgetId: string, id: string, patch: Partial<DbParticipant>) {
      const arr = state.participants.get(budgetId) || []; const i = arr.findIndex(p => p.id === id);
      if (i < 0) return null; arr[i] = { ...arr[i], ...patch }; return arr[i];
    },
    async deleteParticipant(budgetId: string, id: string) { const arr = state.participants.get(budgetId) || []; const n = arr.length; state.participants.set(budgetId, arr.filter(p => p.id !== id)); return n !== (state.participants.get(budgetId) || []).length; },
    async listExpenses(budgetId: string) { return state.expenses.get(budgetId) || []; },
    async addExpense(budgetId: string, ownerUserId: string, name: string, total: number, type_code: string = 'expense') {
      const arr = state.expenses.get(budgetId) || []; state.expenses.set(budgetId, arr);
      const e: DbExpense = { id: uuid(), budget_id: budgetId, name, total, owner_user_id: ownerUserId, type_code, created_at: new Date().toISOString() };
      arr.push(e); return e;
    },
    async updateExpense(budgetId: string, id: string, patch: Partial<DbExpense>, ownerUserId: string) {
      const arr = state.expenses.get(budgetId) || []; const i = arr.findIndex(e => e.id === id && e.owner_user_id === ownerUserId);
      if (i < 0) return null; arr[i] = { ...arr[i], ...patch }; return arr[i];
    },
    async deleteExpense(budgetId: string, id: string, ownerUserId: string) {
      const arr = state.expenses.get(budgetId) || [];
      const n = arr.length;
      state.expenses.set(budgetId, arr.filter(e => !(e.id === id && e.owner_user_id === ownerUserId)));
      return n !== (state.expenses.get(budgetId) || []).length;
    },
    async recordIncomeChange(participantId: string, income: number, effective_from: string) {
      const list = state.incomeHistory.get(participantId) || [];
      state.incomeHistory.set(participantId, list);
      list.push({ income, effective_from });
    },
    async getParticipantsIncomeAt(budgetId: string, atIso: string) {
      const at = new Date(atIso).toISOString();
      const participants = await this.listParticipants(budgetId);
      return participants.map(p => {
        const hist = state.incomeHistory.get(p.id) || [];
        const effective = hist
          .filter(h => h.effective_from <= at)
          .sort((a, b) => a.effective_from.localeCompare(b.effective_from))
          .slice(-1)[0];
        return { ...p, income: effective ? Number(effective.income) : p.income } as DbParticipant;
      });
    },
    async logActivity(userId: string, budgetId: string, action: string, entityType: string, entityId: string, payload: any) {
      const arr = state.activities.get(userId) || [];
      state.activities.set(userId, arr);
      const item: DbActivity = {
        id: uuid(),
        user_id: userId,
        budget_id: budgetId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        payload,
        created_at: new Date().toISOString(),
      };
      arr.unshift(item);
      return item;
    },
    async listActivities(userId: string, page: number, pageSize: number) {
      const arr = state.activities.get(userId) || [];
      const total = arr.length;
      const start = (page - 1) * pageSize;
      const items = arr.slice(start, start + pageSize);
      return { items, total };
    },
    async findParticipantByEmail(email: string) {
      const all = Array.from(state.participants.values()).flat();
      const found = all.find(p => (p.email || '').toLowerCase() === (email || '').toLowerCase());
      return found || null;
    },
    async listTransactionTypes() {
      return [
        { code: 'expense', name: 'Expense' },
        { code: 'income', name: 'Income' },
        { code: 'transfer', name: 'Transfer' },
      ];
    },
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
      if (existing) return (existing as any).id;
      const [row] = await db('budgets').insert({ owner_user_id: userId, name: 'Default' }).returning('id');
      return (row as any).id as string;
    },
    async listParticipants(budgetId: string): Promise<DbParticipant[]> {
      const rows = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .where('p.budget_id', budgetId);
      return rows as any;
    },
    async addParticipant(budgetId: string, name: string, income: number, email?: string | null): Promise<DbParticipant> {
      let userId: string | null = null;
      if (email) {
        const u = await db('users').whereRaw('LOWER(email) = LOWER(?)', [email]).first();
        if (u) userId = (u as any).id;
        else {
          const salt = crypto.randomBytes(16).toString('hex');
          const password_hash = crypto.scryptSync(crypto.randomUUID(), salt, 64).toString('hex');
          const [nu] = await db('users').insert({ email, name: name || (email.split('@')[0] || ''), password_salt: salt, password_hash, role: 'user' }).returning(['id']);
          userId = (nu as any).id;
        }
      }
      const [row] = await db('participants').insert({ budget_id: budgetId, income, user_id: userId }).returning(['id']);
      const id = (row as any).id;
      const out = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .where('p.id', id).first();
      return out as any;
    },
    async updateParticipant(budgetId: string, id: string, patch: Partial<DbParticipant>): Promise<DbParticipant | null> {
      const base: any = {};
      if (patch.income != null) base.income = patch.income as any;
      if (Object.keys(base).length) await db('participants').where({ budget_id: budgetId, id }).update(base);
      if ((patch as any).name != null || (patch as any).email != null) {
        const p = await db('participants').select('user_id').where({ id }).first();
        if (p && (p as any).user_id) {
          const upd: any = {};
          if ((patch as any).name != null) upd.name = String((patch as any).name);
          if ((patch as any).email != null) upd.email = String((patch as any).email).toLowerCase();
          if (Object.keys(upd).length) await db('users').where({ id: (p as any).user_id }).update(upd);
        }
      }
      const out = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .where('p.id', id).first();
      return (out as any) || null;
    },
    async deleteParticipant(budgetId: string, id: string): Promise<boolean> {
      const n = await db('participants').where({ budget_id: budgetId, id }).del();
      return n > 0;
    },
    async listExpenses(budgetId: string): Promise<DbExpense[]> {
      const rows = await db('transactions')
        .select('id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total'), 'owner_user_id', 'type_code', 'created_at')
        .where({ budget_id: budgetId });
      return rows as any;
    },
    async addExpense(budgetId: string, ownerUserId: string, name: string, total: number, type_code: string = 'expense'): Promise<DbExpense> {
      let typeCode = type_code;
      if (!/^[0-9a-fA-F-]{36}$/.test(typeCode)) {
        const t = await db('transaction_types').where({ name: 'Expense' }).first();
        typeCode = (t as any)?.code || typeCode;
      }
      const [row] = await db('transactions')
        .insert({ budget_id: budgetId, name, total, owner_user_id: ownerUserId, type_code: typeCode })
        .returning(['id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total'), 'owner_user_id', 'type_code', 'created_at']);
      return row as any;
    },
    async updateExpense(budgetId: string, id: string, patch: Partial<DbExpense>, ownerUserId: string): Promise<DbExpense | null> {
      const [row] = await db('transactions')
        .where({ budget_id: budgetId, id, owner_user_id: ownerUserId })
        .update(patch)
        .returning(['id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total'), 'owner_user_id', 'type_code', 'created_at']);
      return (row as any) || null;
    },
    async deleteExpense(budgetId: string, id: string, ownerUserId: string): Promise<boolean> {
      const n = await db('transactions').where({ budget_id: budgetId, id, owner_user_id: ownerUserId }).del();
      return n > 0;
    },
    async logActivity(userId: string, budgetId: string, action: string, entityType: string, entityId: string, payload: any) {
      const [row] = await db('activity_log')
        .insert({ user_id: userId, budget_id: budgetId, action, entity_type: entityType, entity_id: entityId, payload })
        .returning(['id', 'user_id', 'budget_id', 'action', 'entity_type', 'entity_id', 'payload', 'created_at']);
      return row as any;
    },
    async listActivities(userId: string, page: number, pageSize: number) {
      const row = await db('activity_log').where({ user_id: userId }).count<{ count: string }>('id as count').first();
      const total = Number(row?.count ?? 0);
      const rows = await db('activity_log')
        .select('id', 'user_id', 'budget_id', 'action', 'entity_type', 'entity_id', 'payload', 'created_at')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return { items: rows as any, total };
    },
    async findParticipantByEmail(email: string): Promise<DbParticipant | null> {
      const row = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .whereRaw('LOWER(u.email) = LOWER(?)', [email]).first();
      return (row as any) || null;
    },
    async listTransactionTypes() {
      const rows = await db('transaction_types').select('code', 'name').orderBy('name', 'asc');
      return rows as { code: string; name: string }[];
    },
    async recordIncomeChange(participantId: string, income: number, effective_from: string) {
      await db('participant_income_history').insert({ participant_id: participantId, income, effective_from });
    },
    async getParticipantsIncomeAt(budgetId: string, atIso: string) {
      const participants = await this.listParticipants(budgetId);
      const at = new Date(atIso);
      const ids = participants.map(p => p.id);
      const rows = await db('participant_income_history')
        .select('participant_id', db.raw('CAST(income AS FLOAT) as income'), 'effective_from')
        .whereIn('participant_id', ids)
        .andWhere('effective_from', '<=', at);
      const byPid = new Map<string, { income: number; effective_from: string }[]>();
      for (const r of rows as any[]) {
        const list = byPid.get(r.participant_id) || [];
        list.push({ income: Number(r.income), effective_from: new Date(r.effective_from).toISOString() });
        byPid.set(r.participant_id, list);
      }
      return participants.map(p => {
        const hist = (byPid.get(p.id) || []).sort((a, b) => a.effective_from.localeCompare(b.effective_from));
        const effective = hist.slice(-1)[0];
        return { ...p, income: effective ? Number(effective.income) : p.income } as DbParticipant;
      });
    },
  };
}
