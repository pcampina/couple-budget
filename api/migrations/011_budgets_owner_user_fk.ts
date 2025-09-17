import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  try { await knex.raw('ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_owner_user_fk'); } catch {}
  try { await knex.raw('ALTER TABLE budgets ADD CONSTRAINT budgets_owner_user_fk FOREIGN KEY (owner_user_id) REFERENCES users(id)'); } catch {}
}

export async function down(knex: Knex): Promise<void> {
  try { await knex.raw('ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_owner_user_fk'); } catch {}
}

