/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('transaction_types', (t) => {
    t.string('code').primary(); // e.g., 'expense', 'income', 'transfer'
    t.string('name').notNullable();
  });
  await knex('transaction_types').insert([
    { code: 'expense', name: 'Expense' },
    { code: 'income', name: 'Income' },
    { code: 'transfer', name: 'Transfer' },
  ]);
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('transaction_types');
};

