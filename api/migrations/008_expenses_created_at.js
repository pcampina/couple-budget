/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  const hasCol = await knex.schema.hasColumn('expenses', 'created_at');
  if (!hasCol) {
    await knex.schema.alterTable('expenses', (t) => {
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  const hasCol = await knex.schema.hasColumn('expenses', 'created_at');
  if (hasCol) {
    await knex.schema.alterTable('expenses', (t) => {
      t.dropColumn('created_at');
    });
  }
};

