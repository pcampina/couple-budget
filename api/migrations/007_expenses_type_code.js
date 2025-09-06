/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  const hasCol = await knex.schema.hasColumn('expenses', 'type_code');
  if (!hasCol) {
    await knex.schema.alterTable('expenses', (t) => {
      t.string('type_code').notNullable().defaultTo('expense');
      t.foreign('type_code').references('transaction_types.code').onDelete('RESTRICT');
    });
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  const hasCol = await knex.schema.hasColumn('expenses', 'type_code');
  if (hasCol) {
    await knex.schema.alterTable('expenses', (t) => {
      t.dropForeign(['type_code']);
      t.dropColumn('type_code');
    });
  }
};

