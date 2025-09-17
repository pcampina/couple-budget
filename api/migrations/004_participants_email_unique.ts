import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn('participants', 'email');
  if (!hasCol) {
    await knex.schema.alterTable('participants', (t) => {
      t.string('email').unique();
    });
  } else {
    // Ensure unique index exists
    try { await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS participants_email_unique ON participants((LOWER(email)))'); } catch {}
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop unique and column if exists
  try { await knex.raw('DROP INDEX IF EXISTS participants_email_unique'); } catch {}
  try {
    const hasCol2 = await knex.schema.hasColumn('participants', 'email');
    if (hasCol2) {
      await knex.schema.alterTable('participants', (t) => t.dropColumn('email'));
    }
  } catch {}
}

