import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Be defensive: work with whatever tables/constraint names exist
  const hasTx = await knex.schema.hasTable('transactions');
  const hasEx = await knex.schema.hasTable('expenses');
  const hasTypes = await knex.schema.hasTable('transaction_types');

  // Create transaction_types if it doesn't exist (idempotent)
  if (!hasTypes) {
    await knex.schema.createTable('transaction_types', (t) => {
      t.string('code').primary();
      t.string('name').notNullable();
    });
    // Seed with UUID codes
    const a = await knex.raw('SELECT gen_random_uuid() as id');
    const b = await knex.raw('SELECT gen_random_uuid() as id');
    const c = await knex.raw('SELECT gen_random_uuid() as id');
    await knex('transaction_types').insert([
      { code: (a as any).rows[0].id, name: 'Expense' },
      { code: (b as any).rows[0].id, name: 'Income' },
      { code: (c as any).rows[0].id, name: 'Transfer' },
    ]);
  }

  // Drop potential FKs so we can update codes
  try { if (hasTx) await knex.raw('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_code_fkey'); } catch {}
  try { if (hasTx) await knex.raw('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_code_foreign'); } catch {}
  try { if (hasEx) await knex.raw('ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_type_code_fkey'); } catch {}
  try { if (hasEx) await knex.raw('ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_type_code_foreign'); } catch {}

  // Normalize codes to UUIDs
  let rows: Array<{ code: string; name: string }> = [];
  try { rows = await knex('transaction_types').select('code', 'name'); } catch { rows = []; }
  for (const r of rows) {
    const isUuid = typeof r.code === 'string' && /^[0-9a-fA-F-]{36}$/.test(r.code);
    if (!isUuid) {
      const res = await knex.raw('SELECT gen_random_uuid() as id');
      const newCode = ((res as any).rows && (res as any).rows[0] && (res as any).rows[0].id) || null;
      if (!newCode) continue;
      await knex('transaction_types').where({ code: r.code }).update({ code: newCode });
      if (hasTx) await knex('transactions').where({ type_code: r.code }).update({ type_code: newCode });
      if (hasEx) await knex('expenses').where({ type_code: r.code }).update({ type_code: newCode });
    }
  }

  // Recreate FK to transaction_types.code
  try {
    if (hasTx) {
      await knex.schema.alterTable('transactions', (t) => {
        t.foreign('type_code').references('transaction_types.code').onDelete('RESTRICT');
      });
    }
  } catch {}
}

export async function down(_knex: Knex): Promise<void> {
  // No-op: codes remain as UUIDs
}

// Run outside a single transaction to avoid aborting on partially-applied states
export const config = { transaction: false } as const;

