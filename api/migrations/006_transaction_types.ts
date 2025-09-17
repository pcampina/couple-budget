import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transaction_types', (t) => {
    t.string('code').primary(); // e.g., 'expense', 'income', 'transfer'
    t.string('name').notNullable();
  });
  await knex('transaction_types').insert([
    { code: 'expense', name: 'Expense' },
    { code: 'income', name: 'Income' },
    { code: 'transfer', name: 'Transfer' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transaction_types');
}

