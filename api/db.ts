import knex, { Knex } from 'knex';

let db: Knex | null = null;

export function getDb(): Knex | null {
  const conn = process.env.SUPABASE_DB_URL;
  if (!conn) return null;
  if (!db) {
    db = knex({ client: 'pg', connection: conn });
  }
  return db;
}

