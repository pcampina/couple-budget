/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // Ensure participants.user_id has FK to users(id)
  try { await knex.raw('ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_user_fk'); } catch {}
  try { await knex.raw('ALTER TABLE participants ADD CONSTRAINT participants_user_fk FOREIGN KEY (user_id) REFERENCES users(id)'); } catch {}

  // Unique participants per (budget_id, user_id) when user_id is not null
  try { await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS participants_budget_user_unique ON participants(budget_id, user_id) WHERE user_id IS NOT NULL'); } catch {}
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  try { await knex.raw('DROP INDEX IF EXISTS participants_budget_user_unique'); } catch {}
  try { await knex.raw('ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_user_fk'); } catch {}
};

