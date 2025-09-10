/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  const hasMembers = await knex.schema.hasTable('budget_members');
  if (!hasMembers) {
    await knex.schema.createTable('budget_members', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('budget_id').notNullable().references('id').inTable('budgets').onDelete('CASCADE');
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('role').notNullable().defaultTo('member');
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      t.unique(['budget_id', 'user_id']);
    });
  }

  const hasInvites = await knex.schema.hasTable('budget_invites');
  if (!hasInvites) {
    await knex.schema.createTable('budget_invites', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('budget_id').notNullable().references('id').inTable('budgets').onDelete('CASCADE');
      t.uuid('inviter_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('email').notNullable();
      t.uuid('token').notNullable().unique().defaultTo(knex.raw('gen_random_uuid()'));
      t.timestamp('accepted_at').nullable();
      t.uuid('accepted_user_id').nullable().references('id').inTable('users');
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  const dropTable = async (name) => { try { await knex.schema.dropTableIfExists(name); } catch {} };
  await dropTable('budget_invites');
  await dropTable('budget_members');
};

