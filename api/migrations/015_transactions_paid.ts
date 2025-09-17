import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const has = await knex.schema.hasColumn('transactions', 'paid').catch(() => false);
  if (!has) {
    await knex.schema.alterTable('transactions', (t) => {
      t.boolean('paid').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const has = await knex.schema.hasColumn('transactions', 'paid').catch(() => false);
  if (has) {
    await knex.schema.alterTable('transactions', (t) => {
      t.dropColumn('paid');
    });
  }
}

