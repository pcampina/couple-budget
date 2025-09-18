import { getDb } from '../db.js';
import type { Knex } from 'knex';
import crypto from 'node:crypto';
import { Role, type User } from '../types/domain.js';

export interface DbUser extends User { password_salt: string; password_hash: string }

export interface UserRepo {
  createUser(email: string, name: string, password: string, role?: Role): Promise<DbUser>;
  findByEmail(email: string): Promise<DbUser | null>;
  findById(id: string): Promise<DbUser | null>;
  verifyPassword(password: string, salt: string, expectedHex: string): boolean;
  updateUser(id: string, patch: Partial<DbUser>): Promise<DbUser | null>;
}

function hashPassword(password: string, salt: string): string {
  const hash = crypto.scryptSync(password, salt, 64);
  return hash.toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHex: string): boolean {
  const actual = hashPassword(password, salt);
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function memory(): UserRepo {
  const users = new Map<string, DbUser>(); // key: email lower
  return {
    async createUser(email: string, name: string, password: string, role: Role = Role.User): Promise<DbUser> {
      const k = email.toLowerCase();
      if (users.has(k)) throw Object.assign(new Error('Email already exists'), { code: '23505' });
      const id = crypto.randomUUID();
      const salt = crypto.randomBytes(16).toString('hex');
      const password_hash = hashPassword(password, salt);
      const user: DbUser = { id, email, name, password_salt: salt, password_hash, role, created_at: new Date().toISOString(), default_income: 0 };
      users.set(k, user);
      return user;
    },
    async findByEmail(email: string): Promise<DbUser | null> { return users.get(email.toLowerCase()) || null; },
    async findById(id: string): Promise<DbUser | null> {
      for (const u of users.values()) if (u.id === id) return u;
      return null;
    },
    verifyPassword,
    async updateUser(id: string, patch: Partial<DbUser>): Promise<DbUser | null> {
        const user = Array.from(users.values()).find(u => u.id === id);
        if (!user) return null;
        Object.assign(user, patch);
        return user;
    }
  };
}

const MEM = memory();

export function userRepo(): UserRepo {
  const db = getDb();
  if (!db) return MEM;
  return sqlRepo(db);
}

function sqlRepo(db: Knex): UserRepo {
  return {
    async createUser(email: string, name: string, password: string, role: Role = Role.User): Promise<DbUser> {
      const salt = crypto.randomBytes(16).toString('hex');
      const password_hash = crypto.scryptSync(password, salt, 64).toString('hex');
      const [row] = await db('users')
        .insert({ email, name, password_salt: salt, password_hash, role })
        .returning('*');
      return row as DbUser;
    },
    async findByEmail(email: string): Promise<DbUser | null> {
      const row = await db('users').whereRaw('LOWER(email) = LOWER(?)', [email]).first();
      return (row as DbUser) || null;
    },
    async findById(id: string): Promise<DbUser | null> {
      const row = await db('users').where({ id }).first();
      return (row as DbUser) || null;
    },
    verifyPassword,
    async updateUser(id: string, patch: Partial<DbUser>): Promise<DbUser | null> {
        const [row] = await db('users')
            .where({ id })
            .update(patch)
            .returning('*');
        return (row as DbUser) || null;
    }
  };
}
