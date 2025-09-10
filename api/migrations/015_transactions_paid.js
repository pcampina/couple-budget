/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  const has = await knex.schema.hasColumn('transactions', 'paid').catch(() => false);
  if (!has) {
    await knex.schema.alterTable('transactions', (t) => {
      t.boolean('paid').notNullable().defaultTo(false);
    });
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  const has = await knex.schema.hasColumn('transactions', 'paid').catch(() => false);
  if (has) {
    await knex.schema.alterTable('transactions', (t) => {
      t.dropColumn('paid');
    });
  }
};

