import { getDb } from '../db';
import { uuid } from '../utils';
import type { Knex } from 'knex';
import crypto from 'node:crypto';

export interface DbParticipant { id: string; budget_id: string; user_id?: string | null; income: number; name?: string; email?: string | null }
export interface DbExpense { id: string; budget_id: string; name: string; total: number; owner_user_id: string; type_code?: string; created_at?: string; paid?: boolean }
export interface DbActivity { id: string; user_id: string; budget_id: string; action: string; entity_type: string; entity_id: string; payload: unknown; created_at: string }

export interface BudgetRepo {
  getOrCreateDefaultBudgetId(userId: string): Promise<string>;
  createBudget?(userId: string, name: string): Promise<{ id: string; name: string; owner_user_id: string }>;
  listUserBudgets?(userId: string): Promise<Array<{ id: string; name: string; role: 'owner' | 'member' }>>;
  addMember?(budgetId: string, userId: string): Promise<{ budget_id: string; user_id: string; role: 'member' }>;
  removeMember?(budgetId: string, userId: string): Promise<boolean>;
  isOwner?(budgetId: string, userId: string): Promise<boolean>;
  hasAccess?(budgetId: string, userId: string): Promise<boolean>;
  countMembers?(budgetId: string): Promise<number>;
  createInvites?(budgetId: string, inviterUserId: string, emails: string[]): Promise<Array<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string }>>;
  listInvites?(budgetId: string): Promise<Array<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string }>>;
  setInvitesForBudget?(budgetId: string, list: Array<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string }>): Promise<void> | void;
  findInviteById?(inviteId: string): Promise<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string } | null>;
  findInviteByToken?(token: string): Promise<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string } | null>;
  markInviteAccepted?(token: string, acceptUserId: string): Promise<{ budget_id: string } | null>;
  revokeInvite?(inviteId: string): Promise<boolean>;
  resendInvite?(inviteId: string): Promise<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string } | null>;
  updateBudgetName?(budgetId: string, name: string): Promise<{ id: string; name: string; owner_user_id: string } | null>;
  deleteBudget?(budgetId: string): Promise<boolean>;
  listParticipants(budgetId: string): Promise<DbParticipant[]>;
  addParticipant(budgetId: string, name: string, income: number, email?: string | null): Promise<DbParticipant>;
  updateParticipant(budgetId: string, id: string, patch: Partial<DbParticipant>): Promise<DbParticipant | null>;
  deleteParticipant?(budgetId: string, id: string): Promise<boolean>;
  listExpenses(budgetId: string): Promise<DbExpense[]>;
  addExpense(budgetId: string, ownerUserId: string, name: string, total: number, type_code?: string, paid?: boolean): Promise<DbExpense>;
  updateExpense(budgetId: string, id: string, patch: Partial<DbExpense>, ownerUserId: string): Promise<DbExpense | null>;
  deleteExpense(budgetId: string, id: string, ownerUserId: string): Promise<boolean>;
  recordIncomeChange?(participantId: string, income: number, effective_from: string): Promise<void>;
  getParticipantsIncomeAt?(budgetId: string, atIso: string): Promise<DbParticipant[]>;
  logActivity(userId: string, budgetId: string, action: string, entityType: string, entityId: string, payload: unknown): Promise<DbActivity>;
  listActivities(userId: string, page: number, pageSize: number): Promise<{ items: DbActivity[]; total: number }>;
  findParticipantByEmail?(email: string): Promise<DbParticipant | null>;
  findParticipantByEmailInBudget?(budgetId: string, email: string): Promise<DbParticipant | null>;
  listTransactionTypes?(): Promise<Array<{ code: string; name: string }>>;
}

function memory(): BudgetRepo {
  // Fallback in-memory store for when DB is not configured (tests/dev)
  const state = {
    budgets: new Map<string, { id: string; owner_user_id: string; name: string }>(),
    participants: new Map<string, DbParticipant[]>(),
    expenses: new Map<string, DbExpense[]>(),
    members: new Map<string, Set<string>>(), // key: budget_id -> user_ids
    invites: new Map<string, { id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string }[]>(),
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
    async createBudget(userId: string, name: string) {
      const id = uuid();
      const b = { id, owner_user_id: userId, name: name || 'Group' };
      state.budgets.set(id, b);
      if (!state.participants.has(id)) state.participants.set(id, []);
      if (!state.expenses.has(id)) state.expenses.set(id, []);
      return b;
    },
    async listUserBudgets(userId: string) {
      const owned = Array.from(state.budgets.values()).filter(b => b.owner_user_id === userId).map(b => ({ id: b.id, name: b.name, role: 'owner' as const }));
      const memberOf: { id: string; name: string; role: 'member' }[] = [];
      for (const b of state.budgets.values()) {
        if (b.owner_user_id === userId) continue;
        const ms = state.members.get(b.id);
        if (ms && ms.has(userId)) memberOf.push({ id: b.id, name: b.name, role: 'member' });
      }
      return [...owned, ...memberOf];
    },
    async addMember(budgetId: string, userId: string) {
      const set = state.members.get(budgetId) || new Set<string>();
      set.add(userId); state.members.set(budgetId, set);
      return { budget_id: budgetId, user_id: userId, role: 'member' };
    },
    async removeMember(budgetId: string, userId: string) {
      const set = state.members.get(budgetId) || new Set<string>();
      const had = set.delete(userId);
      state.members.set(budgetId, set);
      return had;
    },
    async isOwner(budgetId: string, userId: string) {
      const b = state.budgets.get(budgetId);
      return !!b && b.owner_user_id === userId;
    },
    async hasAccess(budgetId: string, userId: string) {
      const b = state.budgets.get(budgetId);
      const owner = !!b && b.owner_user_id === userId;
      if (owner) return true;
      const set = state.members.get(budgetId);
      return !!(set && set.has(userId));
    },
    async countMembers(budgetId: string) {
      const set = state.members.get(budgetId) || new Set<string>();
      return set.size;
    },
    async createInvites(budgetId: string, inviterUserId: string, emails: string[]) {
      const arr = state.invites.get(budgetId) || [];
      state.invites.set(budgetId, arr);
      const out = emails.map(e => ({
        id: uuid(), budget_id: budgetId, inviter_user_id: inviterUserId, email: String(e).toLowerCase(), token: uuid(), accepted_at: null as string | null, accepted_user_id: null as string | null, created_at: new Date().toISOString()
      }));
      arr.push(...out);
      return out;
    },
    async listInvites(budgetId: string) { return state.invites.get(budgetId) || []; },
    async setInvitesForBudget(budgetId: string, list: { id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string }[]) { state.invites.set(budgetId, list); },
    async findInviteById(inviteId: string) {
      for (const list of state.invites.values()) {
        const i = list.find(x => x.id === inviteId);
        if (i) return i;
      }
      return null;
    },
    async markInviteAccepted(token: string, acceptUserId: string) {
      for (const [bid, list] of state.invites.entries()) {
        const i = list.find(x => x.token === token);
        if (i) {
          i.accepted_at = new Date().toISOString();
          i.accepted_user_id = acceptUserId;
          const set = state.members.get(bid) || new Set<string>(); set.add(acceptUserId); state.members.set(bid, set);
          return { budget_id: bid };
        }
      }
      return null;
    },
    async revokeInvite(inviteId: string) {
      for (const [bid, list] of state.invites.entries()) {
        const next = list.filter(x => x.id !== inviteId);
        if (next.length !== list.length) { state.invites.set(bid, next); return true; }
      }
      return false;
    },
    async resendInvite(inviteId: string) {
      for (const [_bid, list] of state.invites.entries()) {
        const i = list.find(x => x.id === inviteId);
        if (i) { i.created_at = new Date().toISOString(); return i; }
      }
      return null;
    },
    async updateBudgetName(budgetId: string, name: string) {
      const b = state.budgets.get(budgetId);
      if (b) { b.name = name; state.budgets.set(budgetId, b); return { id: b.id, name: b.name, owner_user_id: b.owner_user_id }; }
      return null;
    },
    async deleteBudget(budgetId: string) {
      state.budgets.delete(budgetId);
      state.participants.delete(budgetId);
      state.expenses.delete(budgetId);
      state.members.delete(budgetId);
      state.invites.delete(budgetId);
      return true;
    },
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
    async addExpense(budgetId: string, ownerUserId: string, name: string, total: number, type_code: string = 'expense', paid: boolean = false) {
      const arr = state.expenses.get(budgetId) || []; state.expenses.set(budgetId, arr);
      const e: DbExpense = { id: uuid(), budget_id: budgetId, name, total, owner_user_id: ownerUserId, type_code, created_at: new Date().toISOString(), paid: !!paid };
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
    async logActivity(userId: string, budgetId: string, action: string, entityType: string, entityId: string, payload: unknown) {
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
    async findParticipantByEmailInBudget(budgetId: string, email: string) {
      const list = state.participants.get(budgetId) || [];
      const found = list.find(p => (p.email || '').toLowerCase() === (email || '').toLowerCase());
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
export function budgetRepo(): BudgetRepo {
  const db = getDb();
  if (!db) return MEM;
  return sqlRepo(db);
}

function sqlRepo(db: Knex): BudgetRepo {
  return {
    async createBudget(userId: string, name: string) {
      const [row] = await db('budgets').insert({ owner_user_id: userId, name: name || 'Group' }).returning(['id', 'name', 'owner_user_id']);
      return row as { id: string; name: string; owner_user_id: string };
    },
    async listUserBudgets(userId: string) {
      const owned = db('budgets').select('id', 'name', db.raw("'owner' as role")).where({ owner_user_id: userId });
      const memberOf = db('budgets as b')
        .join('budget_members as m', 'm.budget_id', 'b.id')
        .select('b.id', 'b.name', db.raw("'member' as role"))
        .where('m.user_id', userId);
      const rows = await owned.unionAll([memberOf]);
      return rows as Array<{ id: string; name: string; role: 'owner' | 'member' }>;
    },
    async addMember(budgetId: string, userId: string) {
      const exists = await db('budget_members').where({ budget_id: budgetId, user_id: userId }).first();
      if (exists) return { budget_id: budgetId, user_id: userId, role: 'member' } as { budget_id: string; user_id: string; role: 'member' };
      const [row] = await db('budget_members').insert({ budget_id: budgetId, user_id: userId, role: 'member' }).returning(['budget_id', 'user_id', 'role']);
      return row as { budget_id: string; user_id: string; role: 'member' };
    },
    async removeMember(budgetId: string, userId: string) {
      const n = await db('budget_members').where({ budget_id: budgetId, user_id: userId }).del();
      return n > 0;
    },
    async isOwner(budgetId: string, userId: string) {
      const b = await db('budgets').where({ id: budgetId, owner_user_id: userId }).first();
      return !!b;
    },
    async countMembers(budgetId: string) {
      const row = await db('budget_members').where({ budget_id: budgetId }).count<{ count: string }>('user_id as count').first();
      return Number(row?.count || 0);
    },
    async hasAccess(budgetId: string, userId: string) {
      const owner = await db('budgets').where({ id: budgetId, owner_user_id: userId }).first();
      if (owner) return true;
      const m = await db('budget_members').where({ budget_id: budgetId, user_id: userId }).first();
      return !!m;
    },
    async createInvites(budgetId: string, inviterUserId: string, emails: string[]) {
      if (!emails || emails.length === 0) return [] as Array<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string }>;
      const rows = await db('budget_invites').insert(emails.map(e => ({ budget_id: budgetId, inviter_user_id: inviterUserId, email: String(e).toLowerCase() }))).returning(['id', 'budget_id', 'inviter_user_id', 'email', 'token', 'accepted_at', 'accepted_user_id', 'created_at']);
      return rows as Array<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string }>;
    },
    async listInvites(budgetId: string) {
      const rows = await db('budget_invites').select('id', 'budget_id', 'inviter_user_id', 'email', 'token', 'accepted_at', 'accepted_user_id', 'created_at').where({ budget_id: budgetId }).orderBy('created_at', 'desc');
      return rows as Array<{ id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string }>;
    },
    async findInviteById(inviteId: string) {
      const row = await db('budget_invites').where({ id: inviteId }).first();
      return (row as { id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string } | null) || null;
    },
    async findInviteByToken(token: string) {
      const row = await db('budget_invites').where({ token }).first();
      return (row as { id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string } | null) || null;
    },
    async markInviteAccepted(token: string, acceptUserId: string) {
      const [row] = await db('budget_invites').where({ token }).update({ accepted_at: db.fn.now(), accepted_user_id: acceptUserId }).returning(['budget_id']);
      return (row as { budget_id: string } | null) || null;
    },
    async revokeInvite(inviteId: string) {
      await db('budget_invites').where({ id: inviteId }).del();
      return true;
    },
    async resendInvite(inviteId: string) {
      const [row] = await db('budget_invites').where({ id: inviteId }).update({ created_at: db.fn.now() }).returning(['id', 'budget_id', 'inviter_user_id', 'email', 'token', 'accepted_at', 'accepted_user_id', 'created_at']);
      return (row as { id: string; budget_id: string; inviter_user_id: string; email: string; token: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string } | null) || null;
    },
    async updateBudgetName(budgetId: string, name: string) {
      const [row] = await db('budgets').where({ id: budgetId }).update({ name }).returning(['id', 'name', 'owner_user_id']);
      return (row as { id: string; name: string; owner_user_id: string } | null) || null;
    },
    async deleteBudget(budgetId: string) {
      await db('budgets').where({ id: budgetId }).del();
      return true;
    },
    async getOrCreateDefaultBudgetId(userId: string): Promise<string> {
      const existing = await db('budgets').where({ owner_user_id: userId }).first();
      if (existing) return (existing as { id: string }).id;
      const [row] = await db('budgets').insert({ owner_user_id: userId, name: 'Default' }).returning('id');
      return (row as { id: string }).id as string;
    },
    async listParticipants(budgetId: string): Promise<DbParticipant[]> {
      const rows = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .where('p.budget_id', budgetId);
      return rows as DbParticipant[];
    },
    async addParticipant(budgetId: string, name: string, income: number, email?: string | null): Promise<DbParticipant> {
      let userId: string | null = null;
      if (email) {
        const u = await db('users').whereRaw('LOWER(email) = LOWER(?)', [email]).first();
        if (u) userId = (u as { id: string }).id;
        else {
          const salt = crypto.randomBytes(16).toString('hex');
          const password_hash = crypto.scryptSync(crypto.randomUUID(), salt, 64).toString('hex');
          const [nu] = await db('users').insert({ email, name: name || (email.split('@')[0] || ''), password_salt: salt, password_hash, role: 'user' }).returning(['id']);
          userId = (nu as { id: string }).id;
        }
      }
      const [row] = await db('participants').insert({ budget_id: budgetId, income, user_id: userId }).returning(['id']);
      const id = (row as { id: string }).id;
      const out = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .where('p.id', id).first();
      return out as DbParticipant;
    },
    async updateParticipant(budgetId: string, id: string, patch: Partial<DbParticipant>): Promise<DbParticipant | null> {
      const base: Partial<Pick<DbParticipant, 'income'>> = {};
      if (patch.income != null) base.income = patch.income as number;
      if (Object.keys(base).length) await db('participants').where({ budget_id: budgetId, id }).update(base);
      if ((patch as Partial<DbParticipant>).name != null || (patch as Partial<DbParticipant>).email != null) {
        const p = await db('participants').select('user_id').where({ id }).first();
        if (p && (p as { user_id: string | null }).user_id) {
          const upd: { name?: string; email?: string } = {};
          if ((patch as Partial<DbParticipant>).name != null) upd.name = String((patch as Partial<DbParticipant>).name);
          if ((patch as Partial<DbParticipant>).email != null) upd.email = String((patch as Partial<DbParticipant>).email).toLowerCase();
          if (Object.keys(upd).length) await db('users').where({ id: (p as { user_id: string }).user_id }).update(upd);
        }
      }
      const out = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .where('p.id', id).first();
      return (out as DbParticipant) || null;
    },
    async deleteParticipant(budgetId: string, id: string): Promise<boolean> {
      const n = await db('participants').where({ budget_id: budgetId, id }).del();
      return n > 0;
    },
    async listExpenses(budgetId: string): Promise<DbExpense[]> {
      const rows = await db('transactions')
        .select('id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total'), 'owner_user_id', 'type_code', 'created_at', 'paid')
        .where({ budget_id: budgetId });
      return rows as DbExpense[];
    },
    async addExpense(budgetId: string, ownerUserId: string, name: string, total: number, type_code: string = 'expense', paid: boolean = false): Promise<DbExpense> {
      let typeCode = type_code;
      if (!/^[0-9a-fA-F-]{36}$/.test(typeCode)) {
        const t = await db('transaction_types').where({ name: 'Expense' }).first();
        typeCode = (t as { code?: string } | undefined)?.code || typeCode;
      }
      const [row] = await db('transactions')
        .insert({ budget_id: budgetId, name, total, owner_user_id: ownerUserId, type_code: typeCode, paid: !!paid })
        .returning(['id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total'), 'owner_user_id', 'type_code', 'created_at', 'paid']);
      return row as DbExpense;
    },
    async updateExpense(budgetId: string, id: string, patch: Partial<DbExpense>, ownerUserId: string): Promise<DbExpense | null> {
      const [row] = await db('transactions')
        .where({ budget_id: budgetId, id, owner_user_id: ownerUserId })
        .update(patch)
        .returning(['id', 'budget_id', 'name', db.raw('CAST(total AS FLOAT) as total'), 'owner_user_id', 'type_code', 'created_at', 'paid']);
      return (row as DbExpense) || null;
    },
    async deleteExpense(budgetId: string, id: string, ownerUserId: string): Promise<boolean> {
      const n = await db('transactions').where({ budget_id: budgetId, id }).del();
      return n > 0;
    },
    async logActivity(userId: string, budgetId: string, action: string, entityType: string, entityId: string, payload: unknown) {
      const [row] = await db('activity_log')
        .insert({ user_id: userId, budget_id: budgetId, action, entity_type: entityType, entity_id: entityId, payload })
        .returning(['id', 'user_id', 'budget_id', 'action', 'entity_type', 'entity_id', 'payload', 'created_at']);
      return row as DbActivity;
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
      return { items: rows as DbActivity[], total };
    },
    async findParticipantByEmail(email: string): Promise<DbParticipant | null> {
      const row = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .whereRaw('LOWER(u.email) = LOWER(?)', [email]).first();
      return (row as DbParticipant) || null;
    },
    async findParticipantByEmailInBudget(budgetId: string, email: string): Promise<DbParticipant | null> {
      const row = await db('participants as p')
        .leftJoin('users as u', 'u.id', 'p.user_id')
        .select('p.id', 'p.budget_id', 'p.user_id', db.raw('CAST(p.income AS FLOAT) as income'), 'u.name as name', 'u.email as email')
        .where('p.budget_id', budgetId)
        .andWhereRaw('LOWER(u.email) = LOWER(?)', [email])
        .first();
      return (row as DbParticipant) || null;
    },
    async listTransactionTypes() {
      const rows = await db('transaction_types').select('code', 'name').orderBy('name', 'asc');
      return rows as Array<{ code: string; name: string }>;
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
      for (const r of rows as Array<{ participant_id: string; income: number; effective_from: Date | string }>) {
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
