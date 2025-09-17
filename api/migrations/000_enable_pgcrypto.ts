import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable pgcrypto for gen_random_uuid()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');
}

export async function down(_knex: Knex): Promise<void> {
  // Do not drop extension by default (shared on DB)
}

