/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable('participant_income_history');
  if (!exists) {
    await knex.schema.createTable('participant_income_history', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('participant_id').notNullable().references('participants.id').onDelete('CASCADE');
      t.decimal('income', 14, 2).notNullable();
      t.timestamp('effective_from', { useTz: true }).notNullable();
      t.index(['participant_id', 'effective_from'], 'ix_income_history_effective');
    });
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('participant_income_history');
};

