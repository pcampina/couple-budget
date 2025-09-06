/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // Detect columns once to avoid querying non-existent columns later
  const hadEmail = await knex.schema.hasColumn('participants', 'email').catch(() => false);
  const hadName = await knex.schema.hasColumn('participants', 'name').catch(() => false);

  // Add user_id if missing (safe when run multiple times)
  try { await knex.raw('ALTER TABLE participants ADD COLUMN IF NOT EXISTS user_id uuid'); } catch {}

  // Backfill user_id from users.email if possible
  if (hadEmail) {
    try {
      const rows = await knex('participants').select('id', 'email');
      for (const r of rows) {
        if (!r.email) continue;
        const u = await knex('users').whereRaw('LOWER(email) = LOWER(?)', [r.email]).first();
        if (u) await knex('participants').where({ id: r.id }).update({ user_id: u.id });
      }
    } catch {}
  }

  // Drop unique index tied to email and remove name/email columns
  try { await knex.raw('DROP INDEX IF EXISTS participants_email_unique'); } catch {}
  try { if (hadName) await knex.raw('ALTER TABLE participants DROP COLUMN IF EXISTS name'); } catch {}
  try { if (hadEmail) await knex.raw('ALTER TABLE participants DROP COLUMN IF EXISTS email'); } catch {}
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  // Add columns back (without data) for rollback
  const hasName = await knex.schema.hasColumn('participants', 'name');
  const hasEmail = await knex.schema.hasColumn('participants', 'email');
  await knex.schema.alterTable('participants', (t) => {
    if (!hasName) t.string('name').notNullable().defaultTo('');
    if (!hasEmail) t.string('email');
  });
  // Keep user_id for compatibility
};

// Disable transaction for this migration to be resilient to partially applied states
exports.config = { transaction: false };
