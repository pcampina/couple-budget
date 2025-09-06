/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  const hasCol = await knex.schema.hasColumn('participants', 'email');
  if (!hasCol) {
    await knex.schema.alterTable('participants', (t) => {
      t.string('email').unique();
    });
  } else {
    // Ensure unique index exists
    try { await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS participants_email_unique ON participants(email)'); } catch {}
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  try { await knex.raw('DROP INDEX IF EXISTS participants_email_unique'); } catch {}
  const hasCol = await knex.schema.hasColumn('participants', 'email');
  if (hasCol) {
    await knex.schema.alterTable('participants', (t) => {
      t.dropColumn('email');
    });
  }
};

