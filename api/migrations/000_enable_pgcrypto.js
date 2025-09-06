/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // Enable pgcrypto for gen_random_uuid()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  // Do not drop extension by default (shared on DB)
};

