import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn('expenses', 'created_at').catch(() => false);
  if (!hasCol) {
    await knex.schema.alterTable('expenses', (t) => {
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn('expenses', 'created_at').catch(() => false);
  if (hasCol) {
    await knex.schema.alterTable('expenses', (t) => t.dropColumn('created_at'));
  }
}

