import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
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
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activity_log');
}

