import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add owner_user_id if it doesn't exist (for existing DBs)
  await knex.raw(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS owner_user_id varchar NOT NULL DEFAULT ''`);
}

export async function down(knex: Knex): Promise<void> {
  // Safe to drop if exists
  await knex.raw(`ALTER TABLE expenses DROP COLUMN IF EXISTS owner_user_id`);
}

