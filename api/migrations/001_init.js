/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('budgets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable().defaultTo('Default');
    t.string('owner_user_id').notNullable().index();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('participants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('budget_id').notNullable().references('id').inTable('budgets').onDelete('CASCADE');
    t.string('name').notNullable();
    t.decimal('income', 14, 2).notNullable().defaultTo(0);
  });

  await knex.schema.createTable('expenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('budget_id').notNullable().references('id').inTable('budgets').onDelete('CASCADE');
    t.string('name').notNullable();
    t.decimal('total', 14, 2).notNullable().defaultTo(0);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('participants');
  await knex.schema.dropTableIfExists('budgets');
};

