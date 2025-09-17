import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn('expenses', 'type_code');
  if (!hasCol) {
    await knex.schema.alterTable('expenses', (t) => {
      t.string('type_code').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn('expenses', 'type_code');
  if (hasCol) {
    await knex.schema.alterTable('expenses', (t) => {
      t.dropColumn('type_code');
    });
  }
}

