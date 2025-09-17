import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('users', function(table) {
    table.decimal('default_income', 10, 2).notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', function(table) {
    table.dropColumn('default_income');
  });
}

