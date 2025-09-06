/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable('expenses');
  const txExists = await knex.schema.hasTable('transactions');
  if (exists && !txExists) {
    await knex.schema.renameTable('expenses', 'transactions');
  }
  // Ensure owner_user_id is uuid to match users.id
  const col = await knex('transactions').columnInfo().catch(() => ({}));
  const t = (col && col.owner_user_id && col.owner_user_id.type) || '';
  if (t && t !== 'uuid') {
    await knex.schema.alterTable('transactions', (tbl) => {
      tbl.uuid('owner_user_id_uuid').nullable();
    });
    try {
      await knex.raw(`UPDATE transactions SET owner_user_id_uuid = NULLIF(owner_user_id,'')::uuid WHERE owner_user_id ~ '^[0-9a-fA-F-]{36}$'`);
    } catch {}
    await knex.schema.alterTable('transactions', (tbl) => {
      tbl.dropColumn('owner_user_id');
    });
    await knex.schema.alterTable('transactions', (tbl) => {
      tbl.renameColumn('owner_user_id_uuid', 'owner_user_id');
    });
  }
  // Ensure FK owner_user_id -> users(id)
  try { await knex.raw('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_owner_user_fk'); } catch {}
  try { await knex.raw('ALTER TABLE transactions ADD CONSTRAINT transactions_owner_user_fk FOREIGN KEY (owner_user_id) REFERENCES users(id)'); } catch {}
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  const exists = await knex.schema.hasTable('transactions');
  const ex2 = await knex.schema.hasTable('expenses');
  if (exists && !ex2) {
    await knex.schema.renameTable('transactions', 'expenses');
  }
};
