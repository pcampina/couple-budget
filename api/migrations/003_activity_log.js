/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('activity_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('user_id').notNullable().index();
    t.uuid('budget_id').notNullable().index();
    t.string('action').notNullable();
    t.string('entity_type').notNullable();
    t.string('entity_id').notNullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('activity_log');
};

