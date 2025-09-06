/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // Convert owner_user_id to uuid and add FK to users(id)
  const colInfo = await knex('budgets').columnInfo().catch(() => ({}));
  const type = (colInfo && colInfo.owner_user_id && colInfo.owner_user_id.type) || '';
  if (type && type !== 'uuid') {
    await knex.schema.alterTable('budgets', (t) => {
      t.uuid('owner_user_id_uuid').nullable();
    });
    // Copy when value looks like uuid
    try {
      await knex.raw(`UPDATE budgets SET owner_user_id_uuid = NULLIF(owner_user_id,'')::uuid WHERE owner_user_id ~ '^[0-9a-fA-F-]{36}$'`);
    } catch {}
    await knex.schema.alterTable('budgets', (t) => {
      t.dropColumn('owner_user_id');
    });
    await knex.schema.alterTable('budgets', (t) => {
      t.renameColumn('owner_user_id_uuid', 'owner_user_id');
    });
  }
  // Add FK (ignore failure if already exists)
  try { await knex.raw('ALTER TABLE budgets ADD CONSTRAINT budgets_owner_user_fk FOREIGN KEY (owner_user_id) REFERENCES users(id)'); } catch {}
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  try { await knex.raw('ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_owner_user_fk'); } catch {}
};

