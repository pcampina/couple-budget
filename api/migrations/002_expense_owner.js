/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // Add owner_user_id if it doesn't exist (for existing DBs)
  await knex.raw(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS owner_user_id varchar NOT NULL DEFAULT ''`);
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  // Safe to drop if exists
  await knex.raw(`ALTER TABLE expenses DROP COLUMN IF EXISTS owner_user_id`);
};

